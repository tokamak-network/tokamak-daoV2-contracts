// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "../libraries/Layer2.sol";

interface ILayer2Manager {
    //**** onlyOwner ****//
    function setMaxLayer2Count(uint256 _maxLayer2Count) external;
    function setMinimumDepositForSequencer(uint256 _minimumDepositForSequencer) external;
    function setRatioSecurityDepositOfTvl(uint16 _ratioSecurityDepositOfTvl) external;
    function setMinimumDepositForCandidate(uint256 _minimumDepositForCandidate) external;
    function setDelayBlocksForWithdraw(uint256 _delayBlocksForWithdraw) external;

    //**** onlySeigManagerV2 ****//
    function addSeigs(uint256 amount) external returns (bool);

    //**** sequncer ****//
    function createOptimismSequencer(
        bytes32 _name,
        address addressManager,
        address l2ton,
        uint256 amount
    )
        external;

    function decreaseSecurityDeposit(uint32 _sequencerIndex, uint256 amount)
        external;

    //**** candidate ****//
    function createCandidate(
        uint32 _sequencerIndex,
        bytes32 _name,
        uint16 _commission,
        uint256 amount
    )   
        external;

    //**** Anyone ****//
    function increaseSecurityDeposit(uint32 _sequencerIndex, uint256 amount)
        external;

    function distribute() external;

    function claim(uint32 _layerIndex) external;

    //**** view ****//
    function indexSequencers() external view returns (uint256);
    function minimumSecurityDepositAmount(address l1Bridge, address l2ton) external view returns (uint256 amount);
    function balanceOfLton(address account) external view returns (uint256 amount);
    function curTotalLayer2Deposits() external view returns (uint256 amount);
    function sequencer(uint32 _layerIndex) external view returns (address sequencer_);
    function existedLayer2Index(uint32 _index) external view returns (bool exist_);
    function existedCandidateIndex(uint32 _index) external view returns (bool exist_);
    function curTotalAmountsLayer2() external view returns (uint256 amount);
    function totalLayers() external view returns (uint256 total);
    function totalCandidates() external view returns (uint256 total);
    function curlayer2DepositsOf(uint32 _layerIndex) external view returns (uint256 amount);
    function depositsOf(uint32 _layerIndex) external view returns (uint256 amount);
    function getAllLayers() external view
        returns (
            bytes32[] memory optimismSequencerNames_,
            uint32[] memory optimismSequencerIndexes_,
            Layer2.Layer2Holdings[] memory holdings_,
            bytes[] memory infos_
        );
    function getAllCandidates()
        external view
        returns (
            bytes32[] memory candidateNames_,
            uint32[] memory candidateNamesIndexes_,
            bytes[] memory infos_
        );
    function layerHoldings(uint32 layerKey_)
        external view
        returns (Layer2.Layer2Holdings memory);
}
