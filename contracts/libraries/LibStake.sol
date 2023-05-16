// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.7.6;

library LibStake
{
    struct StakeInfo {
        uint256 stakePrincipal;
        uint256 stakelton;
        bool stake;
    }

    struct WithdrawalReqeust {
        uint32 withdrawableBlockNumber;
        uint128 amount;
        bool processed;
    }

}