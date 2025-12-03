const { ethers, deployments } = require("hardhat");
const { expect } = require("chai")

describe("Test nftauciton", function () {
    it("Should deploy the contract", async function () {
        await main();
    });
});

async function main() {

    await deployments.fixture(["deployNftAuction"]);
    const nftAuctionProxy = await deployments.get("NftAuction");
    const nftAuction = await ethers.getContractAt("NftAuction", nftAuctionProxy.address);

    const [signers, buyer] = await ethers.getSigners();

    //1.部署ERC721合约
    const ERC721Test = await ethers.getContractFactory("ERC721Test");
    const erc721Test = await ERC721Test.deploy();
    await erc721Test.waitForDeployment();
    const erc721TestAddress = await erc721Test.getAddress();
    console.log("ERC721Test deployed to:", erc721TestAddress);

    for (let i = 0; i < 10; i++) {
        await erc721Test.mint(signers, i);
    }

    await erc721Test.setApprovalForAll(nftAuctionProxy.address, true);
    //await erc721Test.approve(nftAuctionProxy.address, 1);

    //2.调用createAuction
    const tokenId = 1;
    const owner = await erc721Test.ownerOf(tokenId);
    console.log("owner", owner);
    console.log("signers", signers.address);
    await nftAuction.createAuction(10000, ethers.parseEther("0.000000000001"), erc721TestAddress, tokenId);

    //3.购买参与拍卖NFT
    await nftAuction.connect(buyer).placeBid(0, { value: ethers.parseEther("0.000000000002") });

    //4.结束拍卖
    //等待100000毫秒
    // 等待 10 s
    //await new Promise((resolve) => setTimeout(resolve, 9 * 1000));
    await nftAuction.endAuction(0);

    //5.验证结果
    const auction = await nftAuction.auctions(0);
    console.log("结果验证", auction);
    //验证auction.highestBidder为buyer.address
    console.log("highestBidder", await auction.highestBidder);
    console.log("buyer.address", buyer.address);
    expect(await auction.highestBidder).to.equal(buyer.address);
    //验证auction.highestBid为0.000000000002
    expect(auction.highestBid).to.equal(ethers.parseEther("0.000000000002"));
    //验证auction.isEnded为true
    expect(auction.ended).to.equal(true); 
    //验证auction.tokenId为1
    expect(auction.tokenId).to.equal(1);



}
