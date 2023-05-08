// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
pragma abicoder v2;

// import { ICandidateFactory } from "../interfaces/ICandidateFactory.sol";
// import { ILayer2Registry } from "../interfaces/ILayer2Registry.sol";
// import { ISeigManager } from "../interfaces/ISeigManager.sol";
import { IDAOAgendaManager } from "../interfaces/IDAOAgendaManager.sol";
import { IDAOVault } from "../interfaces/IDAOVault.sol";

//new add
import { ILayer2Manager } from "../interfaces/ILayer2Manager.sol";
import { ISeigManagerV2 } from "../interfaces/ISeigManagerV2.sol";

interface IStorageStateCommittee {
    struct CandidateInfo {
        uint32 sequencerIndex;
        uint32 candidateIndex;
        uint256 indexMembers;
        uint128 memberJoinedTime;
        uint128 rewardPeriod;
        uint128 claimedTimestamp;
    }

    function ton() external returns (address);
    function daoVault() external returns (IDAOVault);
    function agendaManager() external returns (IDAOAgendaManager);
    function layer2Manager() external returns (ILayer2Manager);
    function seigManagerV2() external returns (ISeigManagerV2);
    function candidates(uint256 _index) external returns (address);
    function members(uint256 _index) external returns (address);
    function maxMember() external returns (uint256);
    function quorum() external returns (uint256);
    function activityRewardPerSecond() external returns (uint256);

    function isMember(address _candidate) external returns (bool);
    function candidateInfos(address _candidate) external returns (CandidateInfo memory);
    // function candidateContract(address _candidate) external returns (address);
}

