const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

module.exports = async function ({ getNamedAccounts, deployments }) {

    const { save, get } = deployments;
    const storePath = await path.resolve(__dirname, "./.cache/proxyNftAuction.json");
    const storeData = fs.readFileSync(storePath, "utf-8");
    const parsedData = JSON.parse(storeData);

    // 支持两种缓存文件结构：初始部署和升级后
    const nftAuctionProxyAddress = parsedData.nftAuctionProxyAddress || parsedData.nftAuctionProxyV2Address;
    if (!nftAuctionProxyAddress) {
        throw new Error("Proxy address not found in cache file");
    }
    console.log("使用的代理地址:", nftAuctionProxyAddress);

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
