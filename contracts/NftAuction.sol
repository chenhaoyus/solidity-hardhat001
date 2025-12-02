// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract NftAuction is Initializable  {
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
    }

    //拍卖记录
    mapping(uint256 => Auction) public auctions;

    //下一个拍卖ID
    uint256 public nextAuctionId;

    //拍卖管理员
    address public admin;

    function initialize() initializer public {
        admin = msg.sender;
    }

    function createAuction(uint256 _duration, uint _startPrice, address _nftContract, uint256 _tokenId) public {
        //必须管理员创建拍卖
        require(admin == msg.sender, "Only admin can create auction");
        //持续时间大于0
        require(_duration >= 1000 * 60, "Duration must be greater than 1 minute");
        //开始价格大于0
        require(_startPrice > 0, "Start price must be greater than 0");

        auctions[nextAuctionId] = Auction({
            seller: msg.sender,
            duration: _duration,
            startTime: block.timestamp,
            startingPrice: _startPrice,
            ended: false,
            highestBidder: address(0),
            highestBid: 0,
            nftContract: _nftContract,
            tokenId: _tokenId
        });

        nextAuctionId++;
    }
    
    //买家参与买单
    function placeBid(uint256 _auctionId) external payable{

        Auction storage auction = auctions[_auctionId];

        //判断当前拍卖是否已经结束
        require(!auction.ended && block.timestamp <= auction.startTime + auction.duration, "Auction already ended");
        //判断当前出价是否大于最高出价
        require(msg.value > auction.highestBid && msg.value > auction.startingPrice, "Bid must be higher than current highest bid");

        //退回上一个人出价
        if(auction.highestBidder != address(0)){
            payable(auction.highestBidder).transfer(auction.highestBid);
        }

        //更新最高价地址和最高价格
        auction.highestBidder = msg.sender;
        auction.highestBid = msg.value;
    }
}
