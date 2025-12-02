const { Contract } = require("ethers");
const { ethers } = require("hardhat");

describe("NftAuction", function () {
  it("Should deploy the contract", async function () {
    const {arr0, arr1} = ethers.getSigners();
    const NftAuction = await ethers.getContractFactory("NftAuction");
    const nftAuction = await NftAuction.deploy();
    await nftAuction.waitForDeployment();
    console.log("NFTAuction deployed to:", await nftAuction.getAddress());

    await nftAuction.createAuction(100000, ethers.parseEther("0.000000000001"), ethers.ZeroAddress, 1);

    const auction = await nftAuction.auctions(0);
    console.log(auction);
  });
});
