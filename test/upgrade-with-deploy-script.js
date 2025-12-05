const { expect } = require("chai");
const { ethers, deployments } = require("hardhat");

// 测试使用部署脚本升级合约
describe("NftAuction Upgrade with Deploy Script", function () {
    let owner, buyer;
    let myNFT, nftAuction;
    let originalProxyAddress;

    // 在测试开始前部署合约
    before(async function () {
        console.log("=== 部署测试环境 ===");
        
        // 获取测试账户
        const accounts = await ethers.getSigners();
        owner = accounts[0];
        buyer = accounts[1];
        
        console.log("测试账户:", {
            '所有者': owner.address,
            '买家': buyer.address
        });
        
        // 运行部署脚本部署NftAuction合约
        await deployments.run(["deployNftAuction"]);
        
        // 获取合约实例
        const myNFTDeployment = await deployments.get("MyNFT");
        const nftAuctionDeployment = await deployments.get("NftAuction");
        
        myNFT = await ethers.getContractAt("MyNFT", myNFTDeployment.address);
        nftAuction = await ethers.getContractAt("NftAuction", nftAuctionDeployment.address);
        
        console.log("MyNFT部署地址:", await myNFT.getAddress());
        console.log("NftAuction部署地址:", await nftAuction.getAddress());
        
        // 保存原代理地址用于验证
        originalProxyAddress = await nftAuction.getAddress();
        console.log("原代理地址:", originalProxyAddress);
        
        // 设置价格源（使用本地测试价格源）
        const ethPriceFeedAddress = "0x694AA1769357215DE4FAC081bf1f309aDC325306";
        const usdcPriceFeedAddress = "0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E";
        
        await nftAuction.setPriceFeed(ethers.ZeroAddress, ethPriceFeedAddress);
        await nftAuction.setPriceFeed("0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", usdcPriceFeedAddress);
        
        console.log("价格源设置完成");
    });

    // 测试使用部署脚本升级合约
    it("应该使用02_upgrades_nft_auction.js脚本升级到V2版本", async function () {
        console.log("=== 使用部署脚本升级到V2版本 ===");
        
        // 保存原合约实例用于验证
        const originalContract = nftAuction;
        
        // 运行升级脚本升级到V2版本
        await deployments.run(["upgradeNftAuctionV2"]);
        
        // 获取升级后的合约实例
        const nftAuctionV2Deployment = await deployments.get("NftAuctionV2");
        const nftAuctionV2 = await ethers.getContractAt("NftAuctionV2", nftAuctionV2Deployment.address);
        
        console.log("NftAuction V2 代理地址:", await nftAuctionV2.getAddress());
        
        // 验证代理地址没有变化
        expect(await nftAuctionV2.getAddress()).to.equal(originalProxyAddress);
        console.log("代理地址验证成功");
        
        // 测试V2版本特有的testHello方法
        const helloMessage = await nftAuctionV2.testHello();
        expect(helloMessage).to.equal("hello");
        console.log("V2新功能testHello测试成功:", helloMessage);
        
        // 测试原有功能是否仍然可用
        const duration = 120;
        const startPrice = ethers.parseEther("0.0000000001");
        
        // 铸造NFT
        const mintTx = await myNFT.connect(owner).mint(owner.address, 1);
        await mintTx.wait();
        console.log("✅ 铸造NFT成功!");
        
        // 授权NFT给拍卖合约
        const approveTx = await myNFT.connect(owner).approve(await nftAuctionV2.getAddress(), 1);
        await approveTx.wait();
        console.log("✅ 授权NFT成功!");
        
        // 创建一个新的拍卖
        const createTx = await nftAuctionV2.createAuction(
            duration,
            startPrice,
            await myNFT.getAddress(),
            1 // tokenId
        );
        await createTx.wait();
        console.log("✅ 升级后创建拍卖成功!");
        
        // 验证新创建的拍卖
        const auction = await nftAuctionV2.auctions(0);
        expect(auction.seller).to.equal(owner.address);
        console.log("升级后拍卖数据验证成功");
        
        // 测试出价功能
        const bidAmount = ethers.parseEther("0.0000000002");
        const bidTx = await nftAuctionV2.connect(buyer).placeBid(0, bidAmount, ethers.ZeroAddress, { value: bidAmount });
        await bidTx.wait();
        console.log("✅ 升级后出价成功!");
        
        // 验证出价
        const updatedAuction = await nftAuctionV2.auctions(0);
        expect(updatedAuction.highestBidder).to.equal(buyer.address);
        console.log("升级后出价数据验证成功");
    });

    // 测试结束
after(function () {
    console.log("\n=== 测试完成 ===");
    console.log("代理地址:", originalProxyAddress);
});
});
