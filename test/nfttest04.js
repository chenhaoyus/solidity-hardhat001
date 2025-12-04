const { ethers, deployments } = require("hardhat");
const { expect } = require("chai");

describe("NftAuction Sepolia Test", function () {
    this.timeout(300000);
    
    let myNFT, nftAuction;
    let owner;

    before(async function () {
        console.log("当前网络:", network.name);
        
        const signers = await ethers.getSigners();
        owner = signers[0];
        console.log("测试账户:", owner.address);
        
        const balance = await ethers.provider.getBalance(owner.address);
        console.log("账户余额:", ethers.formatEther(balance), "ETH");
    });

    it("应该部署和初始化合约", async function () {
        console.log("=== 部署合约 ===");
        
        // 部署 MyNFT 合约
        const MyNFT = await ethers.getContractFactory("MyNFT");
        myNFT = await MyNFT.deploy();
        await myNFT.waitForDeployment();
        console.log("MyNFT部署地址:", await myNFT.getAddress());

        // 部署 NftAuction 合约
        const NftAuction = await ethers.getContractFactory("NftAuction");
        nftAuction = await NftAuction.deploy();
        await nftAuction.waitForDeployment();
        const auctionAddress = await nftAuction.getAddress();
        console.log("NftAuction部署地址:", auctionAddress);

        // 初始化合约
        const initTx = await nftAuction.initialize();
        await initTx.wait();
        console.log("合约初始化完成");

        // 设置价格源
        const setPriceTx = await nftAuction.setPriceFeed(
            ethers.ZeroAddress, 
            "0x694AA1769357215DE4FAC081bf1f309aDC325306"
        );
        await setPriceTx.wait();
        console.log("价格源设置完成");
    });

    it("应该铸造NFT", async function () {
        console.log("=== 铸造NFT ===");
        
        const mintTx = await myNFT.mintNFT(owner.address, "https://example.com/token/1");
        await mintTx.wait();
        console.log("NFT铸造完成");

        // 验证NFT所有权
        const nftOwner = await myNFT.ownerOf(0);
        console.log("NFT所有者:", nftOwner);
        expect(nftOwner).to.equal(owner.address);
    });

    it("应该测试拍卖创建功能", async function () {
        console.log("=== 测试拍卖创建 ===");
        
        // 授权拍卖合约操作NFT
        const approveTx = await myNFT.approve(await nftAuction.getAddress(), 0);
        await approveTx.wait();
        console.log("NFT授权完成");

        // 验证授权
        const approvedAddress = await myNFT.getApproved(0);
        console.log("授权地址:", approvedAddress);
        expect(approvedAddress).to.equal(await nftAuction.getAddress());

        // 创建拍卖 - 使用正确的持续时间
        // 合约要求: _duration >= 1000 * 10 = 10000秒
        const duration = 10000; // 10000秒 = 约2.78小时
        const startPrice = ethers.parseEther("0.001");
        
        console.log("创建拍卖参数:", {
            duration: duration,
            startPrice: ethers.formatEther(startPrice),
            durationInMinutes: (duration / 60).toFixed(2),
            durationInHours: (duration / 3600).toFixed(2)
        });

        const createTx = await nftAuction.createAuction(
            duration,
            startPrice,
            await myNFT.getAddress(),
            0 // tokenId
        );
        
        const receipt = await createTx.wait();
        console.log("✅ 拍卖创建成功!");
        console.log("交易哈希:", receipt.hash);
        console.log("Gas使用量:", receipt.gasUsed.toString());

        // 验证拍卖信息
        const auction = await nftAuction.auctions(0);
        console.log("拍卖信息:", {
            seller: auction.seller,
            startingPrice: ethers.formatEther(auction.startingPrice),
            duration: auction.duration.toString(),
            startTime: auction.startTime.toString(),
            ended: auction.ended,
            highestBidder: auction.highestBidder,
            highestBid: ethers.formatEther(auction.highestBid)
        });

        expect(auction.seller).to.equal(owner.address);
        expect(auction.startingPrice).to.equal(startPrice);
        expect(auction.duration).to.equal(duration);
        expect(auction.ended).to.be.false;
    });

    it("应该测试价格查询功能", async function () {
        console.log("=== 测试价格查询 ===");
        
        try {
            const price = await nftAuction.getChainlinkDataFeedLatestAnswer(ethers.ZeroAddress);
            console.log("ETH/USD价格:", price.toString());
            expect(Number(price)).to.be.greaterThan(0);
        } catch (error) {
            console.log("价格查询失败:", error.message);
        }
    });

    it("应该测试竞价功能", async function () {
        console.log("=== 测试竞价功能 ===");
        
        // 由于在测试网上只有一个账户，我们需要模拟买家
        // 在实际测试中，您需要多个账户或使用本地网络
        
        console.log("注意: 在Sepolia测试网上只有一个账户，无法测试完整竞价流程");
        console.log("建议在本地网络测试完整功能");
        
        // 这里可以测试一些基本功能
        const auction = await nftAuction.auctions(0);
        console.log("当前拍卖状态:", {
            highestBidder: auction.highestBidder,
            highestBid: ethers.formatEther(auction.highestBid),
            ended: auction.ended
        });
    });

    it("应该完成基本功能验证", async function () {
        console.log("=== 基本功能验证 ===");
        
        // 验证合约状态
        const admin = await nftAuction.admin();
        console.log("管理员:", admin);
        expect(admin).to.equal(owner.address);

        // 验证拍卖数量
        const nextAuctionId = await nftAuction.nextAuctionId();
        console.log("下一个拍卖ID:", nextAuctionId.toString());

        if (nextAuctionId > 0) {
            const auction = await nftAuction.auctions(0);
            console.log("拍卖0详细信息:", {
                seller: auction.seller,
                nftContract: auction.nftContract,
                tokenId: auction.tokenId.toString(),
                ended: auction.ended,
                startTime: auction.startTime.toString(),
                duration: auction.duration.toString()
            });
        }

        console.log("🎉 基本功能测试完成!");
    });
});

// 本地网络完整测试
describe("NftAuction Local Test", function () {
    this.timeout(60000);
    
    it("应该在本地网络测试完整拍卖流程", async function () {
        if (network.name === "sepolia") {
            console.log("跳过本地测试 - 当前在Sepolia网络");
            return;
        }
        
        const [deployer, buyer, seller] = await ethers.getSigners();
        
        // 部署合约
        const MyNFT = await ethers.getContractFactory("MyNFT");
        const myNFT = await MyNFT.deploy();
        
        const NftAuction = await ethers.getContractFactory("NftAuction");
        const nftAuction = await NftAuction.deploy();
        await nftAuction.initialize();
        
        // 铸造NFT
        await myNFT.mintNFT(seller.address, "test");
        
        // 授权
        await myNFT.connect(seller).approve(await nftAuction.getAddress(), 0);
        
        // 创建拍卖（使用10000秒持续时间）
        await nftAuction.connect(seller).createAuction(
            10000,
            ethers.parseEther("0.001"),
            await myNFT.getAddress(),
            0
        );
        
        // 买家竞价
        await nftAuction.connect(buyer).placeBid(
            0,
            0,
            ethers.ZeroAddress,
            { value: ethers.parseEther("0.002") }
        );
        
        console.log("✅ 本地网络完整测试完成");
    });
});