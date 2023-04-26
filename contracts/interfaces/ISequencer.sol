// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import { LibOptimism } from "../libraries/LibOptimism.sol";

interface ISequencer {
    function create(uint32 _index, bytes memory _layerInfo) external;
    function stake(uint32 _index, uint256 amount) external;
    function unstake(uint32 _index, uint256 lton_) external;

    function existedIndex(uint32 _index) external view returns (bool);
    function getLayerInfo(uint32 _index)
        external view returns (LibOptimism.Info memory _layerInfo);

    function getLayerKey(uint32 _index) external view returns (bytes32 layerKey_);
    function getTvl(uint32 _index) external view returns (uint256 amount);
    function getTvl(address l1Bridge, address l2ton) external view returns (uint256 amount);
    function sequencer(uint32 _index) external view returns (address sequencer_);
    function balanceOfLton(uint32 _index) external view returns (uint256 amount);
}
