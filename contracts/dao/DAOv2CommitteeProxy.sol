// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./StorageStateCommittee.sol";
import "../proxy/BaseProxy.sol";

import { ERC165Storage } from "@openzeppelin/contracts/utils/introspection/ERC165Storage.sol";

contract DAOv2CommitteeProxy is 
    StorageStateCommittee,
    BaseProxy,
    ERC165Storage
{
    constructor() {
        bytes4 OnApproveSelector= bytes4(keccak256("onApprove(address,address,uint256,bytes)"));

        _registerInterface(OnApproveSelector);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC165Storage, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function initialize(
        address _ton,
        address _seigManager,
        address _layer2Manager,
        address _agendaManager,
        address _candidateFactory,
        address _daoVault
    ) external onlyProxyOwner {
        require(
            _ton != address(0)
            || _seigManager != address(0)
            || _layer2Manager != address(0)
            || _agendaManager != address(0)
            || _candidateFactory != address(0),
            "DAOv2CommitteeProxy: input is zero"
        );
        ton = _ton;
        seigManager = ISeigManager(_seigManager);
        layer2Registry = ILayer2Manager(_layer2Manager);
        agendaManager = IDAOAgendaManager(_agendaManager);
        candidateFactory = ICandidateFactory(_candidateFactory);
        daoVault = IDAOVault(_daoVault);
        quorum = 2;
        activityRewardPerSecond = 3170979198376458;

        _setupRole(DEFAULT_ADMIN_ROLE, address(this));
    }

}
