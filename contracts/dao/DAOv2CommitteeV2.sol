// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
pragma abicoder v2;

// import "@openzeppelin/contracts/access/AccessControl.sol";
import "../AccessControl/AccessControl.sol";
import "./StorageStateCommittee.sol";
import "./StorageStateCommitteeV2.sol";

// import { SafeMath } from "../AccessControl/SafeMath.sol";
// import { IERC20 } from  "../AccessControl/IERC20.sol";
import { SafeMath } from "@openzeppelin/contracts/utils/math/SafeMath.sol";
import { IERC20 } from  "../../node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol";
// import { IDAOCommittee } from "../interfaces/IDAOCommittee.sol";
// import { ICandidate } from "../interfaces/ICandidate.sol";
// import { ILayer2 } from "../interfaces/ILayer2.sol";
// import { IDAOAgendaManager } from "../interfaces/IDAOAgendaManager.sol";
import { LibAgenda } from "../lib/Agenda.sol";
import { ERC165Checker } from "../../node_modules/@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
// import { ERC165Checker } from "../AccessControl/ERC165Checker.sol";

import { ILayer2Manager } from "../interfaces/ILayer2Manager.sol";
import { ISeigManagerV2 } from "../interfaces/ISeigManagerV2.sol";
import { ICandidateV2 } from "../interfaces/ICandidateV2.sol";
import { IOptimismSequencer } from "../interfaces/IOptimismSequencer.sol";
// import { IDAOv2Committee } from "../interfaces/IDAOv2Committee.sol";
// import "../storages/DAOv2CommitteeStorage.sol";

import "hardhat/console.sol";

interface IStaking {
    function balanceOfLton(uint32 _index) external view returns (uint256 amount) ;
    function balanceOfLton(uint32 _index, address account) external view returns (uint256 amount);
}

