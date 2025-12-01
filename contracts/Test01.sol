// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract Test01 is ERC20, Ownable{

    constructor() ERC20("Test01", "T01") Ownable(msg.sender) {}
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }

    
}
