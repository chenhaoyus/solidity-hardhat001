const hre = require("hardhat");
const {expect} = require("chai");

describe("Test01", function () {

    const {ethers} = hre;
    let myToken;
    let acc0;
    let acc1;

    beforeEach(async function () {

       [acc0, acc1] = await ethers.getSigners();

       console.log(acc0.address, "acc0");
       console.log(acc1.address, "acc1");

       const Test01 = await ethers.getContractFactory("Test01");
       myToken = await Test01.connect(acc1).deploy();
       await myToken.waitForDeployment();
    //    console.log("====================");
    //    console.log(await myToken.getAddress(), "myToken");
    //    console.log("====================");
       expect(await myToken.name()).to.equal("Test01");
    });

    it("test01", async function () {
        await myToken.mint(acc1.address, 1000);
        console.log(await myToken.balanceOf(acc1.address), "acc1");

    });

    it("test02", async function () {
        await myToken.mint(acc1.address, 1000);
        await myToken.connect(acc1).transfer(acc0.address, 200);

        console.log(await myToken.balanceOf(acc0.address), "acc0");
        console.log(await myToken.balanceOf(acc1.address), "acc1");
    });
});
