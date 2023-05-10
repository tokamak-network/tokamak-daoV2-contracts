// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
pragma abicoder v2;

import { IDAOAgendaManager } from "../interfaces/IDAOAgendaManager.sol";
import { IDAOVault } from "../interfaces/IDAOVault.sol";
import { ILayer2Manager } from "../interfaces/ILayer2Manager.sol";
import { ISeigManagerV2 } from "../interfaces/ISeigManagerV2.sol";

import { IStorageStateCommittee } from "../interfaces/IStorageStateCommittee.sol";
import { ICandidate } from "../interfaces/ICandidate.sol";
import { IOptimismSequencer } from "../interfaces/IOptimismSequencer.sol";

contract StorageStateCommittee is IStorageStateCommittee {
    enum AgendaStatus { NONE, NOTICE, VOTING, EXEC, ENDED, PENDING, RISK }
    enum AgendaResult { UNDEFINED, ACCEPT, REJECT, DISMISS }

    address public override ton;
    IDAOVault public override daoVault;
    IDAOAgendaManager public override agendaManager;
    ILayer2Manager public override layer2Manager;
    ISeigManagerV2 public override seigManagerV2;

    ICandidate public candidate;
    IOptimismSequencer public sequencer;

    address[] public override candidates;
    address[] public override members;
    uint256 public override maxMember;

    // candidate EOA => candidate information
    mapping(address => CandidateInfo) internal _candidateInfos;
    uint256 public override quorum;

    uint256 public override activityRewardPerSecond;

    modifier validAgendaManager() {
        require(address(agendaManager) != address(0), "StorageStateCommittee: AgendaManager is zero");
        _;
    }

    modifier validLayer2Manager() {
        require(address(layer2Manager) != address(0), "StorageStateCommittee: invalid Layer2Manager");
        _;
    }

    modifier validSeigManagerV2() {
        require(address(seigManagerV2) != address(0), "StorageStateCommittee: invalid SeigManagerV2");
        _;
    }

    modifier onlyMember() {
        require(isMember(msg.sender), "StorageStateCommittee: not a member");
        _;
    }
    
    function isMember(address _candidate) public view override returns (bool) {
        return _candidateInfos[_candidate].memberJoinedTime > 0;
    }

    function candidateInfos(address _candidate) external view override returns (CandidateInfo memory) {
        return _candidateInfos[_candidate];
    }
}
