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

}