const {  upgrades, ethers } = require("hardhat");

const fs = require("fs");
const path = require("path");

// deploy/00_deploy_my_contract.js
module.exports = async ({getNamedAccounts, deployments}) => {
  const {save} = deployments;
  const {deployer} = await getNamedAccounts();
  console.log("deployer::", deployer);

  const NftAuction = await ethers.getContractFactory("NftAuction");

  const nftAuctionProxy = await upgrades.deployProxy(NftAuction, [], { initializer: "initialize" });
  await nftAuctionProxy.waitForDeployment();

  const nftAuctionProxyAddress = await nftAuctionProxy.getAddress();
  const nftAuctionAddress = await upgrades.erc1967.getImplementationAddress(await nftAuctionProxy.getAddress())

  console.log("nftAuctionProxy::", nftAuctionProxyAddress);
  console.log("nftAuction::", nftAuctionAddress);

  const cacheDir = path.resolve(__dirname, "./.cache");
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  const storePath = path.join(cacheDir, "proxyNftAuction.json");

  fs.writeFileSync(storePath, JSON.stringify({
    nftAuctionProxyAddress,
    nftAuctionAddress,
    abi: NftAuction.interface.format("json"),
  }));

  await save("NftAuction", {
    address: nftAuctionProxyAddress,
    abi: NftAuction.interface.format("json"),
  });
};
module.exports.tags = ['deployNftAuction'];
