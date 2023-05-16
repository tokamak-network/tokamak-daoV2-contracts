// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.7.6;

import { ILayer2Manager } from "../interfaces/ILayer2Manager.sol";
import { ISeigManagerV2 } from "../interfaces/ISeigManagerV2.sol";
import { ICandidateV2 } from "../interfaces/ICandidateV2.sol";
import { IOptimismSequencer } from "../interfaces/IOptimismSequencer.sol";

contract DAOv2CommitteeStorage {
    struct CandidateInfoV2 {
        uint32 sequencerIndex;
        uint32 candidateIndex;
        uint256 indexMembers;
        uint128 memberJoinedTime;
        uint128 rewardPeriod;
        uint128 claimedTimestamp;
    }

    ILayer2Manager public layer2Manager;
    ISeigManagerV2 public seigManagerV2;
    // address public seigManagerV2;
    ICandidateV2 public candidate;
    IOptimismSequencer public sequencer;

    address[] public candidatesV2;

    mapping(address => CandidateInfoV2) internal _candidateInfosV2;

    modifier validLayer2Manager() {
        require(address(layer2Manager) != address(0), "StorageStateCommittee: invalid Layer2Manager");
        _;
    }

    modifier validSeigManagerV2() {
        require(address(seigManagerV2) != address(0), "StorageStateCommittee: invalid SeigManagerV2");
        _;
    }
}