const { ethers, deployments, upgrades } = require("hardhat");
const { expect } = require("chai");

// Sepolia 网络上的真实 USDC 合约地址
const SEPOLIA_USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
const USDC_DECIMALS = 6;

describe("NftAuction Mixed Token Bidding", function () {
    this.timeout(300000);
    
    let myNFT, nftAuction, usdcToken;
    let owner, buyer1, buyer2;

    before(async function () {
        console.log("当前网络:", network.name);
        
        const signers = await ethers.getSigners();
        owner = signers[0];
        buyer1 = signers[1];
        buyer2 = signers[2];
        
        console.log("测试账户:", {
            部署者: owner.address,
            买家1: buyer1.address,
            买家2: buyer2.address
        });

        // 获取真实 USDC 合约实例
        usdcToken = await ethers.getContractAt("IERC20", SEPOLIA_USDC);
        console.log("使用真实USDC地址:", SEPOLIA_USDC);
    });

    it("应该部署合约和设置价格源", async function () {
        console.log("=== 部署合约 ===");
        
        // 部署 MyNFT 合约
        const MyNFT = await ethers.getContractFactory("MyNFT");
        myNFT = await MyNFT.deploy();
        await myNFT.waitForDeployment();
        console.log("MyNFT部署地址:", await myNFT.getAddress());

        // 运行部署脚本部署 NftAuction 合约
        await deployments.run(["deployNftAuction"]);
        
        // 获取部署的 NftAuction 合约实例
        const nftAuctionDeployment = await deployments.get("NftAuction");
        nftAuction = await ethers.getContractAt("NftAuction", nftAuctionDeployment.address);
        console.log("NftAuction部署地址:", nftAuctionDeployment.address);

        // 设置价格源
        await nftAuction.setPriceFeed(ethers.ZeroAddress, "0x694AA1769357215DE4FAC081bf1f309aDC325306");
        await nftAuction.setPriceFeed(SEPOLIA_USDC, "0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E");
        console.log("价格源设置完成");
    });

    it("应该检查账户余额", async function () {
        console.log("=== 账户余额检查 ===");
        
        const buyer1EthBalance = await ethers.provider.getBalance(buyer1.address);
        const buyer2EthBalance = await ethers.provider.getBalance(buyer2.address);
        const buyer1UsdcBalance = await usdcToken.balanceOf(buyer1.address);
        const buyer2UsdcBalance = await usdcToken.balanceOf(buyer2.address);

        console.log("ETH余额:", {
            买家1: ethers.formatEther(buyer1EthBalance) + " ETH",
            买家2: ethers.formatEther(buyer2EthBalance) + " ETH"
        });

        console.log("USDC余额:", {
            买家1: ethers.formatUnits(buyer1UsdcBalance, USDC_DECIMALS) + " USDC",
            买家2: ethers.formatUnits(buyer2UsdcBalance, USDC_DECIMALS) + " USDC"
        });
    });

    it("应该铸造NFT并授权", async function () {
        console.log("=== 铸造NFT ===");
        
        // 铸造NFT用于拍卖
        const mintTx = await myNFT.mintNFT(owner.address, "https://example.com/mixed-bidding", 0);
        const mintReceipt = await mintTx.wait();
        console.log("NFT铸造交易哈希:", mintTx.hash);
        console.log("NFT铸造交易状态:", mintReceipt.status);
        
        // 等待几秒钟确保交易被确认
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log("NFT铸造完成");

        // 检查NFT所有者
        try {
            const ownerOfToken = await myNFT.ownerOf(0);
            console.log("NFT所有者:", ownerOfToken);
            expect(ownerOfToken).to.equal(owner.address);
        } catch (error) {
            console.log("获取NFT所有者失败:", error.message);
            throw error;
        }

        // 授权拍卖合约操作NFT
        const approveTx = await myNFT.setApprovalForAll(await nftAuction.getAddress(), true);
        const approveReceipt = await approveTx.wait();
        console.log("NFT授权交易哈希:", approveTx.hash);
        console.log("NFT授权交易状态:", approveReceipt.status);
        
        // 等待几秒钟确保交易被确认
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 检查授权
        try {
            const isApproved = await myNFT.isApprovedForAll(owner.address, await nftAuction.getAddress());
            console.log("NFT授权状态:", isApproved);
            expect(isApproved).to.be.true;
        } catch (error) {
            console.log("获取NFT授权状态失败:", error.message);
            throw error;
        }
        console.log("NFT授权完成");
    });

    it("应该创建接受ETH竞价的拍卖", async function () {
        console.log("=== 创建拍卖 ===");
        
        const duration = 120; // 120秒，合约中使用秒为单位
        const startPrice = ethers.parseEther("0.0000000001"); // 0.0000000001 ETH
        
        const createTx = await nftAuction.createAuction(
            duration,
            startPrice,
            await myNFT.getAddress(),
            0 // tokenId 0
        );
        
        await createTx.wait();
        console.log("✅ 拍卖创建成功!");

        const auction = await nftAuction.auctions(0);
        console.log("拍卖信息:", {
            startingPrice: ethers.formatEther(auction.startingPrice) + " ETH",
            tokenAddress: auction.tokenAddress === ethers.ZeroAddress ? "ETH" : "USDC"
        });
    });

    it("买家1应该使用ETH出价", async function () {
        console.log("=== 买家1 ETH出价 ===");
        
        const bidAmount = ethers.parseEther("0.0000000002"); // 0.0000000002 ETH
        
        const buyer1Balance = await ethers.provider.getBalance(buyer1.address);
        console.log("买家1 ETH余额:", ethers.formatEther(buyer1Balance), "ETH");
        
        if (Number(ethers.formatEther(buyer1Balance)) > Number(ethers.formatEther(bidAmount))) {
            const placeBidTx = await nftAuction.connect(buyer1).placeBid(
                0, // auctionId
                0, // amount (ETH时忽略)
                ethers.ZeroAddress, // ETH
                { value: bidAmount }
            );
            const placeBidReceipt = await placeBidTx.wait();
            console.log("买家1 ETH出价交易哈希:", placeBidTx.hash);
            console.log("买家1 ETH出价交易状态:", placeBidReceipt.status);
            console.log("✅ 买家1 ETH出价成功!");

            const auction = await nftAuction.auctions(0);
            console.log("出价后拍卖状态:", {
                highestBidder: auction.highestBidder,
                highestBid: ethers.formatEther(auction.highestBid) + " ETH",
                tokenAddress: auction.tokenAddress === ethers.ZeroAddress ? "ETH" : "USDC"
            });

            expect(auction.highestBidder).to.equal(buyer1.address);
            expect(auction.highestBid).to.equal(bidAmount);
        } else {
            console.log("⚠️ 买家1 ETH余额不足");
        }
    });

    it("买家2应该使用USDC出价", async function () {
        console.log("=== 买家2 USDC出价 ===");
        
        const bidAmount = ethers.parseUnits("0.1", USDC_DECIMALS); // 10 USDC
        
        const buyer2UsdcBalance = await usdcToken.balanceOf(buyer2.address);
        console.log("买家2 USDC余额:", ethers.formatUnits(buyer2UsdcBalance, USDC_DECIMALS), "USDC");
        
        if (Number(ethers.formatUnits(buyer2UsdcBalance, USDC_DECIMALS)) >= 10) {
            // 授权拍卖合约使用USDC
            const approveTx = await usdcToken.connect(buyer2).approve(await nftAuction.getAddress(), bidAmount);
            const approveReceipt = await approveTx.wait();
            console.log("USDC授权交易哈希:", approveTx.hash);
            console.log("USDC授权交易状态:", approveReceipt.status);
            console.log("✅ USDC授权成功");

            // 执行USDC出价
            const placeBidTx = await nftAuction.connect(buyer2).placeBid(
                0, // 同一个拍卖
                bidAmount, // USDC数量
                SEPOLIA_USDC // USDC代币地址
            );
            const placeBidReceipt = await placeBidTx.wait();
            console.log("买家2 USDC出价交易哈希:", placeBidTx.hash);
            console.log("买家2 USDC出价交易状态:", placeBidReceipt.status);
            console.log("✅ 买家2 USDC出价成功!");

            const auction = await nftAuction.auctions(0);
            console.log("USDC出价后拍卖状态:", {
                highestBidder: auction.highestBidder,
                highestBid: auction.tokenAddress === ethers.ZeroAddress ? 
                    ethers.formatEther(auction.highestBid) + " ETH" : 
                    ethers.formatUnits(auction.highestBid, USDC_DECIMALS) + " USDC",
                tokenAddress: auction.tokenAddress === ethers.ZeroAddress ? "ETH" : "USDC"
            });

            // 如果USDC出价更高，应该更新最高出价者
            if (auction.highestBidder === buyer2.address) {
                console.log("🎯 USDC出价超过了之前的ETH出价！");
            }
        } else {
            console.log("⚠️ 买家2 USDC余额不足");
        }
    });

    it("应该测试价格查询功能", async function () {
        console.log("=== 测试价格查询 ===");
        
        try {
            const ethPrice = await nftAuction.getChainlinkDataFeedLatestAnswer(ethers.ZeroAddress);
            console.log("ETH/USD价格:", ethPrice.toString());

            const usdcPrice = await nftAuction.getChainlinkDataFeedLatestAnswer(await usdcToken.getAddress());
            console.log("USDC/USD价格:", usdcPrice.toString());
        } catch (error) {
            console.log("价格查询测试:", error.message);
        }
    });

    it("应该结束拍卖并分配资产", async function () {
        console.log("=== 结束拍卖测试 ===");
        
        // 前进时间（本地网络）
        if (network.name !== "sepolia") {
            await ethers.provider.send("evm_increaseTime", [3600]);
            await ethers.provider.send("evm_mine");
        }

        // 结束 USDC 拍卖
        const endAuctionTx = await nftAuction.connect(owner).endAuction(0);
        const endAuctionReceipt = await endAuctionTx.wait();
        console.log("结束拍卖交易哈希:", endAuctionTx.hash);
        console.log("结束拍卖交易状态:", endAuctionReceipt.status);
        console.log("✅ 拍卖已结束!");
        
        // 验证 NFT 所有权转移
        const nftOwner = await myNFT.ownerOf(0);
        console.log("NFT最终所有者:", nftOwner);

        // 验证卖家收到 USDC
        const sellerUSDCBalance = await usdcToken.balanceOf(owner.address);
        console.log("卖家收到USDC:", ethers.formatUnits(sellerUSDCBalance, 6));

        expect(nftOwner).to.equal(buyer2.address);
    });

    it("应该使用02_upgrades_nft_auction.js脚本升级合约到V2版本", async function () {
        console.log("=== 使用部署脚本升级到V2版本 ===");
        
        // 保存原合约地址用于验证
        const originalProxyAddress = await nftAuction.getAddress();
        console.log("原代理地址:", originalProxyAddress);
        
        // 运行升级脚本升级到V2版本
        await deployments.run(["upgradeNftAuctionV2"]);
        
        // 获取升级后的合约实例
        const nftAuctionV2Deployment = await deployments.get("NftAuctionV2");
        const nftAuctionV2 = await ethers.getContractAt("NftAuctionV2", nftAuctionV2Deployment.address);
        await nftAuctionV2.waitForDeployment();
        
        console.log("NftAuction V2 代理地址:", await nftAuctionV2.getAddress());
        
        // 验证代理地址没有变化
        expect(await nftAuctionV2.getAddress()).to.equal(originalProxyAddress);
        console.log("代理地址验证成功");
        
        // 测试V2版本特有的testHello方法
        const helloMessage = await nftAuctionV2.testHello();
        expect(helloMessage).to.equal("hello");
        console.log("V2新功能testHello测试成功:", helloMessage);
        
        // 创建一个新的拍卖来验证升级后的合约功能
        const duration = 120;
        const startPrice = ethers.parseEther("0.0000000001");

        // 铸币
        const mintTx = await myNFT.connect(owner).mintNFT(owner.address,"https://example.com/token/1", 1);
        await mintTx.wait();
        console.log("✅ 铸造NFT成功!");
        
        const createTx = await nftAuctionV2.createAuction(
            duration,
            startPrice,
            await myNFT.getAddress(),
            1 // tokenId 1
        );
        await createTx.wait();
        console.log("✅ 升级后创建拍卖成功!");
        
        // 验证新创建的拍卖
        const auction = await nftAuctionV2.auctions(1);
        expect(auction.seller).to.equal(owner.address);
        console.log("升级后拍卖数据验证成功");
    });
});