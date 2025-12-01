const {ethers} = require("hardhat");

describe("MyNFT", function () {

    let acc0;
    let acc1;

    it("test01", async function () {
        [acc0, acc1] = await ethers.getSigners();
        const MyNFT = await ethers.getContractFactory("MyNFT");
        const myNFT = await MyNFT.deploy();
        await myNFT.waitForDeployment();
        console.log("myNFT deployed to:", await myNFT.getAddress());
    });

    it("test02", async function () {
        [acc0, acc1] = await ethers.getSigners();
        const MyNFT = await ethers.getContractFactory("MyNFT");
        const myNFT = await MyNFT.deploy();
        await myNFT.waitForDeployment();
        console.log("myNFT name:", await myNFT.name());
        console.log("myNFT symbol:", await myNFT.symbol());
    });

    it("test03", async function () {
        [acc0, acc1] = await ethers.getSigners();
        const MyNFT = await ethers.getContractFactory("MyNFT");
        const myNFT = await MyNFT.deploy();
        await myNFT.waitForDeployment();

        await myNFT.mintNFT(acc0.address, "http://www.text.com");
        console.log("acc0:", await myNFT.tokenURI(0));  
    });
}); 
