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
import { ILayer2 } from "../interfaces/ILayer2.sol";
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
        string newMemo
    );

    event ActivityRewardChanged(
        uint256 newReward
    );

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

    modifier onlyMemberV2(uint32 _index) {
        require(isMember(msg.sender) || isMemberV2(msg.sender, _index), "DAO: NM");
        _;
    }

    //////////////////////////////////////////////////////////////////////
    // V1 Owner

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

    //////////////////////////////////////////////////////////////////////
    // V2 Owner

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
        require(maxMember < _newMaxMember, "DAO: ME");
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
        require(_quorum > maxMember.div(2), "DAO: QE");
        require(_quorum <= maxMember, "DAO: ME");
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

    /// @notice Creates a candidate contract and register it on SeigManager
    /// @param _memo A memo for the candidate
    function createCandidate(string calldata _memo)
        external
        validSeigManager
        validLayer2Registry
        validCommitteeL2Factory
    {
        require(!isExistCandidate(msg.sender), "DAO: already registerd");

        // Candidate
        address candidateContract = candidateFactory.deploy(
            msg.sender,
            false,
            _memo,
            address(this),
            address(seigManager)
        );

        require(
            candidateContract != address(0),
            "DAO: CZ"
        );
        require(
            _candidateInfos[msg.sender].candidateContract == address(0),
            "DAOCommittee: The candidate already has contract"
        );
        require(
            layer2Registry.registerAndDeployCoinage(candidateContract, address(seigManager)),
            "DAOCommittee: failed to registerAndDeployCoinage"
        );

        _candidateInfos[msg.sender] = CandidateInfo({
            candidateContract: candidateContract,
            memberJoinedTime: 0,
            indexMembers: 0,
            rewardPeriod: 0,
            claimedTimestamp: 0
        });

        candidates.push(msg.sender);
       
        emit CandidateContractCreated(msg.sender, candidateContract, _memo);
    }

    /// @notice Registers the exist layer2 on DAO
    /// @param _layer2 Layer2 contract address to be registered
    /// @param _memo A memo for the candidate
    function registerLayer2Candidate(address _layer2, string memory _memo)
        external
        validSeigManager
        validLayer2Registry
        validCommitteeL2Factory
    {
        _registerLayer2Candidate(msg.sender, _layer2, _memo);
    }

    /// @notice Registers the exist layer2 on DAO by owner
    /// @param _operator Operator address of the layer2 contract
    /// @param _layer2 Layer2 contract address to be registered
    /// @param _memo A memo for the candidate
    function registerLayer2CandidateByOwner(address _operator, address _layer2, string memory _memo)
        external
        onlyOwner
        validSeigManager
        validLayer2Registry
        validCommitteeL2Factory
    {
        _registerLayer2Candidate(_operator, _layer2, _memo);
    }

    /// @notice Set memo
    /// @param _candidate candidate address
    /// @param _memo New memo on this candidate
    function setMemoOnCandidate(
        address _candidate,
        string calldata _memo
    )
        external
    {
        address candidateContract = candidateContract(_candidate);
        setMemoOnCandidateContract(candidateContract, _memo);
    }

    /// @notice Set memo
    /// @param _candidateContract candidate contract address
    /// @param _memo New memo on this candidate
    function setMemoOnCandidateContract(
        address _candidateContract,
        string calldata _memo
    )
        public
    {
        address candidate = ICandidate(_candidateContract).candidate();
        address contractOwner = candidate;
        if (ICandidate(_candidateContract).isLayer2Candidate()) {
            contractOwner = ILayer2(candidate).operator();
        }
        require(
            msg.sender == contractOwner,
            "DAO: sender is not candidate"
        );

        ICandidate(_candidateContract).setMemo(_memo);
        emit ChangedMemo(candidate, _memo);
    }

    function createCandidateV2(
        address senderAddress,
        uint32 _sequencerIndex,
        uint32 _candidateIndex
    )
        external
        validSeigManagerV2
        validLayer2Manager
        returns (uint256)
    {
        require(!isExistCandidateV2(senderAddress,_sequencerIndex), "DAO: already registerd");

        _candidateInfosV2[senderAddress][_sequencerIndex] = LibDaoV2.CandidateInfoV2({
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

    function createOptimismSequencer(
        address senderAddress,
        uint32 _sequencerIndex
    )
        external
        validSeigManagerV2
        validLayer2Manager
        returns (uint256)
    {
        require(!isExistCandidateV2(senderAddress,_sequencerIndex), "DAO: already registerd");

        _candidateInfosV2[senderAddress][_sequencerIndex] = LibDaoV2.CandidateInfoV2({
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
        uint256 _memberIndex,
        uint32 _sequencerIndex
    )
        external
        validMemberIndex(_memberIndex)
        returns (bool)
    {
        require(isExistCandidateV2(msg.sender,_sequencerIndex), "DAO: not registerd");
        address newMember = msg.sender;

        LibDaoV2.CandidateInfoV2 storage candidateInfo = _candidateInfosV2[newMember][_sequencerIndex];
        require(
            candidateInfo.memberJoinedTime == 0,
            "DAO: already member"
        );

        address prevMember = members[_memberIndex];
        // address prevMemberContract = candidateContract(prevMember);

        //
        candidateInfo.memberJoinedTime = uint128(block.timestamp);
        candidateInfo.indexMembers = _memberIndex;
        //만약 이전 멤버가 V2였다면 해당 멤버의sequencerIndex를 불러옴
        uint32 preSqIndex = sqMemberIndex[_memberIndex];
        

        members[_memberIndex] = newMember;
        //memberIndex에 sequencerIndex를 저장
        sqMemberIndex[_memberIndex] = _sequencerIndex;

        if (prevMember == address(0)) {
            emit ChangedMember(_memberIndex, prevMember, newMember);
            return true;
        }

        LibDaoV2.CandidateInfoV2 storage prevCandidateInfo = _candidateInfosV2[prevMember][_sequencerIndex];

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

    // function changeMember(
    //     uint256 _memberIndex
    // ) 
    //     external
    //     validMemberIndex(_memberIndex)
    //     returns (bool)
    // {
    //     //candidateIndex가 0이면 시퀀서로 등록된 것이다.
    //     //요청한 msg.sender는 V1이나 V2의 candidate여야한다.
    //     /*
    //         V1, V2 멤버 혼용
    //         V2멤버는 시퀀서와 candidate가 있다.
    //         1. 뉴멤버가 V1멤버일때
    //             1-1. 이전멤버가 V1일때
    //             1-2. 이전멤버가 V2의 시퀀서 일때
    //             1-3. 이전멤버가 V2의 candidate일때
    //         2. 뉴멤버가 V2멤버일때
    //             2-1. 이전멤버가 V1일때
    //     */

    // }

    /// @notice Call updateSeigniorage on SeigManager
    /// @param _candidate Candidate address to be updated
    /// @return Whether or not the execution succeeded
    function updateSeigniorage(address _candidate) public returns (bool) {
        address candidateContract = _candidateInfos[_candidate].candidateContract;
        return ICandidate(candidateContract).updateSeigniorage();
    }

    /// @notice Call updateSeigniorage on SeigManager
    /// @param _candidates Candidate addresses to be updated
    /// @return Whether or not the execution succeeded
    function updateSeigniorages(address[] calldata _candidates) external returns (bool) {
        for (uint256 i = 0; i < _candidates.length; i++) {
            require(
                updateSeigniorage(_candidates[i]),
                "DAOCommittee: failed to update seigniorage"
            );
        }

        return true;
    }

    /// @notice Call updateSeigniorage on SeigManagerV2
    /// @return Whether or not the execution succeeded
    function updateSeigniorageV2() public returns (bool) {
        return seigManagerV2.updateSeigniorage();
    }

    //////////////////////////////////////////////////////////////////////
    // member

    /// @notice Retires member
    /// @return Whether or not the execution succeeded
    function retireMember(uint32 _index) onlyMemberV2(_index) external returns (bool) {
        require((isExistCandidate(msg.sender) || isExistCandidateV2(msg.sender,_index)), "DAO: not registerd");
        // address candidate = ICandidate(msg.sender).candidate();
        LibDaoV2.CandidateInfoV2 storage candidateInfo = _candidateInfosV2[msg.sender][_index];
        require(
            candidateInfo.indexMembers != 0,
            "DAOCommittee: not member"
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
        string calldata _comment,
        uint32 _sqIndex
    )
        external
        validAgendaManager
    {
        require((isExistCandidate(msg.sender) || isExistCandidateV2(msg.sender,_sqIndex)), "DAO: not registerd");

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
            "DAO: can not execute the agenda"
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
                require(success, "DAO: Failed to agenda");
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
    function claimActivityReward(address _receiver, uint32 _sqIndex, bool _version) external {        
        uint256 amount;
        if(!_version) {
            amount = getClaimableActivityRewardV1(msg.sender);
            require(amount > 0, "DAO: claimable ton 0");
            address candidate = ICandidate(msg.sender).candidate();
            CandidateInfo storage candidateInfo = _candidateInfos[candidate];
            require(
                candidateInfo.candidateContract == msg.sender,
                "DAO: not registerd"
            ); 

            candidateInfo.claimedTimestamp = uint128(block.timestamp);
            candidateInfo.rewardPeriod = 0;  
        } else {
            amount = getClaimableActivityReward(msg.sender,_sqIndex);
            require(amount > 0, "DAO: claimable ton 0");
            require(isExistCandidateV2(msg.sender,_sqIndex), "DAO: not registerd");
            LibDaoV2.CandidateInfoV2 storage candidateInfoV2 = _candidateInfosV2[msg.sender][_sqIndex];    
            candidateInfoV2.claimedTimestamp = uint128(block.timestamp);
            candidateInfoV2.rewardPeriod = 0;
        }

        daoVault.claimTON(_receiver, amount);

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

    function _registerLayer2Candidate(address _operator, address _layer2, string memory _memo)
        internal
        validSeigManager
        validLayer2Registry
        validCommitteeL2Factory
    {
        require(!isExistCandidate(_layer2), "DAO: not registerd");

        require(
            _layer2 != address(0),
            "DAO: CZ"
        );
        require(
            _candidateInfos[_layer2].candidateContract == address(0),
            "DAO: already has contract"
        );
        ILayer2 layer2 = ILayer2(_layer2);
        require(
            layer2.isLayer2(),
            "DAO: invalid layer2"
        );
        require(
            layer2.operator() == _operator,
            "DAO: invalid operator"
        );

        address candidateContract = candidateFactory.deploy(
            _layer2,
            true,
            _memo,
            address(this),
            address(seigManager)
        );

        require(
            candidateContract != address(0),
            "DAO: CZ"
        );

        _candidateInfos[_layer2] = CandidateInfo({
            candidateContract: candidateContract,
            memberJoinedTime: 0,
            indexMembers: 0,
            rewardPeriod: 0,
            claimedTimestamp: 0
        });

        candidates.push(_layer2);
       
        emit Layer2Registered(_layer2, candidateContract, _memo);
    }
    

    //////////////////////////////////////////////////////////////////////
    // view

    function isCandidate(address _candidate) external view returns (bool) {
        CandidateInfo storage info = _candidateInfos[_candidate];

        if (info.candidateContract == address(0)) {
            return false;
        }

        bool supportIsCandidateContract = ERC165Checker.supportsInterface(
            info.candidateContract,
            ICandidate(info.candidateContract).isCandidateContract.selector
        );

        if (supportIsCandidateContract == false) {
            return false;
        }

        return ICandidate(info.candidateContract).isCandidateContract();
    }

    function totalSupplyOnCandidate(
        address _candidate
    )
        external
        view
        returns (uint256 totalsupply)
    {
        address candidateContract = candidateContract(_candidate);
        return totalSupplyOnCandidateContract(candidateContract);
    }

    function balanceOfOnCandidate(
        address _candidate,
        address _account
    )
        external
        view
        returns (uint256 amount)
    {
        address candidateContract = candidateContract(_candidate);
        return balanceOfOnCandidateContract(candidateContract, _account);
    }

        
    function totalSupplyOnCandidateContract(
        address _candidateContract
    )
        public
        view
        returns (uint256 totalsupply)
    {
        require(_candidateContract != address(0), "not a candidate");

        return ICandidate(_candidateContract).totalStaked();
    }

    function balanceOfOnCandidateContract(
        address _candidateContract,
        address _account
    )
        public
        view
        returns (uint256 amount)
    {
        require(_candidateContract != address(0), "not a candidate");

        return ICandidate(_candidateContract).stakedOf(_account);
    }

    function totalSupplyOnCandidateV2(
        uint32 _index
    )
        external
        view
        returns (uint256 amount)
    {
        return IStaking(address(candidate)).balanceOfLton(_index);
    }

    function totalSupplyOnSequencerV2(
        uint32 _index
    )
        external
        view
        returns (uint256 amount)
    {
        return IStaking(address(sequencer)).balanceOfLton(_index);
    }

    function balanceOfOnCandidateV2(
        uint32 _index,
        address _account
    )
        external
        view
        returns (uint256 amount)
    {
        return IStaking(address(candidate)).balanceOfLton(_index,_account);
    }

    function balanceOfOnSequencerV2(
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
        return candidates.length;
    }

    function candidatesLengthV2() external view returns (uint256) {
        return candidatesV2.length;
    }

    function isExistCandidate(address _candidate) public view returns (bool isExist) {
        return _candidateInfos[_candidate].candidateContract != address(0);
    }

    function isExistCandidateV2(address _candidate, uint32 _sqIndex) public view returns (bool isExist) {
        //sequencerIndex가 0이 아니면 candidate로 등록을 하였다는 의미
        return _candidateInfosV2[_candidate][_sqIndex].sequencerIndex != 0;
    }

    function getClaimableActivityReward(address _candidate, uint32 _sqIndex) public view returns (uint256) {
        LibDaoV2.CandidateInfoV2 storage info = _candidateInfosV2[_candidate][_sqIndex];    

        uint256 period = info.rewardPeriod;

        if (info.memberJoinedTime > 0) {
            period = (info.memberJoinedTime > info.claimedTimestamp) ? period.add(block.timestamp.sub(info.memberJoinedTime)) : period.add(block.timestamp.sub(info.claimedTimestamp));
            // if (info.memberJoinedTime > info.claimedTimestamp) {
            //     period = period.add(block.timestamp.sub(info.memberJoinedTime));
            // } else {
            //     period = period.add(block.timestamp.sub(info.claimedTimestamp));
            // }
        }

        return period.mul(activityRewardPerSecond);
    }

    function getClaimableActivityRewardV1(address _candidate) public view returns (uint256) {
        CandidateInfo storage info = _candidateInfos[_candidate];
        uint256 period = info.rewardPeriod;

        if (info.memberJoinedTime > 0) {
            period = (info.memberJoinedTime > info.claimedTimestamp) ? period.add(block.timestamp.sub(info.memberJoinedTime)) : period.add(block.timestamp.sub(info.claimedTimestamp));
            // if (info.memberJoinedTime > info.claimedTimestamp) {
            //     period = period.add(block.timestamp.sub(info.memberJoinedTime));
            // } else {
            //     period = period.add(block.timestamp.sub(info.claimedTimestamp));
            // }
        }

        return period.mul(activityRewardPerSecond);
    }
}