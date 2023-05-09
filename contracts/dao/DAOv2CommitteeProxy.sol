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
        address _seigManagerV2,
        address _layer2Manager,
        address _agendaManager,
        address _candidate,
        address _sequencer,
        address _daoVault
    ) external onlyProxyOwner {
        require(
            _ton != address(0)
            || _seigManagerV2 != address(0)
            || _layer2Manager != address(0)
            || _agendaManager != address(0)
            || _candidate != address(0)
            || _sequencer != address(0),
            "DAOv2CommitteeProxy: input is zero"
        );
        ton = _ton;
        seigManagerV2 = ISeigManagerV2(_seigManagerV2);
        layer2Manager = ILayer2Manager(_layer2Manager);
        agendaManager = IDAOAgendaManager(_agendaManager);
        candidate = ICandidate(_candidate);
        sequencer = IOptimismSequencer(_sequencer);
        daoVault = IDAOVault(_daoVault);
        quorum = 2;
        activityRewardPerSecond = 3170979198376458;

        _setupRole(DEFAULT_ADMIN_ROLE, address(this));
    }

}
