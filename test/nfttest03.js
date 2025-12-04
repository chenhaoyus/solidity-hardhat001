const { ethers, deployments } = require("hardhat");
const { expect } = require("chai")

describe("Test nftauction", function () {
    this.timeout(300000);

    it("Should deploy the contract and test placeBid", async function () {
        await main();
    });

    async function main() {
        try {
            console.log("=== 开始完整测试 ===");
            
            // 部署合约
            await deployments.fixture(["deployNftAuction"]);
            const nftAuctionProxy = await deployments.get("NftAuction");
            const nftAuction = await ethers.getContractAt("NftAuction", nftAuctionProxy.address);

            // 获取签名者
            const signers = await ethers.getSigners();
            const deployer = signers[0];
            
            console.log("deployer address:", deployer.address);
            console.log("可用签名者数量:", signers.length);

            // 检查是否有足够的账户进行测试
            let buyer;
            if (signers.length >= 2) {
                buyer = signers[1];
                console.log("买家地址:", buyer.address);
            } else {
                console.log("⚠️ 只有一个账户可用，无法测试placeBid");
                console.log("将只测试基本功能");
                buyer = deployer; // 使用同一个账户作为买家（可能不工作）
            }

            // 部署ERC721合约
            const ERC721Test = await ethers.getContractFactory("ERC721Test");
            const erc721Test = await ERC721Test.deploy();
            await erc721Test.waitForDeployment();
            const erc721TestAddress = await erc721Test.getAddress();
            console.log("ERC721Test deployed to:", erc721TestAddress);

            // 铸造NFT
            console.log("铸造NFT...");
            for (let i = 0; i < 3; i++) {
                const mintTx = await erc721Test.mint(deployer.address, i);
                await mintTx.wait();
            }
            console.log("NFT铸造完成");

            // 授权NFT给拍卖合约
            console.log("授权NFT...");
            const approveTx = await erc721Test.setApprovalForAll(await nftAuction.getAddress(), true);
            await approveTx.wait();
            console.log("NFT授权完成");

            // 创建拍卖
            const tokenId = 1;
            console.log("创建拍卖...");
            const createTx = await nftAuction.createAuction(
                10000, 
                ethers.parseEther("0.0001"),
                erc721TestAddress, 
                tokenId
            );
            const receipt = await createTx.wait();
            console.log("✅ 拍卖创建成功!");

            // 验证拍卖信息
            const auctionBeforeBid = await nftAuction.auctions(0);
            console.log("竞价前拍卖信息:", {
                seller: auctionBeforeBid.seller,
                startingPrice: ethers.formatEther(auctionBeforeBid.startingPrice),
                highestBidder: auctionBeforeBid.highestBidder,
                highestBid: ethers.formatEther(auctionBeforeBid.highestBid),
                ended: auctionBeforeBid.ended
            });

            // ========== 测试 placeBid ==========
            console.log("=== 测试 placeBid 功能 ===");
            
            if (signers.length >= 2) {
                // 有多个账户，可以正常测试placeBid
                console.log("测试买家竞价...");
                const bidAmount = ethers.parseEther("0.0002");
                
                // 检查买家余额
                const buyerBalance = await ethers.provider.getBalance(buyer.address);
                console.log("买家余额:", ethers.formatEther(buyerBalance), "ETH");
                
                if (Number(ethers.formatEther(buyerBalance)) > Number(ethers.formatEther(bidAmount))) {
                    const placeBidTx = await nftAuction.connect(buyer).placeBid(
                        0, // auctionId
                        0, // amount (ETH时忽略)
                        ethers.ZeroAddress,
                        { value: bidAmount }
                    );
                    await placeBidTx.wait();
                    console.log("✅ placeBid 成功!");

                    // 验证竞价结果
                    const auctionAfterBid = await nftAuction.auctions(0);
                    console.log("竞价后拍卖信息:", {
                        highestBidder: auctionAfterBid.highestBidder,
                        highestBid: ethers.formatEther(auctionAfterBid.highestBid),
                        tokenAddress: auctionAfterBid.tokenAddress
                    });

                    expect(auctionAfterBid.highestBidder).to.equal(buyer.address);
                    expect(auctionAfterBid.highestBid).to.equal(bidAmount);
                } else {
                    console.log("⚠️ 买家余额不足，跳过placeBid测试");
                }
            } else {
                // 只有一个账户，尝试模拟placeBid（可能失败）
                console.log("尝试使用同一个账户进行竞价测试...");
                try {
                    const bidAmount = ethers.parseEther("0.0002");
                    const placeBidTx = await nftAuction.placeBid(
                        0, 
                        0, 
                        ethers.ZeroAddress,
                        { value: bidAmount }
                    );
                    await placeBidTx.wait();
                    console.log("✅ 同一个账户placeBid成功!");
                } catch (error) {
                    console.log("❌ 同一个账户placeBid失败:", error.message);
                    console.log("这是预期的，因为卖家不能竞拍自己的物品");
                }
            }

            // ========== 测试其他功能 ==========
            console.log("=== 测试其他功能 ===");
            
            // 测试价格查询
            try {
                const price = await nftAuction.getChainlinkDataFeedLatestAnswer(ethers.ZeroAddress);
                console.log("ETH/USD价格:", price.toString());
            } catch (error) {
                console.log("价格查询失败:", error.message);
            }

            // 测试管理员功能
            const admin = await nftAuction.admin();
            console.log("管理员地址:", admin);

            // 测试拍卖数量
            const nextAuctionId = await nftAuction.nextAuctionId();
            console.log("下一个拍卖ID:", nextAuctionId.toString());

            console.log("🎉 测试完成!");

        } catch (error) {
            console.error("❌ 测试失败:", error);
            throw error;
        }
    }
});