require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
require("hardhat-deploy");
require("@openzeppelin/hardhat-upgrades");
  

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  namedAccounts: {
    deployer: {
      default: 0, // 第一个账户
      user1: 1, // 第二个账户
      user2: 2, // 第三个账户
    },
  },

  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    sepolia:{
      url:`https://sepolia.infura.io/v3/${process.env.infura_key}`,
      accounts:[process.env.private_key]
    }
  },
};

task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});