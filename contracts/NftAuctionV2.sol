// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./NftAuction.sol";

contract NftAuctionV2 is NftAuction {
    function testHello() public pure returns (string memory) {
        return "hello";
    }
}
