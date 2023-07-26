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
// import { IDAOAgendaManager } from "../interfaces/IDAOAgendaManager.sol";
import { LibAgenda } from "../lib/Agenda.sol";
import { ERC165Checker } from "../../node_modules/@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";

import { ILayer2Manager } from "../interfaces/ILayer2Manager.sol";
import { ISeigManagerV2 } from "../interfaces/ISeigManagerV2.sol";
import { ICandidateV2 } from "../interfaces/ICandidateV2.sol";
import { IOptimismSequencer } from "../interfaces/IOptimismSequencer.sol";

import { BaseProxyStorageV2 } from "../proxy/BaseProxyStorageV2.sol";

import "hardhat/console.sol";

interface IStaking {
    function balanceOfLton(uint32 _index) external view returns (uint256 amount) ;
    function balanceOfLton(uint32 _index, address account) external view returns (uint256 amount);
}

interface IStakeManagerV2 {
    function updateStake1Rate(uint256 _rate) external;
    function claimStakerV2(address to, uint256 value) external;  
    function claimOperator(address to, uint256 value) external;
}

contract DAOv2CommitteeV2 is
    StorageStateCommittee,
    AccessControl,
    BaseProxyStorageV2,
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

    // event AgendaCreated(
    //     address indexed from,
    //     uint256 indexed id,
    //     address[] targets,
    //     uint128 noticePeriodSeconds,
    //     uint128 votingPeriodSeconds,
    //     bool atomicExecute
    // );

    event AgendaVoteCasted(
        address indexed from,
        uint256 indexed id,
        uint256 voting,
        string comment
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
    // V2 Owner

    /// @notice Set SeigManagerV2 contract address
    /// @param _seigManagerV2 New SeigManagerV2 contract address
    function setSeigManagerV2(address _seigManagerV2) external onlyOwner nonZero(_seigManagerV2) {
        seigManagerV2 = ISeigManagerV2(_seigManagerV2);
    }

    /// @notice Set Layer2Manager contract address
    /// @param _layer2Manager New Layer2Manager contract address
    function setLayer2Manager(address _layer2Manager) external onlyOwner nonZero(_layer2Manager) {
        layer2Manager = _layer2Manager;
        // layer2Manager = ILayer2Manager(_layer2Manager);
    }

    function setCandidates(address _candidate) external onlyOwner nonZero(_candidate) {
        candidate = _candidate;
    }

    function setOptimismSequencer(address _sequencer) external onlyOwner nonZero(_sequencer) {
        sequencer = _sequencer;
    }

    function setStakeManagerV2(address _stakeManagerV2) external onlyOwner nonZero(_stakeManagerV2) {
        stakeManagerV2 = _stakeManagerV2;
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

    //////////////////////////////////////////////////////////////////////
    // only StakeMangerV2
    function updateStake1Rate(
        uint256 _rate
    ) 
        external
        onlyStakeManagerV2
    {
        IStakeManagerV2(stakeManagerV2).updateStake1Rate(_rate);
    }

    function claimStakerV2(
        address to,
        uint256 value
    )
        external
        onlyStakeManagerV2
    {
        IStakeManagerV2(stakeManagerV2).claimStakerV2(to,value);
    }
    
    function claimOperator(
        address to,
        uint256 value
    )
        external
        onlyStakeManagerV2
    {
        IStakeManagerV2(stakeManagerV2).claimOperator(to,value);
    }

    //////////////////////////////////////////////////////////////////////
    // Managing members

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
        require(!isExistCandidateV2(senderAddress,_sequencerIndex), "DAO: AR");

        _candidateInfosV2[senderAddress][_sequencerIndex] = LibDaoV2.CandidateInfoV2({
            sequencerIndex: _sequencerIndex,
            candidateIndex: _candidateIndex,
            memberJoinedTime: 0,
            indexMembers: 0,
            rewardPeriod: 0,
            claimedTimestamp: 0
        });
        console.log("senderAddress :", senderAddress);
        console.log("_candidateIndex :", _candidateIndex);


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
        require(!isExistCandidateV2(senderAddress,_sequencerIndex), "DAO: AR");

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
    /// @param _sequencerIndex V2의 candidate의 sequencerIndex로 0이면 V1멤버이고 1이상이면 V2멤버이다.
    /// @return Whether or not the execution succeeded
    function changeMember(
        uint256 _memberIndex,
        uint32 _sequencerIndex
    ) 
        external
        validMemberIndex(_memberIndex)
        returns (bool)
    {   
        //candidateIndex가 0이면 시퀀서로 등록된 것이다.
        //요청한 msg.sender는 V1이나 V2의 candidate여야한다.
        /*
            V1, V2 멤버 혼용
            V2멤버는 시퀀서와 candidate가 있다.
            1. 뉴멤버가 V1멤버일때
                1-1. 이전멤버가 V1일때
                1-2. 이전멤버가 V2의 시퀀서 일때
                1-3. 이전멤버가 V2의 candidate일때
            2. 뉴멤버가 V2멤버일때
                2-1. 이전멤버가 V1일때
                2-2. 이전멤버가 V2의 시퀀서 일때
                2-3. 이전멤버가 V2의 candidate일때
        */
        uint8 checkSender = isCandidateV2(msg.sender,_sequencerIndex);
        console.log("checkSender :", checkSender);
        address newMember;
        address prevMember;
        address compareAddr;
        uint32 compareIndex;
        if(checkSender == 0){
            //newMember가 V1일때
            newMember = ICandidate(msg.sender).candidate();
            CandidateInfo storage candidateInfo = _candidateInfos[newMember];
            require(
                ICandidate(msg.sender).isCandidateContract(),
                "DAO: NC"
            );
            require(
                candidateInfo.candidateContract == msg.sender,
                "DAO: IC"
            );
            require(
                candidateInfo.memberJoinedTime == 0,
                "DAO: AM"
            );
            candidateInfo.memberJoinedTime = uint128(block.timestamp);
            candidateInfo.indexMembers = _memberIndex;

            prevMember = members[_memberIndex];
            uint32 preSqIndex = seqIndex[_memberIndex];
            seqIndex[_memberIndex] = 0;

            if (prevMember == address(0)) {
                members[_memberIndex] = newMember;
                emit ChangedMember(_memberIndex, prevMember, newMember);
                return true;
            }

            uint8 checkPreMember = isCandidateV2(prevMember, preSqIndex);
            if(checkPreMember == 0) {
                //V1끼리 비교
                address prevMemberContract = candidateContract(prevMember);
                require(
                    ICandidate(msg.sender).totalStaked() > ICandidate(prevMemberContract).totalStaked(),
                    "not enough amount"
                );
                CandidateInfo storage prevCandidateInfo = _candidateInfos[prevMember];
                prevCandidateInfo.indexMembers = 0;
                prevCandidateInfo.rewardPeriod = uint128(uint256(prevCandidateInfo.rewardPeriod).add(block.timestamp.sub(prevCandidateInfo.memberJoinedTime)));
                prevCandidateInfo.memberJoinedTime = 0;
            } else {
                LibDaoV2.CandidateInfoV2 storage prevCandidateInfo = _candidateInfosV2[prevMember][_sequencerIndex];
                if(checkPreMember == 1) {
                    //newMember는 V1, prevMember는 V2의 sequencerCandidate
                    compareAddr = sequencer;
                    compareIndex = prevCandidateInfo.sequencerIndex;
                    // require(
                    //     ICandidate(msg.sender).totalStaked() > IStaking(address(sequencer)).balanceOfLton(prevCandidateInfo.sequencerIndex,prevMember),
                    //     "not enough amount"
                    // );
                } else {
                    //newMember는 V1, prevMember는 V2의 candidate    
                    compareAddr = candidate;
                    compareIndex = prevCandidateInfo.candidateIndex;
                    // require(
                    //     ICandidate(msg.sender).totalStaked() > IStaking(address(candidate)).balanceOfLton(prevCandidateInfo.candidateIndex,prevMember),
                    //     "not enough amount"
                    // );
                }
                require(
                    ICandidate(msg.sender).totalStaked() > IStaking(address(compareAddr)).balanceOfLton(compareIndex,prevMember),
                    "not enough amount"
                );
                prevCandidateInfo.indexMembers = 0;
                prevCandidateInfo.rewardPeriod = uint128(uint256(prevCandidateInfo.rewardPeriod).add(block.timestamp.sub(prevCandidateInfo.memberJoinedTime)));
                prevCandidateInfo.memberJoinedTime = 0;
            }

        } else {
            //newMember가 V2일떄
            require(isExistCandidateV2(msg.sender,_sequencerIndex), "DAO: NC");
            newMember = msg.sender;

            LibDaoV2.CandidateInfoV2 storage candidateInfo = _candidateInfosV2[newMember][_sequencerIndex];
            require(
                candidateInfo.memberJoinedTime == 0,
                "DAO: AM"
            );
            candidateInfo.memberJoinedTime = uint128(block.timestamp);
            candidateInfo.indexMembers = _memberIndex;

            prevMember = members[_memberIndex];
            if (prevMember == address(0)) {
                seqIndex[_memberIndex] = _sequencerIndex;
                members[_memberIndex] = newMember;
                emit ChangedMember(_memberIndex, prevMember, newMember);
                return true;
            }
            uint32 preSqIndex = seqIndex[_memberIndex];
            console.log("preSqIndex :", preSqIndex);
            uint8 checkPreMember = isCandidateV2(prevMember, preSqIndex);
            console.log("checkPreMember :", checkPreMember);
            console.log("prevMember :", prevMember);
            if(checkSender == 1) {
                //newMebemr가 V2의 sequencer일때
                if (checkPreMember == 0) {
                    //prevMember가 V1일때
                    address prevMemberContract = candidateContract(prevMember);
                    // require(
                    //     IStaking(address(sequencer)).balanceOfLton(candidateInfo.sequencerIndex,newMember) > ICandidate(prevMemberContract).totalStaked(),
                    //     "not enough amount"
                    // );
                    require(
                        balanceOfOnSequencerV2(candidateInfo.sequencerIndex,newMember) > ICandidate(prevMemberContract).totalStaked(),
                        "not enough amount"
                    );
                    CandidateInfo storage prevCandidateInfo = _candidateInfos[prevMember];
                    prevCandidateInfo.indexMembers = 0;
                    prevCandidateInfo.rewardPeriod = uint128(uint256(prevCandidateInfo.rewardPeriod).add(block.timestamp.sub(prevCandidateInfo.memberJoinedTime)));
                    prevCandidateInfo.memberJoinedTime = 0;
                } else {
                    LibDaoV2.CandidateInfoV2 storage prevCandidateInfo = _candidateInfosV2[prevMember][preSqIndex];
                    console.log(prevCandidateInfo.candidateIndex);
                    if(checkPreMember == 1) {
                        //newMember는 V2의 sequencer, prevMember는 V2의 sequencerCandidate
                        console.log("sequencerV2");
                        compareAddr = sequencer;
                        compareIndex = prevCandidateInfo.sequencerIndex;    
                        // require(
                        //     IStaking(address(sequencer)).balanceOfLton(candidateInfo.sequencerIndex,newMember) > IStaking(address(sequencer)).balanceOfLton(prevCandidateInfo.sequencerIndex,prevMember),
                        //     "not enough amount"
                        // );
                    } else {
                        //newMember는 V2의 sequencer, prevMember는 V2의 candidate    
                        console.log("candidateV2");
                        compareAddr = candidate;
                        compareIndex = prevCandidateInfo.candidateIndex;
                        // require(
                        //     IStaking(address(sequencer)).balanceOfLton(candidateInfo.sequencerIndex,newMember) > IStaking(address(candidate)).balanceOfLton(prevCandidateInfo.candidateIndex,prevMember),
                        //     "not enough amount"
                        // );
                    }
                    // require(
                    //     IStaking(address(sequencer)).balanceOfLton(candidateInfo.sequencerIndex,newMember) > IStaking(address(compareAddr)).balanceOfLton(compareIndex,prevMember),
                    //     "not enough amount"
                    // );
                    console.log("compareAddr :", compareAddr);
                    console.log("prevTON :", IStaking(address(compareAddr)).balanceOfLton(compareIndex,prevMember));
                    console.log("newTON :", IStaking(address(sequencer)).balanceOfLton(candidateInfo.sequencerIndex,newMember));
                    require(
                        IStaking(address(sequencer)).balanceOfLton(candidateInfo.sequencerIndex,newMember) > IStaking(address(compareAddr)).balanceOfLton(compareIndex,prevMember),
                        "not enough amount"
                    );
                    prevCandidateInfo.indexMembers = 0;
                    prevCandidateInfo.rewardPeriod = uint128(uint256(prevCandidateInfo.rewardPeriod).add(block.timestamp.sub(prevCandidateInfo.memberJoinedTime)));
                    prevCandidateInfo.memberJoinedTime = 0;
                }
            } else {
                //newMember가 V2의 candidate일떄
                if (checkPreMember == 0) {
                    //prevMember가 V1일때
                    address prevMemberContract = candidateContract(prevMember);
                    console.log("prevAddr :", prevMemberContract);
                    console.log("prevTON :", ICandidate(prevMemberContract).totalStaked());
                    console.log("newTON :", balanceOfOnCandidateV2(candidateInfo.candidateIndex,newMember));
                    // console.log("newTON :", IStaking(address(candidate)).balanceOfLton(candidateInfo.sequencerIndex,newMember));
                    // require(
                    //     IStaking(address(candidate)).balanceOfLton(candidateInfo.sequencerIndex,newMember) > ICandidate(prevMemberContract).totalStaked(),
                    //     "not enough amount"
                    // );
                    require(
                        balanceOfOnCandidateV2(candidateInfo.candidateIndex,newMember) > ICandidate(prevMemberContract).totalStaked(),
                        "not enough amount"
                    );
                    CandidateInfo storage prevCandidateInfo = _candidateInfos[prevMember];
                    prevCandidateInfo.indexMembers = 0;
                    prevCandidateInfo.rewardPeriod = uint128(uint256(prevCandidateInfo.rewardPeriod).add(block.timestamp.sub(prevCandidateInfo.memberJoinedTime)));
                    prevCandidateInfo.memberJoinedTime = 0;
                } else {
                    LibDaoV2.CandidateInfoV2 storage prevCandidateInfo = _candidateInfosV2[prevMember][_sequencerIndex];
                    if(checkPreMember == 1) {
                        //newMember는 V2의 sequencer, prevMember는 V2의 sequencerCandidate
                        compareAddr = sequencer;
                        compareIndex = prevCandidateInfo.sequencerIndex;  
                        // require(
                        //     IStaking(address(candidate)).balanceOfLton(candidateInfo.sequencerIndex,newMember) > IStaking(address(sequencer)).balanceOfLton(prevCandidateInfo.sequencerIndex,prevMember),
                        //     "not enough amount"
                        // );
                    } else {
                        //newMember는 V2의 sequencer, prevMember는 V2의 candidate    
                        compareAddr = candidate;
                        compareIndex = prevCandidateInfo.candidateIndex;
                        // require(
                        //     IStaking(address(candidate)).balanceOfLton(candidateInfo.sequencerIndex,newMember) > IStaking(address(candidate)).balanceOfLton(prevCandidateInfo.candidateIndex,prevMember),
                        //     "not enough amount"
                        // );
                    }
                    // require(
                    //     IStaking(address(candidate)).balanceOfLton(candidateInfo.sequencerIndex,newMember) > IStaking(address(compareAddr)).balanceOfLton(compareIndex,prevMember),
                    //     "not enough amount"
                    // );
                    require(
                        IStaking(address(candidate)).balanceOfLton(candidateInfo.sequencerIndex,newMember) > IStaking(address(compareAddr)).balanceOfLton(compareIndex,prevMember),
                        "not enough amount"
                    );
                    prevCandidateInfo.indexMembers = 0;
                    prevCandidateInfo.rewardPeriod = uint128(uint256(prevCandidateInfo.rewardPeriod).add(block.timestamp.sub(prevCandidateInfo.memberJoinedTime)));
                    prevCandidateInfo.memberJoinedTime = 0;
                }
            }
            seqIndex[_memberIndex] = _sequencerIndex;
        }
        members[_memberIndex] = newMember;

        emit ChangedMember(_memberIndex, prevMember, newMember);
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
    // V1 member라면 _index가 0이다.
    function retireMember(uint32 _index) onlyMemberV2(_index) external returns (bool) {
        // require((isExistCandidate(msg.sender) || isExistCandidateV2(msg.sender,_index)), "DAO: not registerd"); -> member검사해서 따로 안해도됨
        uint8 checkSender = isCandidateV2(msg.sender,_index);
        LibDaoV2.CandidateInfoV2 storage candidateInfo = _candidateInfosV2[msg.sender][_index];
        if(checkSender == 0) {
            //V1의 member이다.
            console.log("retire V1 member");
            address candidate = ICandidate(msg.sender).candidate();
            CandidateInfo storage candidateInfo = _candidateInfos[candidate];
            require(
                candidateInfo.candidateContract == msg.sender,
                "DAO: IC"
            );
        }

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

    /// @notice Claims the activity reward for member
    function claimActivityReward(address _receiver, uint32 _sqIndex) external {        
        uint256 amount;
        if(_sqIndex == 0) {
            amount = getClaimableActivityReward(msg.sender);
            require(amount > 0, "DAO: TZ");
            address candidate = ICandidate(msg.sender).candidate();
            CandidateInfo storage candidateInfo = _candidateInfos[candidate];
            require(
                candidateInfo.candidateContract == msg.sender,
                "DAO: not registerd"
            ); 

            candidateInfo.claimedTimestamp = uint128(block.timestamp);
            candidateInfo.rewardPeriod = 0;  
        } else {
            amount = getClaimableActivityRewardV2(msg.sender,_sqIndex);
            require(amount > 0, "DAO: TZ");
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

    //////////////////////////////////////////////////////////////////////
    // view

    function totalSupplyOnCandidateV2(
        uint32 _index
    )
        public
        view
        returns (uint256 amount)
    {
        return _toRAY(IStaking(address(candidate)).balanceOfLton(_index));
    }

    function totalSupplyOnSequencerV2(
        uint32 _index
    )
        public
        view
        returns (uint256 amount)
    {
        return _toRAY(IStaking(address(sequencer)).balanceOfLton(_index));
    }

    function balanceOfOnCandidateV2(
        uint32 _index,
        address _account
    )
        public
        view
        returns (uint256 amount)
    {
        return _toRAY(IStaking(address(candidate)).balanceOfLton(_index,_account));
    }

    function balanceOfOnSequencerV2(
        uint32 _index,
        address _account
    )
        public
        view
        returns (uint256 amount)
    {
        return _toRAY(IStaking(address(sequencer)).balanceOfLton(_index,_account));
    }


    // function candidatesLength() external view returns (uint256) {
    //     return candidates.length;
    // }

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

    function getClaimableActivityReward(address _candidate) public view returns (uint256) {
        CandidateInfo storage info = _candidateInfos[_candidate];
        uint256 period = info.rewardPeriod;

        if (info.memberJoinedTime > 0) {
            period = (info.memberJoinedTime > info.claimedTimestamp) ? period.add(block.timestamp.sub(info.memberJoinedTime)) : period.add(block.timestamp.sub(info.claimedTimestamp));
        }

        return period.mul(activityRewardPerSecond);
    }

    function getClaimableActivityRewardV2(address _candidate, uint32 _sqIndex) public view returns (uint256) {
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

    function _toRAY(uint256 v) internal pure returns (uint256) {
        return v * 10 ** 9;
    }
}