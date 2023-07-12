// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
pragma abicoder v2;

// import "@openzeppelin/contracts/access/AccessControl.sol";
import "../AccessControl/AccessControl.sol";
import "./StorageStateCommittee.sol";
import "./StorageStateCommitteeV2.sol";


import { SafeMath } from "@openzeppelin/contracts/utils/math/SafeMath.sol";
import { IERC20 } from  "../../node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ILayer2 } from "../interfaces/ILayer2.sol";

import { LibAgenda } from "../lib/Agenda.sol";
import { ERC165Checker } from "../../node_modules/@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";

import { ILayer2Manager } from "../interfaces/ILayer2Manager.sol";
import { ISeigManagerV2 } from "../interfaces/ISeigManagerV2.sol";
import { ICandidateV2 } from "../interfaces/ICandidateV2.sol";
import { IOptimismSequencer } from "../interfaces/IOptimismSequencer.sol";

import {BaseProxyStorageV2} from "../proxy/BaseProxyStorageV2.sol";

import "hardhat/console.sol";

contract DAOv2CommitteeV1 is
    StorageStateCommittee,
    AccessControl,
    BaseProxyStorageV2,
    StorageStateCommitteeV2
{
    using SafeMath for uint256;
    using LibAgenda for *;

    modifier onlyOwner() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "DAO: NA");
        _;
    }

    modifier validMemberIndex(uint256 _index) {
        require(_index < maxMember, "DAO: VI");
        _;
    }

    modifier nonZero(address _addr) {
        require(_addr != address(0), "DAO: ZA");
        _;
    }

    /// @notice Set SeigManager contract address
    /// @param _seigManager New SeigManager contract address
    function setSeigManager(address _seigManager) external onlyOwner nonZero(_seigManager) {
        seigManager = ISeigManager(_seigManager);
    }

    /// @notice Set SeigManager contract address on candidate contracts
    /// @param _candidateContracts Candidate contracts to be set
    /// @param _seigManager New SeigManager contract address
    function setCandidatesSeigManager(
        address[] calldata _candidateContracts,
        address _seigManager
    )
        external
        onlyOwner
        nonZero(_seigManager)
    {
        for (uint256 i = 0; i < _candidateContracts.length; i++) {
            ICandidate(_candidateContracts[i]).setSeigManager(_seigManager);
        }
    }

    /// @notice Set DAOCommitteeProxy contract address on candidate contracts
    /// @param _candidateContracts Candidate contracts to be set
    /// @param _committee New DAOCommitteeProxy contract address
    function setCandidatesCommittee(
        address[] calldata _candidateContracts,
        address _committee
    )
        external
        onlyOwner
        nonZero(_committee)
    {
        for (uint256 i = 0; i < _candidateContracts.length; i++) {
            ICandidate(_candidateContracts[i]).setCommittee(_committee);
        }
    }

    /// @notice Set DAOVault contract address
    /// @param _daoVault New DAOVault contract address
    function setDaoVault(address _daoVault) external onlyOwner nonZero(_daoVault) {
        daoVault = IDAOVault(_daoVault);
    }

    /// @notice Set Layer2Registry contract address
    /// @param _layer2Registry New Layer2Registry contract address
    function setLayer2Registry(address _layer2Registry) external onlyOwner nonZero(_layer2Registry) {
        layer2Registry = ILayer2Registry(_layer2Registry);
    }

    /// @notice Set CandidateFactory contract address
    /// @param _candidateFactory New CandidateFactory contract address
    function setCandidateFactory(address _candidateFactory) external onlyOwner nonZero(_candidateFactory) {
        candidateFactory = ICandidateFactory(_candidateFactory);
    }

    /// @notice Set DAOAgendaManager contract address
    /// @param _agendaManager New DAOAgendaManager contract address
    function setAgendaManager(address _agendaManager) external onlyOwner nonZero(_agendaManager) {
        agendaManager = IDAOAgendaManager(_agendaManager);
    }
}