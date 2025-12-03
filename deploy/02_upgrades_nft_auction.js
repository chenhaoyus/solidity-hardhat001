const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

module.exports = async function ({ getNamedAccounts, deployments }) {

    const { save } = deployments;
    const { deployer } = await getNamedAccounts();
    const storePath = await path.resolve(__dirname, "./.cache/proxyNftAuction.json");
    const storeData = fs.readFileSync(storePath, "utf-8");

    const {nftAuctionProxyAddress, nftAuctionAddress, abi} = JSON.parse(storeData);

    const NftAuctionV2 = await ethers.getContractFactory("NftAuctionV2");
    const nftAuctionProxyV2 = await upgrades.upgradeProxy(
        nftAuctionProxyAddress,
        NftAuctionV2
    );

    await nftAuctionProxyV2.waitForDeployment();
    const nftAuctionProxyV2Address = await nftAuctionProxyV2.getAddress();
    const nftAuctionV2Address = await upgrades.erc1967.getImplementationAddress(nftAuctionProxyV2Address);
    console.log("NftAuction proxy upgraded to:", nftAuctionProxyV2Address);
    console.log("NftAuction implementation upgraded to:", nftAuctionV2Address);

    fs.writeFileSync(storePath, JSON.stringify({
        nftAuctionProxyV2Address,
        nftAuctionV2Address,
        abi: NftAuctionV2.interface.format("json"),
      }));
    
      await save("NftAuctionV2", {
        address: nftAuctionProxyV2Address,
        abi: NftAuctionV2.interface.format("json"),
      });
};
module.exports.tags = ['upgradeNftAuctionV2'];
