const { ethers, deployments } = require("hardhat");
const { expect } = require("chai");

describe("NftAuction", function () {
  it("Should deploy the contract", async function () {
    //1.部署合约
    await deployments.fixture(["deployNftAuction"]);
    const nftAuctionProxy = await deployments.get("NftAuction"); // 修复：使用正确的部署名称 "NftAuction"
    const nftAuction = await ethers.getContractAt("NftAuction", nftAuctionProxy.address);
    //2.调用合约
    await nftAuction.createAuction(100000, ethers.parseEther("0.000000000001"), ethers.ZeroAddress, 1);

    const auction = await nftAuction.auctions(0);
    console.log("创建拍卖成功, " , auction);
    //3.升级合约
    await deployments.fixture(["upgradeNftAuctionV2"]);
    // 获取升级后的合约实例
    const nftAuctionV2 = await ethers.getContractAt("NftAuctionV2", nftAuctionProxy.address);
    //调用合约，验证数据
    const auctionV2 = await nftAuctionV2.auctions(0);
    console.log("升级拍卖成功, " , auctionV2);  

    expect(auctionV2.highestBidder).to.equal(ethers.ZeroAddress);
    expect(auctionV2.startingPrice).to.equal(ethers.parseEther("0.000000000001")); // 修复：检查startingPrice而不是highestBid
    expect(auctionV2.startTime).to.equal(auction.startTime);
    const hello = await nftAuctionV2.testHello();
    console.log("升级拍卖成功, 调用testHello()函数, 返回值: ", hello);
  });
});
