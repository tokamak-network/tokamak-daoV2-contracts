// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
pragma abicoder v2;

import { LibDaoV2 } from "../libraries/LibDaoV2.sol";

import { ILayer2Manager } from "../interfaces/ILayer2Manager.sol";
import { ISeigManagerV2 } from "../interfaces/ISeigManagerV2.sol";
import { ICandidateV2 } from "../interfaces/ICandidateV2.sol";
import { IOptimismSequencer } from "../interfaces/IOptimismSequencer.sol";

contract StorageStateCommitteeV2 {
    address internal _implementation;
    bool public pauseProxy;

    address public logicAddress;  //0x3949c97925e5Aa13e34ddb18EAbf0B70ABB0C7d4 (CommitteeV2 logicAddress)

    // ILayer2Manager public layer2Manager;
    address public layer2Manager;
    ISeigManagerV2 public seigManagerV2;
    // address public seigManagerV2;
    ICandidateV2 public candidate;
    IOptimismSequencer public sequencer;

    address[] public candidatesV2;

    mapping(address => LibDaoV2.CandidateInfoV2) internal _candidateInfosV2;

    modifier validLayer2Manager() {
        require(address(layer2Manager) != address(0), "StorageStateCommittee: invalid Layer2Manager");
        _;
    }

    modifier validSeigManagerV2() {
        require(address(seigManagerV2) != address(0), "StorageStateCommittee: invalid SeigManagerV2");
        _;
    }

    function isMemberV2(address _candidate) public view returns (bool) {
        return _candidateInfosV2[_candidate].memberJoinedTime > 0;
    }

    function candidateInfosV2(address _candidate) external view returns (LibDaoV2.CandidateInfoV2 memory) {
        return _candidateInfosV2[_candidate];
    }

    function isCandidateV2(address _candidate) public view returns (uint8) {
        if(_candidateInfosV2[_candidate].sequencerIndex > 0) {
            if(_candidateInfosV2[_candidate].candidateIndex > 0) {
                return 2;
            } else {
                return 1;
            }
        }
        return 0;
    }

}