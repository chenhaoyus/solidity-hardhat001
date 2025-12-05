// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

contract NftAuction is Initializable, UUPSUpgradeable, IERC721Receiver {
    struct Auction {
        //卖家地址
        address seller;
        //持续时间
        uint256 duration;
        //开始时间
        uint256 startTime;
        //开始价格
        uint256 startingPrice;
        //是否结束
        bool ended;
        //最高价地址
        address highestBidder;
        //最高价格
        uint256 highestBid;

        //NFT合约地址
        address nftContract;

        //tokenid
        uint256 tokenId;

        // 参与竞价的资产类型 0x 地址表示eth，其他地址表示erc20
        // 0x0000000000000000000000000000000000000000 表示eth
        address tokenAddress;
    }

    //拍卖记录
    mapping(uint256 => Auction) public auctions;

    //下一个拍卖ID
    uint256 public nextAuctionId;

    //拍卖管理员
    address public admin;

    mapping(address => AggregatorV3Interface) public priceFeeds;

    function initialize() initializer public {
        admin = msg.sender;
    }

    function setPriceFeed(address tokenAddress, address priceFeedAddress) public {
        priceFeeds[tokenAddress] = AggregatorV3Interface(priceFeedAddress);

    }


    function getChainlinkDataFeedLatestAnswer(address tokenAddress) public view returns (int) {
        AggregatorV3Interface priceFeed = priceFeeds[tokenAddress];

        // if(tokenAddress == address(0) ){
        //     return int(1);
        // }
        
        // prettier-ignore
        (
            ,
            int256 price,
            ,
            ,
            
        ) = priceFeed.latestRoundData();

        return price;
    }

    function createAuction(uint256 _duration, uint _startPrice, address _nftContract, uint256 _tokenId) public {
        //必须管理员创建拍卖
        require(admin == msg.sender, "Only admin can create auction");
        //持续时间大于10秒
        require(_duration >= 10, "Duration must be greater than 10 seconds");
        //开始价格大于0
        require(_startPrice > 0, "Start price must be greater than 0");

        // 将拍卖的 NFT 托管到合约（需要卖家预先 approve 合约地址）
        IERC721(_nftContract).safeTransferFrom(msg.sender, address(this), _tokenId);

        auctions[nextAuctionId] = Auction({
            seller: msg.sender,
            duration: _duration,
            startTime: block.timestamp,
            startingPrice: _startPrice,
            ended: false,
            highestBidder: address(0),
            highestBid: 0,
            nftContract: _nftContract,
            tokenId: _tokenId,
            tokenAddress: address(0)
        });

        nextAuctionId++;
    }
    
    //买家参与买单
    function placeBid(uint256 _auctionId,uint256 amount, address _tokenAddress) external payable{

        Auction storage auction = auctions[_auctionId];

        //判断当前拍卖是否已经结束
        require(!auction.ended && block.timestamp < auction.startTime + auction.duration, "Auction already ended");

        //根据usd进行金额转换
        uint payValue;
        if (_tokenAddress != address(0)) {
            // 处理 ERC20 (USDC有6位小数)
            // Chainlink价格源返回的价格通常有8位小数
            payValue = amount * uint(getChainlinkDataFeedLatestAnswer(_tokenAddress)) / 10**6;
        } else {
            // 处理 ETH (ETH有18位小数)
            // Chainlink价格源返回的价格通常有8位小数
            amount = msg.value;
            payValue = amount * uint(getChainlinkDataFeedLatestAnswer(address(0))) / 10**18;
        }

        // 开始价格默认为ETH
        uint startPriceValue = auction.startingPrice * uint(getChainlinkDataFeedLatestAnswer(address(0))) / 10**18;

        // 最高出价的代币类型是当前最高出价者使用的代币类型
        uint highestBidValue;
        if (auction.tokenAddress != address(0)) {
            // 最高出价是ERC20
            highestBidValue = auction.highestBid * uint(getChainlinkDataFeedLatestAnswer(auction.tokenAddress)) / 10**6;
        } else {
            // 最高出价是ETH
            highestBidValue = auction.highestBid * uint(getChainlinkDataFeedLatestAnswer(address(0))) / 10**18;
        }
        //判断当前出价是否大于最高出价
        require(payValue > highestBidValue && payValue > startPriceValue, "Bid must be higher than current highest bid");

        // 转移 ERC20 到合约
        if (_tokenAddress != address(0)) {
            IERC20(_tokenAddress).transferFrom(msg.sender, address(this), amount);
        }

        //退回上一个人出价
        // 退还前最高价
        if (auction.highestBid > 0) {
            if (auction.tokenAddress == address(0)) {
                // auction.tokenAddress = _tokenAddress;
                payable(auction.highestBidder).transfer(auction.highestBid);
            } else {
                // 退回之前的ERC20
                IERC20(auction.tokenAddress).transfer(
                    auction.highestBidder,
                    auction.highestBid
                );
            }
        }

        //更新最高价地址和最高价格
        auction.tokenAddress = _tokenAddress;
        auction.highestBid = amount;
        auction.highestBidder = msg.sender;
    }

    function _authorizeUpgrade(address newImplementation) internal view override  {
        require(msg.sender == admin, "Only admin can upgrade");
    }

    //结束拍卖
    function endAuction(uint256 _auctionId) external {
        Auction storage auction = auctions[_auctionId];

        //判断当前拍卖是否已经结束
        require(!auction.ended, "Auction has not ended");
        //require(block.timestamp < (auction.startTime + auction.duration), "Auction time not end");


        //判断当前调用者是否为卖家
        require(auction.seller == msg.sender, "Only seller can end auction");

        //判断是否有买家参与
        require(auction.highestBidder != address(0), "No bidder");

        // 将托管的 NFT 从合约转给最高出价者
        IERC721(auction.nftContract).safeTransferFrom(address(this), auction.highestBidder, auction.tokenId);

        // 将最高出价转交给卖家
        if (auction.tokenAddress == address(0)) {
            // ETH出价，使用transfer转账
            payable(auction.seller).transfer(auction.highestBid);
        } else {
            // ERC20代币出价，使用transfer转账
            IERC20(auction.tokenAddress).transfer(auction.seller, auction.highestBid);
        }

        //标记拍卖为已结束
        auction.ended = true;
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
}