contract DAOv2CommitteeV2 is
    StorageStateCommittee,
    AccessControl,
    StorageStateCommitteeV2
{
    using SafeMath for uint256;
    using LibAgenda for *;

    //////////////////////////////
    // Events
    //////////////////////////////

    event QuorumChanged(
        uint256 newQuorum
    );

    event AgendaCreated(
        address indexed from,
        uint256 indexed id,
        address[] targets,
        uint128 noticePeriodSeconds,
        uint128 votingPeriodSeconds,
        bool atomicExecute
    );

    event AgendaVoteCasted(
        address indexed from,
        uint256 indexed id,
        uint256 voting,
        string comment
    );

    event AgendaExecuted(
        uint256 indexed id,
        address[] target
    );

    event CandidateContractCreated(
        address indexed candidate,
        address indexed candidateContract,
        string memo
    );

    event Layer2Registered(
        address indexed candidate,
        address indexed candidateContract,
        string memo
    );

    event ChangedMember(
        uint256 indexed slotIndex,
        address prevMember,
        address indexed newMember
    );

    event ChangedSlotMaximum(
        uint256 indexed prevSlotMax,
        uint256 indexed slotMax
    );

    event ClaimedActivityReward(
        address indexed candidate,
        address receiver,
        uint256 amount
    );

    event ChangedMemo(
        address candidate,
        bytes32 newMemo
    );

    event ActivityRewardChanged(
        uint256 newReward
    );

    modifier onlyOwner() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "DAOCommitteeV2: msg.sender is not an admin");
        _;
    }

    modifier validMemberIndex(uint256 _index) {
        require(_index < maxMember, "DAOCommitteeV2: invalid member index");
        _;
    }

    modifier nonZero(address _addr) {
        require(_addr != address(0), "DAOCommitteeV2: zero address");
        _;
    }

    modifier onlyMemberV2() {
        require(isMember(msg.sender) || isMemberV2(msg.sender), "DAOCommitteeV2: not a member");
        _;
    }

    //////////////////////////////////////////////////////////////////////
    // setters

    /// @notice Set SeigManagerV2 contract address
    /// @param _seigManagerV2 New SeigManagerV2 contract address
    function setSeigManagerV2(address _seigManagerV2) external onlyOwner nonZero(_seigManagerV2) {
        seigManagerV2 = ISeigManagerV2(_seigManagerV2);
    }

    /// @notice Set DAOVault contract address
    /// @param _daoVault New DAOVault contract address
    function setDaoVault(address _daoVault) external onlyOwner nonZero(_daoVault) {
        daoVault = IDAOVault(_daoVault);
    }

    /// @notice Set Layer2Manager contract address
    /// @param _layer2Manager New Layer2Manager contract address
    function setLayer2Manager(address _layer2Manager) external onlyOwner nonZero(_layer2Manager) {
        layer2Manager = _layer2Manager;
        // layer2Manager = ILayer2Manager(_layer2Manager);
    }

    /// @notice Set DAOAgendaManager contract address
    /// @param _agendaManager New DAOAgendaManager contract address
    function setAgendaManager(address _agendaManager) external onlyOwner nonZero(_agendaManager) {
        agendaManager = IDAOAgendaManager(_agendaManager);
    }

    function setCandidates(address _candidate) external onlyOwner nonZero(_candidate) {
        candidate = ICandidateV2(_candidate);
    }

    function setOptimismSequencer(address _sequencer) external onlyOwner nonZero(_sequencer) {
        sequencer = IOptimismSequencer(_sequencer);
    }

    /// @notice Set TON contract address
    /// @param _ton New TON contract address
    function setTon(address _ton) external onlyOwner nonZero(_ton) {
        ton = _ton;
    }

    /// @notice Set activity reward amount
    /// @param _value New activity reward per second
    function setActivityRewardPerSecond(uint256 _value) external onlyOwner {
        activityRewardPerSecond = _value;
        emit ActivityRewardChanged(_value);
    }

    /// @notice Increases the number of member slot
    /// @param _newMaxMember New number of member slot
    /// @param _quorum New quorum
    function increaseMaxMember(
        uint256 _newMaxMember,
        uint256 _quorum
    )
        external
        onlyOwner
    {
        require(maxMember < _newMaxMember, "DAOCommittee: You have to call decreaseMaxMember to decrease");
        uint256 prevMaxMember = maxMember;
        maxMember = _newMaxMember;
        fillMemberSlot();
        setQuorum(_quorum);
        emit ChangedSlotMaximum(prevMaxMember, _newMaxMember);
    }

    /// @notice Decreases the number of member slot
    /// @param _reducingMemberIndex Reducing member slot index
    /// @param _quorum New quorum
    function decreaseMaxMember(
        uint256 _reducingMemberIndex,
        uint256 _quorum
    )
        external
        onlyOwner
        validMemberIndex(_reducingMemberIndex)
    {
        address reducingMember = members[_reducingMemberIndex];
        CandidateInfo storage reducingCandidate = _candidateInfos[reducingMember];

        if (_reducingMemberIndex != members.length - 1) {
            address tailMember = members[members.length - 1];
            CandidateInfo storage tailCandidate = _candidateInfos[tailMember];

            tailCandidate.indexMembers = _reducingMemberIndex;
            members[_reducingMemberIndex] = tailMember;
        }
        reducingCandidate.indexMembers = 0;
        reducingCandidate.rewardPeriod = uint128(uint256(reducingCandidate.rewardPeriod).add(block.timestamp.sub(reducingCandidate.memberJoinedTime)));
        reducingCandidate.memberJoinedTime = 0;

        members.pop();
        maxMember = maxMember.sub(1);
        setQuorum(_quorum);

        emit ChangedMember(_reducingMemberIndex, reducingMember, address(0));
        emit ChangedSlotMaximum(maxMember.add(1), maxMember);
    }

    /// @notice Set new quorum
    /// @param _quorum New quorum
    function setQuorum(
        uint256 _quorum
    )
        public
        onlyOwner
        validAgendaManager
    {
        require(_quorum > maxMember.div(2), "DAOCommittee: invalid quorum");
        require(_quorum <= maxMember, "DAOCommittee: quorum exceed max member");
        quorum = _quorum;
        emit QuorumChanged(quorum);
    }

    /// @notice Set fee amount of creating an agenda
    /// @param _fees Fee amount on TON
    function setCreateAgendaFees(
        uint256 _fees
    )
        external
        onlyOwner
        validAgendaManager
    {
        agendaManager.setCreateAgendaFees(_fees);
    }

    /// @notice Set the minimum notice period
    /// @param _minimumNoticePeriod New minimum notice period in second
    function setMinimumNoticePeriodSeconds(
        uint256 _minimumNoticePeriod
    )
        external
        onlyOwner
        validAgendaManager
    {
        agendaManager.setMinimumNoticePeriodSeconds(_minimumNoticePeriod);
    }

    /// @notice Set the minimum voting period
    /// @param _minimumVotingPeriod New minimum voting period in second
    function setMinimumVotingPeriodSeconds(
        uint256 _minimumVotingPeriod
    )
        external
        onlyOwner
        validAgendaManager
    {
        agendaManager.setMinimumVotingPeriodSeconds(_minimumVotingPeriod);
    }

    /// @notice Set the executing period
    /// @param _executingPeriodSeconds New executing period in second
    function setExecutingPeriodSeconds(
        uint256 _executingPeriodSeconds
    )
        external
        onlyOwner
        validAgendaManager
    {
        agendaManager.setExecutingPeriodSeconds(_executingPeriodSeconds);
    }

    /// @notice Set status and result of specific agenda
    /// @param _agendaID Agenda ID
    /// @param _status New status
    /// @param _result New result
    function setAgendaStatus(uint256 _agendaID, uint256 _status, uint256 _result) external onlyOwner {
        agendaManager.setResult(_agendaID, LibAgenda.AgendaResult(_result));
        agendaManager.setStatus(_agendaID, LibAgenda.AgendaStatus(_status));
    }

    //////////////////////////////////////////////////////////////////////
    // Managing members

    // function createCandidate(
    //     uint32 _sequencerIndex,
    //     bytes32 _name,
    //     uint16 _commission,
    //     uint256 amount
    // )
    //     external
    //     validSeigManagerV2
    //     validLayer2Manager
    //     returns (bool)
    // {
    //     require(!isExistCandidate(msg.sender), "DAOCommittee: candidate already registerd");
    //     // require(layer2Manager.existedLayer2Index(_sequencerIndex) == true, "wrong index");

    //     //msg.sender는 Layer2Manager에게 미리 amount만큼 approve해야한다
    //     (bool success, bytes memory data) = address(layer2Manager).delegatecall(
    //         abi.encodeWithSignature(
    //             "createCandidate(uint32,bytes32,uint16,uint256)",
    //             _sequencerIndex,_name,_commission,amount
    //         )
    //     );

    //     //layer2Manager에서 indexCandidates는 로직에서 더하고 값을 넣으므로 index값은 같다.
    //     uint32 candidateIndex = toUint32(data,0);
    //     console.log(candidateIndex);

    //     _candidateInfosV2[msg.sender] = LibDaoV2.CandidateInfoV2({
    //         sequencerIndex: _sequencerIndex,
    //         candidateIndex: candidateIndex,
    //         memberJoinedTime: 0,
    //         indexMembers: 0,
    //         rewardPeriod: 0,
    //         claimedTimestamp: 0
    //     });

    //     candidatesV2.push(msg.sender);

    //     return success;
    // }

    function createCandidate(
        address senderAddress,
        uint32 _sequencerIndex,
        uint32 _candidateIndex
    )
        external
        validSeigManagerV2
        validLayer2Manager
        returns (uint256)
    {
        require(!isExistCandidate(senderAddress), "DAOCommittee: candidate already registerd");

        _candidateInfosV2[senderAddress] = LibDaoV2.CandidateInfoV2({
            sequencerIndex: _sequencerIndex,
            candidateIndex: _candidateIndex,
            memberJoinedTime: 0,
            indexMembers: 0,
            rewardPeriod: 0,
            claimedTimestamp: 0
        });

        candidatesV2.push(senderAddress);

        return candidatesV2.length;
    }

    // function createOptimismSequencer(
    //     bytes32 _name,
    //     address addressManager,
    //     address l1Bridge,
    //     address l2Bridge,
    //     address l2ton,
    //     uint256 amount
    // )
    //     external
    //     validSeigManagerV2
    //     validLayer2Manager
    //     returns (bool)
    // {
    //     require(!isExistCandidate(msg.sender), "DAOCommitteeV2: candidate already registerd");

    //     //msg.sender는 Layer2Manager에게 미리 amount만큼 approve해야한다
    //     (bool success, bytes memory data) = layer2Manager.delegatecall(
    //         abi.encodeWithSignature(
    //             "createOptimismSequencer(bytes32,address,address,address,address,uint256)",
    //             _name,addressManager,l1Bridge,l2Bridge,l2ton,amount
    //         )
    //     );
    //     console.log(success);
    //     require(success,"DAOCommitteeV2: sequencer fail");
    //     uint32 sequencerIndex = toUint32(data,0);
    //     console.log(sequencerIndex);

    //     _candidateInfosV2[msg.sender] = LibDaoV2.CandidateInfoV2({
    //         sequencerIndex: sequencerIndex,
    //         candidateIndex: 0,
    //         memberJoinedTime: 0,
    //         indexMembers: 0,
    //         rewardPeriod: 0,
    //         claimedTimestamp: 0
    //     });

    //     candidatesV2.push(msg.sender);

    //     return success;
    // }

    function createOptimismSequencer(
        address senderAddress,
        uint32 _sequencerIndex
    )
        external
        validSeigManagerV2
        validLayer2Manager
        returns (uint256)
    {
        require(!isExistCandidate(senderAddress), "DAOCommitteeV2: candidate already registerd");

        _candidateInfosV2[senderAddress] = LibDaoV2.CandidateInfoV2({
            sequencerIndex: _sequencerIndex,
            candidateIndex: 0,
            memberJoinedTime: 0,
            indexMembers: 0,
            rewardPeriod: 0,
            claimedTimestamp: 0
        });

        candidatesV2.push(senderAddress);

        return candidatesV2.length;
    }

    /// @notice Replaces an existing member
    /// @param _memberIndex The member slot index to be replaced
    /// @return Whether or not the execution succeeded
    function changeMember(
        uint256 _memberIndex
    )
        external
        validMemberIndex(_memberIndex)
        returns (bool)
    {
        require(isExistCandidate(msg.sender), "DAOCommitteeV2: not registerd");
        address newMember = msg.sender;

        LibDaoV2.CandidateInfoV2 storage candidateInfo = _candidateInfosV2[newMember];
        require(
            candidateInfo.memberJoinedTime == 0,
            "DAOCommitteeV2: already member"
        );

        address prevMember = members[_memberIndex];
        // address prevMemberContract = candidateContract(prevMember);

        candidateInfo.memberJoinedTime = uint128(block.timestamp);
        candidateInfo.indexMembers = _memberIndex;

        members[_memberIndex] = newMember;

        if (prevMember == address(0)) {
            emit ChangedMember(_memberIndex, prevMember, newMember);
            return true;
        }

        LibDaoV2.CandidateInfoV2 storage prevCandidateInfo = _candidateInfosV2[prevMember];

        //candidateIndex가 0이면 시퀀서로 등록된 것이다.
        /*
            1. 뉴멤버가 시퀀서일때
                1-1. 이전 멤버도 시퀀서일때 (시퀀서끼리 비교)
                1-2. 이전 멤버는 candidate일때 (시퀀서 vs candidate)
            2. 뉴멤버가 candidate일때
                2-1. 이전 멤버는 시퀀서일때 (candidate vs 시퀀서)
                2-2. 이전 멤버도 candidate일때 (candidate끼리 비교)
        */
        if (candidateInfo.candidateIndex == 0) {
            if(prevCandidateInfo.candidateIndex == 0) {
                require(
                    IStaking(address(sequencer)).balanceOfLton(candidateInfo.sequencerIndex,newMember) > IStaking(address(sequencer)).balanceOfLton(prevCandidateInfo.sequencerIndex,prevMember),
                    "not enough amount"
                );
            } else {
                require(
                    IStaking(address(sequencer)).balanceOfLton(candidateInfo.sequencerIndex,newMember) > IStaking(address(candidate)).balanceOfLton(prevCandidateInfo.candidateIndex,prevMember),
                    "not enough amount"
                );
            }
        } else {
            if(prevCandidateInfo.candidateIndex == 0) {
                require(
                    IStaking(address(candidate)).balanceOfLton(candidateInfo.candidateIndex,newMember) > IStaking(address(sequencer)).balanceOfLton(prevCandidateInfo.sequencerIndex,prevMember),
                    "not enough amount"
                );
            } else {
                require(
                    IStaking(address(candidate)).balanceOfLton(candidateInfo.candidateIndex,newMember) > IStaking(address(candidate)).balanceOfLton(prevCandidateInfo.candidateIndex,prevMember),
                    "not enough amount"
                );
            }
        }

        prevCandidateInfo.indexMembers = 0;
        prevCandidateInfo.rewardPeriod = uint128(uint256(prevCandidateInfo.rewardPeriod).add(block.timestamp.sub(prevCandidateInfo.memberJoinedTime)));
        prevCandidateInfo.memberJoinedTime = 0;

        emit ChangedMember(_memberIndex, prevMember, newMember);

        return true;
    }

    function setNameOnRegistrant(
        bytes32 _name
    )
        external
    {
        require(isExistCandidate(msg.sender), "DAOCommittee: not registerd");
        //msg.sender가 sequencer인지 candidate인지 알기 위해서 소환
        LibDaoV2.CandidateInfoV2 memory candidateInfo = _candidateInfosV2[msg.sender];
        if(candidateInfo.candidateIndex == 0) {
            //msg.sender가 sqeuencer일때 name 변경
        } else {
            //msg.sender가 candidate일때 name 변경
        }

        emit ChangedMemo(msg.sender, _name);
    }

    /// @notice Call updateSeigniorage on SeigManager
    /// @return Whether or not the execution succeeded
    function updateSeigniorage() public returns (bool) {
        return seigManagerV2.updateSeigniorage();
    }

    //////////////////////////////////////////////////////////////////////
    // member

    /// @notice Retires member
    /// @return Whether or not the execution succeeded
    function retireMember() onlyMemberV2 external returns (bool) {
        require(isExistCandidate(msg.sender), "DAOCommittee: not registerd");
        // address candidate = ICandidate(msg.sender).candidate();
        LibDaoV2.CandidateInfoV2 storage candidateInfo = _candidateInfosV2[msg.sender];
        require(
            candidateInfo.indexMembers != 0,
            "DAOCommittee: already not member"
        );

        members[candidateInfo.indexMembers] = address(0);
        candidateInfo.rewardPeriod = uint128(uint256(candidateInfo.rewardPeriod).add(block.timestamp.sub(candidateInfo.memberJoinedTime)));
        candidateInfo.memberJoinedTime = 0;

        uint256 prevIndex = candidateInfo.indexMembers;
        candidateInfo.indexMembers = 0;
        emit ChangedMember(prevIndex, msg.sender, address(0));

        return true;
    }

    //////////////////////////////////////////////////////////////////////
    // Managing agenda

    function onApprove(
        address owner,
        address,
        uint256,
        bytes calldata data
    ) external returns (bool) {
        LibDaoV2.AgendaCreatingData memory agendaData = _decodeAgendaData(data);

        _createAgenda(
            owner,
            agendaData.target,
            agendaData.noticePeriodSeconds,
            agendaData.votingPeriodSeconds,
            agendaData.atomicExecute,
            agendaData.functionBytecode
        );

        return true;
    }

    /// @notice Vote on an agenda
    /// @param _agendaID The agenda ID
    /// @param _vote voting type
    /// @param _comment voting comment
    function castVote(
        uint256 _agendaID,
        uint256 _vote,
        string calldata _comment
    )
        external
        validAgendaManager
    {
        require(isExistCandidate(msg.sender), "DAOCommitteeV2: not registerd");
        // CandidateInfo storage candidateInfo = _candidateInfos[msg.sender];

        agendaManager.castVote(
            _agendaID,
            msg.sender,
            _vote
        );

        (uint256 yes, uint256 no, uint256 abstain) = agendaManager.getVotingCount(_agendaID);

        if (quorum <= yes) {
            // yes
            agendaManager.setResult(_agendaID, LibAgenda.AgendaResult.ACCEPT);
            agendaManager.setStatus(_agendaID, LibAgenda.AgendaStatus.WAITING_EXEC);
        } else if (quorum <= no) {
            // no
            agendaManager.setResult(_agendaID, LibAgenda.AgendaResult.REJECT);
            agendaManager.setStatus(_agendaID, LibAgenda.AgendaStatus.ENDED);
        } else if (quorum <= abstain.add(no)) {
            // dismiss
            agendaManager.setResult(_agendaID, LibAgenda.AgendaResult.DISMISS);
            agendaManager.setStatus(_agendaID, LibAgenda.AgendaStatus.ENDED);
        }

        emit AgendaVoteCasted(msg.sender, _agendaID, _vote, _comment);
    }

    /// @notice Set the agenda status as ended(denied or dismissed)
    /// @param _agendaID Agenda ID
    function endAgendaVoting(uint256 _agendaID) external {
        agendaManager.endAgendaVoting(_agendaID);
    }

    /// @notice Execute the accepted agenda
    /// @param _agendaID Agenda ID
    function executeAgenda(uint256 _agendaID) external validAgendaManager {
        require(
            agendaManager.canExecuteAgenda(_agendaID),
            "DAOCommittee: can not execute the agenda"
        );

         (address[] memory target,
             bytes[] memory functionBytecode,
             bool atomicExecute,
             uint256 executeStartFrom
         ) = agendaManager.getExecutionInfo(_agendaID);

        if (atomicExecute) {
            agendaManager.setExecutedAgenda(_agendaID);
            for (uint256 i = 0; i < target.length; i++) {
                (bool success, ) = address(target[i]).call(functionBytecode[i]);
                require(success, "DAOCommittee: Failed to execute the agenda");
            }
        } else {
            uint256 succeeded = 0;
            for (uint256 i = executeStartFrom; i < target.length; i++) {
                bool success = _call(target[i], functionBytecode[i].length, functionBytecode[i]);
                if (success) {
                    succeeded = succeeded.add(1);
                } else {
                    break;
                }
            }

            agendaManager.setExecutedCount(_agendaID, succeeded);
            if (executeStartFrom.add(succeeded) == target.length) {
                agendaManager.setExecutedAgenda(_agendaID);
            }
        }

        emit AgendaExecuted(_agendaID, target);
    }

    /// @notice Claims the activity reward for member
    function claimActivityReward(address _receiver) external {
        require(isExistCandidate(msg.sender), "DAOCommittee: not registerd");
        //msg.sender가 sequencer인지 candidate인지 알기 위해서 소환
        LibDaoV2.CandidateInfoV2 memory candidateInfo = _candidateInfosV2[msg.sender];

        // address candidate = ICandidate(msg.sender).candidate();
        // CandidateInfo storage candidateInfo = _candidateInfos[candidate];
        // require(
        //     candidateInfo.candidateContract == msg.sender,
        //     "DAOCommittee: invalid candidate contract"
        // );

        uint256 amount = getClaimableActivityReward(msg.sender);
        // console.log("amount : ", amount);
        require(amount > 0, "DAOCommittee: you don't have claimable ton");

        daoVault.claimTON(_receiver, amount);
        candidateInfo.claimedTimestamp = uint128(block.timestamp);
        candidateInfo.rewardPeriod = 0;

        emit ClaimedActivityReward(msg.sender, _receiver, amount);
    }

    //////////////////////////////////////////////////////////////////////
    // internal

    function fillMemberSlot() internal {
        for (uint256 i = members.length; i < maxMember; i++) {
            members.push(address(0));
        }
    }

    function _decodeAgendaData(bytes calldata input)
        internal
        pure
        returns (LibDaoV2.AgendaCreatingData memory data)
    {
        (data.target, data.noticePeriodSeconds, data.votingPeriodSeconds, data.atomicExecute, data.functionBytecode) =
            abi.decode(input, (address[], uint128, uint128, bool, bytes[]));
    }

    function payCreatingAgendaFee(address _creator) internal {
        uint256 fee = agendaManager.createAgendaFees();

        require(IERC20(ton).transferFrom(_creator, address(this), fee), "DAOCommittee: failed to transfer ton from creator");
        require(IERC20(ton).transfer(address(1), fee), "DAOCommittee: failed to burn");
    }

    function _createAgenda(
        address _creator,
        address[] memory _targets,
        uint128 _noticePeriodSeconds,
        uint128 _votingPeriodSeconds,
        bool _atomicExecute,
        bytes[] memory _functionBytecodes
    )
        internal
        validAgendaManager
        returns (uint256)
    {
        // pay to create agenda, burn ton.
        payCreatingAgendaFee(_creator);

        uint256 agendaID = agendaManager.newAgenda(
            _targets,
            _noticePeriodSeconds,
            _votingPeriodSeconds,
            _atomicExecute,
            _functionBytecodes
        );

        emit AgendaCreated(
            _creator,
            agendaID,
            _targets,
            _noticePeriodSeconds,
            _votingPeriodSeconds,
            _atomicExecute
        );

        return agendaID;
    }

    function _call(address target, uint256 paramLength, bytes memory param) internal returns (bool) {
        bool result;
        assembly {
            let data := add(param, 32)
            result := call(sub(gas(), 40000), target, 0, data, paramLength, 0, 0)
        }

        return result;
    }

    function callTest(address target, uint256 paramLength, bytes memory param) external pure returns (bytes memory) {
        bytes memory data;
        assembly {
            data := add(param, 32)
        }
        return data;
    }
    

    //////////////////////////////////////////////////////////////////////
    // view

    function isCandidate(address _candidate) external view returns (bool) {
        // CandidateInfo memory info = _candidateInfos[msg.sender];
        return _candidateInfosV2[_candidate].sequencerIndex != 0;
    }

    function totalSupplyOnCandidate(
        uint32 _index
    )
        external
        view
        returns (uint256 amount)
    {
        return IStaking(address(candidate)).balanceOfLton(_index);
    }

    function totalSupplyOnSequencer(
        uint32 _index
    )
        external
        view
        returns (uint256 amount)
    {
        return IStaking(address(sequencer)).balanceOfLton(_index);
    }

    function balanceOfOnCandidate(
        uint32 _index,
        address _account
    )
        external
        view
        returns (uint256 amount)
    {
        return IStaking(address(candidate)).balanceOfLton(_index,_account);
    }

    function balanceOfOnSequencer(
        uint32 _index,
        address _account
    )
        external
        view
        returns (uint256 amount)
    {
        return IStaking(address(sequencer)).balanceOfLton(_index,_account);
    }

    function candidatesLength() external view returns (uint256) {
        return candidatesV2.length;
    }

    function isExistCandidate(address _candidate) public view returns (bool isExist) {
        //sequencerIndex가 0이 아니면 candidate로 등록을 하였다는 의미
        return _candidateInfosV2[_candidate].sequencerIndex != 0;
    }

    function getClaimableActivityReward(address _candidate) public view returns (uint256) {
        LibDaoV2.CandidateInfoV2 storage info = _candidateInfosV2[_candidate];
        uint256 period = info.rewardPeriod;

        if (info.memberJoinedTime > 0) {
            if (info.memberJoinedTime > info.claimedTimestamp) {
                period = period.add(block.timestamp.sub(info.memberJoinedTime));
            } else {
                period = period.add(block.timestamp.sub(info.claimedTimestamp));
            }
        }

        // console.log("period : ", period);
        return period.mul(activityRewardPerSecond);
    }

    function toUint32(bytes memory _bytes, uint256 _start) internal pure returns (uint16) {
        require(_start + 4 >= _start, 'toUint16_overflow');
        require(_bytes.length >= _start + 4, 'toUint16_outOfBounds');
        uint16 tempUint;

        assembly {
            tempUint := mload(add(add(_bytes, 0x4), _start))
        }

        return tempUint;
    }
}