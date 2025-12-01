// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8;

import "@openzeppelin/contracts/proxy/Proxy.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/access/OwnableUpgradeable.sol";

contract TransparentProxy is Proxy {
    // EIP - 1967 存储插槽
    bytes32 private constant _IMPLEMENTATION_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;
    bytes32 private constant _ADMIN_SLOT = 0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103;

    constructor(address _initImplementation, address _initAdmin) {
        // 设置逻辑合约地址
        assembly {
            sstore(_IMPLEMENTATION_SLOT, _initImplementation)
        }
        // 设置管理员地址
        assembly {
            sstore(_ADMIN_SLOT, _initAdmin)
        }
    }

    function _implementation() internal view override returns (address) {
        address impl;
        assembly {
            impl := sload(_IMPLEMENTATION_SLOT)
        }
        return impl;
    }

    function upgradeTo(address _newImplementation) external {
        require(msg.sender == admin(), "Only admin can upgrade");
        assembly {
            sstore(_IMPLEMENTATION_SLOT, _newImplementation)
        }
    }

    function admin() public view returns (address) {
        address admin;
        assembly {
            admin := sload(_ADMIN_SLOT)
        }
        return admin;
    }
}

contract TransparentLogicV1 is Initializable, OwnableUpgradeable {
    uint256 public value;

    function setValue(uint256 _value) public virtual {
        value = _value;
    }

    function getValue() public view virtual returns (uint256) {
        return value;
    }

    function initialize(address initialOwner) public initializer {
        __Ownable_init(initialOwner);
    }
}