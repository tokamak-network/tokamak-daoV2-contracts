import { expect } from './shared/expect'
import { ethers, network } from 'hardhat'

import { Signer } from 'ethers'
import {daostakingV2Fixtures, getLayerKey} from './shared/fixtures'
import { DAOStakingV2Fixture } from './shared/fixtureInterfaces'
import snapshotGasCost from './shared/snapshotGasCost'

import DAOv1CommitteProxy_ABI from '../abi/DAOCommitteeProxy.json'
import DAOv2Committee_ABI from '../artifacts/contracts/dao/DAOv2Committee.sol/DAOv2Committee.json'
import DAOv2CommitteeV2_ABI from '../artifacts/contracts/dao/DAOv2CommitteeV2.sol/DAOv2CommitteeV2.json'

import { time } from "@nomicfoundation/hardhat-network-helpers";

const Web3EthAbi = require('web3-eth-abi');
const { padLeft } = require('web3-utils');


const { 
    AGENDA_INDEX_CREATED_TIMESTAMP,
    AGENDA_INDEX_NOTICE_END_TIMESTAMP,
    AGENDA_INDEX_VOTING_PERIOD_IN_SECONDS,
    AGENDA_INDEX_VOTING_STARTED_TIMESTAMP,
    AGENDA_INDEX_VOTING_END_TIMESTAMP,
    AGENDA_INDEX_EXECUTABLE_LIMIT_TIMESTAMP,
    AGENDA_INDEX_EXECUTED_TIMESTAMP,
    AGENDA_INDEX_COUNTING_YES,
    AGENDA_INDEX_COUNTING_NO,
    AGENDA_INDEX_COUNTING_ABSTAIN,
    AGENDA_INDEX_STATUS,
    AGENDA_INDEX_RESULT,
    AGENDA_INDEX_EXECUTED,
    AGENDA_STATUS_NONE,
    AGENDA_STATUS_NOTICE,
    AGENDA_STATUS_VOTING,
    AGENDA_STATUS_WAITING_EXEC,
    AGENDA_STATUS_EXECUTED,
    AGENDA_STATUS_ENDED,
    VOTE_ABSTAIN,
    VOTE_YES,
    VOTE_NO,
    AGENDA_RESULT_PENDING,
    AGENDA_RESULT_ACCEPTED,
    AGENDA_RESULT_REJECTED,
    AGENDA_RESULT_DISMISSED,
    VOTER_INFO_ISVOTER,
    VOTER_INFO_HAS_VOTED,
    VOTER_INFO_VOTE
  } = require('./shared/constants');

// DAOProxy(기존 것)
// DAOv2Committe(새로배포) 
// DAOVault(메인넷에 있는 것 사용)
// DAOAgendaManager(메인넷에 있는 것 사용)는 메인넷 Contract에서 Owner를 변경하는 방식으로 사용
// 기존 Proxy에 새로운 V2로직을 연동하여서 V2에 대한 새로운 DAO를 테스트
describe('DAOv2Committee', () => {
    let deployer: Signer, addr1: Signer, sequencer1: Signer, daoPrivateOwner: Signer

    // let candidate1: Signer, candidate2: Signer, candidate3: Signer
    let candidate1: any, candidate2: any, candidate3: any, candidate4:any
    let candidates: Signer[] = [];

    let deployed: DAOStakingV2Fixture
    
    let daoCommitteProxyAddress = "0xDD9f0cCc044B0781289Ee318e5971b0139602C26"; //DAOCommitteProxy Address
    let daoAdminAddress = "0xb4983da083a5118c903910db4f5a480b1d9f3687"
    let daoCommitteV1Address = "0xd1A3fDDCCD09ceBcFCc7845dDba666B7B8e6D1fb";
    let tonAddress = "0x2be5e8c109e2197D077D13A82dAead6a9b3433C5";
    let daoValutAddress = "0x2520CD65BAa2cEEe9E6Ad6EBD3F45490C42dd303";
    let agendaMangerAddress = "0xcD4421d082752f363E1687544a09d5112cD4f484";
    let seigMangerAddress = "0x710936500aC59e8551331871Cbad3D33d5e0D909";
    let layer2RegistryAddress = "0x0b3E174A2170083e770D5d4Cf56774D221b7063e";
    let addr0 = "0x0000000000000000000000000000000000000000"

    let DAOProxy: any
    let DAOProxyLogicV2: any
    let DAOOwner: any
    
    let daoAdmin: Signer

    let agendaID: any
    let beforeAgendaID: any

    const votesList = [
        {
          "votes": [VOTE_ABSTAIN, VOTE_ABSTAIN, VOTE_ABSTAIN],
          "expected_result": AGENDA_RESULT_DISMISSED,
          "expected_status": AGENDA_STATUS_ENDED
        }, {
          "votes": [VOTE_ABSTAIN, VOTE_YES, VOTE_YES],
          "expected_result": AGENDA_RESULT_ACCEPTED,
          "expected_status": AGENDA_STATUS_WAITING_EXEC
        }, {
          "votes": [VOTE_ABSTAIN, VOTE_YES, VOTE_NO],
          "expected_result": AGENDA_RESULT_DISMISSED,
          "expected_status": AGENDA_STATUS_ENDED
        }, {
          "votes": [VOTE_ABSTAIN, VOTE_NO, VOTE_ABSTAIN],
          "expected_result": AGENDA_RESULT_DISMISSED,
          "expected_status": AGENDA_STATUS_ENDED
        }, {
          "votes": [VOTE_YES, VOTE_YES, VOTE_ABSTAIN],
          "expected_result": AGENDA_RESULT_ACCEPTED,
          "expected_status": AGENDA_STATUS_WAITING_EXEC
        }, {
          "votes": [VOTE_YES, VOTE_NO, VOTE_NO],
          "expected_result": AGENDA_RESULT_REJECTED,
          "expected_status": AGENDA_STATUS_ENDED
        }, {
          "votes": [VOTE_NO, VOTE_NO, VOTE_ABSTAIN],
          "expected_result": AGENDA_RESULT_REJECTED,
          "expected_status": AGENDA_STATUS_ENDED
        }
      ]

    //mainnet
    let seigManagerInfo = {
        ton: "0x2be5e8c109e2197D077D13A82dAead6a9b3433C5",
        wton: "0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2",
        tot: "0x6FC20Ca22E67aAb397Adb977F092245525f7AeEf",
        seigManagerV1: "0x710936500aC59e8551331871Cbad3D33d5e0D909",
        layer2Manager: "",
        seigPerBlock: ethers.BigNumber.from("3920000000000000000"),
        minimumBlocksForUpdateSeig: 300,
        ratesTonStakers: 4000,
        ratesDao: 5000,
        ratesStosHolders: 1000,
        ratesUnits: 10000
    }

    let rates = {
        ratesDao: 5000,           // 0.5 , 0.002 %
        ratesStosHolders: 2000,  // 0.2
        ratesTonStakers: 3000,   // 0.3
        ratesUnits: 10000
    }

    let layer2ManagerInfo = {
        minimumDepositForSequencer: ethers.utils.parseEther("100"),
        minimumDepositForCandidate: ethers.utils.parseEther("200"),
        delayBlocksForWithdraw: 300,
        ratioSecurityDepositOfTvl: 2000
    }

    let daoAgendaInfo = {
        agendaFee: ethers.utils.parseEther("100"),
        agendaFee2: ethers.utils.parseEther("200"),
        minimumNoticePeriodSeconds: 100,
        minimumVotingPeriodSeconds: 100,
        executingPeriodSeconds: 200
    }

    let candidateInfo = {
        tonAmount1: ethers.utils.parseEther("200"),
        tonAmount2: ethers.utils.parseEther("300"),
        tonAmount3: ethers.utils.parseEther("400"),
        tonAmount4: ethers.utils.parseEther("100"),
    }

    let sequencerInfo = {
        tonAmount1: ethers.utils.parseEther("300")
    }

    async function isVoter(_agendaID: any, voter: any) {
        const agenda = await deployed.daoagendaManager.agendas(_agendaID);
        // console.log("voter :", voter);
        if (agenda[AGENDA_INDEX_STATUS] == AGENDA_STATUS_NOTICE) {
            // console.log("true or false1 : ",await DAOProxyLogicV2.isMemberV2(voter));
            return (await DAOProxyLogicV2.isMemberV2(voter));
        } else {
            // console.log("true or false2 : ",await deployed.daoagendaManager.isVoter(_agendaID, voter))
            return (await deployed.daoagendaManager.isVoter(_agendaID, voter));
        }
    }

    async function castVote(_agendaID: any, voter: any, _vote: any) {
        const agenda1 = await deployed.daoagendaManager.agendas(_agendaID);
        const beforeCountingYes = agenda1[AGENDA_INDEX_COUNTING_YES];
        const beforeCountingNo = agenda1[AGENDA_INDEX_COUNTING_NO];
        const beforeCountingAbstain = agenda1[AGENDA_INDEX_COUNTING_ABSTAIN];

        expect(await isVoter(_agendaID, voter.address)).to.be.equal(true);
        await expect(DAOProxyLogicV2.connect(voter).endAgendaVoting(_agendaID)).to.be.reverted;
        // await DAOProxyLogicV2.castVote(_agendaID, _vote, "test comment", {from: voter});
        await DAOProxyLogicV2.connect(voter).castVote(_agendaID, _vote, "test comment");

        const voterInfo2 = await deployed.daoagendaManager.voterInfos(_agendaID, voter.address);
        expect(voterInfo2[VOTER_INFO_ISVOTER]).to.be.equal(true);
        expect(voterInfo2[VOTER_INFO_HAS_VOTED]).to.be.equal(true);
        expect(voterInfo2[VOTER_INFO_VOTE]).to.be.equal(_vote);

        const agenda2 = await deployed.daoagendaManager.agendas(_agendaID);
        expect(agenda2[AGENDA_INDEX_COUNTING_YES]).to.be.equal((Number(beforeCountingYes)+(_vote === VOTE_YES ? 1 : 0)));
        expect(agenda2[AGENDA_INDEX_COUNTING_NO]).to.be.equal(Number(beforeCountingNo)+(_vote === VOTE_NO ? 1 : 0));
        expect(agenda2[AGENDA_INDEX_COUNTING_ABSTAIN]).to.be.equal(Number(beforeCountingAbstain)+(_vote === VOTE_ABSTAIN ? 1 : 0));

        const result = await deployed.daoagendaManager.getVoteStatus(_agendaID, voter.address);
        expect(result[0]).to.be.equal(true);
        expect(result[1]).to.be.equal(_vote);
    } 
    

    async function castVote2(_agendaID: any, voter: any, _vote: any) {
        const agenda1 = await deployed.daoagendaManager.agendas(_agendaID);
        const beforeCountingYes = agenda1[AGENDA_INDEX_COUNTING_YES];
        const beforeCountingNo = agenda1[AGENDA_INDEX_COUNTING_NO];
        const beforeCountingAbstain = agenda1[AGENDA_INDEX_COUNTING_ABSTAIN];

        const voterInfo2 = await deployed.daoagendaManager.voterInfos(_agendaID, voter);
        expect(voterInfo2[VOTER_INFO_ISVOTER]).to.be.equal(true);
        expect(voterInfo2[VOTER_INFO_HAS_VOTED]).to.be.equal(true);
        expect(voterInfo2[VOTER_INFO_VOTE]).to.be.equal(_vote);

        const agenda2 = await deployed.daoagendaManager.agendas(_agendaID);
        expect(agenda2[AGENDA_INDEX_COUNTING_YES]).to.be.equal((Number(beforeCountingYes)+(_vote === VOTE_YES ? 1 : 0)));
        expect(agenda2[AGENDA_INDEX_COUNTING_NO]).to.be.equal(Number(beforeCountingNo)+(_vote === VOTE_NO ? 1 : 0));
        expect(agenda2[AGENDA_INDEX_COUNTING_ABSTAIN]).to.be.equal(Number(beforeCountingAbstain)+(_vote === VOTE_ABSTAIN ? 1 : 0));

        const result = await deployed.daoagendaManager.getVoteStatus(_agendaID, voter);
        expect(result[0]).to.be.equal(true);
        expect(result[1]).to.be.equal(_vote);
    }

    before('create fixture loader', async () => {
        deployed = await daostakingV2Fixtures()
        deployer = deployed.deployer;
        addr1 = deployed.addr1;
        sequencer1 = deployed.sequencer1;
        daoPrivateOwner = deployed.daoPrivateOwner;
        
        candidate1 = deployed.candidate1;
        candidate2 = deployed.candidate2;
        candidate3 = deployed.candidate3;
        candidate4 = deployed.daoPrivateOwner;
        candidates.push(sequencer1)
        candidates.push(candidate2)
        candidates.push(candidate3)
        console.log("sequencer1.address : ", sequencer1.address)
        console.log("candidate1.address : ", candidate1.address)
        console.log("candidate2.address : ", candidate2.address)
        console.log("candidate3.address : ", candidate3.address)

        daoAdmin = await ethers.getSigner(daoAdminAddress)
        await ethers.provider.send("hardhat_impersonateAccount",[daoAdminAddress]);
        await ethers.provider.send("hardhat_setBalance", [
            daoAdminAddress,
            "0x8ac7230489e80000",
        ]);

    })

    describe("#0. setting DAOProxy and daov2Committe", () => {
        it("connect DAOProxy", async () => {
            DAOProxy = await ethers.getContractAt(DAOv1CommitteProxy_ABI.abi, daoCommitteProxyAddress, deployer)
        })

        it("DAOProxy upgradeTo logicV2", async () => {
            await ethers.provider.send("hardhat_impersonateAccount",[daoCommitteProxyAddress]);
            DAOOwner = await ethers.getSigner(daoCommitteProxyAddress);
            await DAOProxy.connect(DAOOwner).upgradeTo(deployed.daov2committeeV2.address);
            expect(await DAOProxy.implementation()).to.be.eq(deployed.daov2committeeV2.address);
            // console.log("DAO logicV2 Address :",deployed.daov2committeeV2.address);
            // console.log("logic upgradeTo : ",await DAOProxy.implementation());
        })

        it("connect DAOProxyLogicV2", async () => {
            DAOProxyLogicV2 = await ethers.getContractAt(DAOv2CommitteeV2_ABI.abi, daoCommitteProxyAddress, deployer); 
        })
    })

    describe("#1. SeigManagerV2 set", () => {
        describe("#1-1. initialize", () => {
            it("initialize can be excuted by owner", async () => {
                await deployed.seigManagerV2Proxy.connect(deployer).initialize(
                        seigManagerInfo.ton,
                        seigManagerInfo.wton,
                        seigManagerInfo.tot,
                        [
                            seigManagerInfo.seigManagerV1,
                            deployed.layer2ManagerProxy.address,
                            deployed.optimismSequencerProxy.address,
                            deployed.candidateProxy.address
                        ],
                        seigManagerInfo.seigPerBlock,
                        seigManagerInfo.minimumBlocksForUpdateSeig,
                        [
                            seigManagerInfo.ratesTonStakers,
                            seigManagerInfo.ratesDao,
                            seigManagerInfo.ratesStosHolders,
                            seigManagerInfo.ratesUnits,
                        ]
                );
                
    
                expect(await deployed.seigManagerV2Proxy.ton()).to.eq(seigManagerInfo.ton)
                expect(await deployed.seigManagerV2Proxy.wton()).to.eq(seigManagerInfo.wton)
                expect(await deployed.seigManagerV2Proxy.tot()).to.eq(seigManagerInfo.tot)
                expect(await deployed.seigManagerV2Proxy.seigManagerV1()).to.eq(seigManagerInfo.seigManagerV1)
                expect(await deployed.seigManagerV2Proxy.layer2Manager()).to.eq(deployed.layer2ManagerProxy.address)
                expect(await deployed.seigManagerV2Proxy.optimismSequencer()).to.eq(deployed.optimismSequencerProxy.address)
                expect(await deployed.seigManagerV2Proxy.candidate()).to.eq(deployed.candidateProxy.address)
    
                expect(await deployed.seigManagerV2Proxy.seigPerBlock()).to.eq(seigManagerInfo.seigPerBlock)
                expect(await deployed.seigManagerV2Proxy.minimumBlocksForUpdateSeig()).to.eq(seigManagerInfo.minimumBlocksForUpdateSeig)
            })
        })

        describe("#1-2. setSeigPerBlock", () => {
            it('setSeigPerBlock can be executed by only owner ', async () => {
                const seigPerBlock = ethers.BigNumber.from("3920000000000000001");
    
                await deployed.seigManagerV2.connect(deployer).setSeigPerBlock(seigPerBlock)
                
                expect(await deployed.seigManagerV2.seigPerBlock()).to.eq(seigPerBlock)
    
                await deployed.seigManagerV2.connect(deployer).setSeigPerBlock(seigManagerInfo.seigPerBlock)
                expect(await deployed.seigManagerV2.seigPerBlock()).to.eq(seigManagerInfo.seigPerBlock)
            })
        })

        describe("#1-3. setMinimumBlocksForUpdateSeig", () => {
            it('setMinimumBlocksForUpdateSeig can be executed by only owner ', async () => {
                const minimumBlocksForUpdateSeig = 100;
                await deployed.seigManagerV2.connect(deployer).setMinimumBlocksForUpdateSeig(minimumBlocksForUpdateSeig);
                
                expect(await deployed.seigManagerV2.minimumBlocksForUpdateSeig()).to.eq(minimumBlocksForUpdateSeig);
            })
        })

        describe("#1-4. setLastSeigBlock", () => {
            it('LastSeigBlock can be executed by only owner ', async () => {
                const block = await ethers.provider.getBlock('latest')
                await deployed.seigManagerV2.connect(deployer).setLastSeigBlock(block.number)
                expect(await deployed.seigManagerV2.lastSeigBlock()).to.eq(block.number)
    
                await expect(
                    deployed.seigManagerV2.connect(deployer).setLastSeigBlock(block.number)
                    ).to.be.revertedWith("same")
            })
        })

        describe("#1-5. setDividendRates", () => {
            it('setDividendRates can be executed by only owner ', async () => {
                await deployed.seigManagerV2.connect(deployer).setDividendRates(
                    rates.ratesDao,
                    rates.ratesStosHolders,
                    rates.ratesTonStakers,
                    rates.ratesUnits
                )
            
                expect(await deployed.seigManagerV2.ratesDao()).to.eq(rates.ratesDao)
                expect(await deployed.seigManagerV2.ratesStosHolders()).to.eq(rates.ratesStosHolders)
                expect(await deployed.seigManagerV2.ratesTonStakers()).to.eq(rates.ratesTonStakers)
                expect(await deployed.seigManagerV2.ratesUnits()).to.eq(rates.ratesUnits)
            })    
        })

        describe("#1-6. setAddress", () => {
            it('setAddress can be executed by only owner ', async () => {

                await deployed.seigManagerV2.connect(deployer).setAddress(
                    daoValutAddress,
                    deployed.stosDistribute.address
                )
            
                expect(await deployed.seigManagerV2.dao()).to.eq(daoValutAddress)
                expect(await deployed.seigManagerV2.stosDistribute()).to.eq(deployed.stosDistribute.address)
    
            })
        })
    })

    describe("#2. Layer2Manger set", () => {
        describe("#2-1. initialize", async () => {
            it('initialize can be executed by only owner', async () => {
                await deployed.layer2ManagerProxy.connect(deployer).initialize(
                    seigManagerInfo.ton,
                    deployed.seigManagerV2Proxy.address,
                    deployed.optimismSequencerProxy.address,
                    deployed.candidateProxy.address,
                    layer2ManagerInfo.minimumDepositForSequencer,
                    layer2ManagerInfo.minimumDepositForCandidate,
                    layer2ManagerInfo.delayBlocksForWithdraw
                )
    
                expect(await deployed.layer2ManagerProxy.ton()).to.eq(seigManagerInfo.ton)
                expect(await deployed.layer2ManagerProxy.seigManagerV2()).to.eq(deployed.seigManagerV2Proxy.address)
                expect(await deployed.layer2ManagerProxy.optimismSequencer()).to.eq(deployed.optimismSequencerProxy.address)
                expect(await deployed.layer2ManagerProxy.candidate()).to.eq(deployed.candidateProxy.address)
    
                expect(await deployed.layer2ManagerProxy.minimumDepositForSequencer()).to.eq(layer2ManagerInfo.minimumDepositForSequencer)
                expect(await deployed.layer2ManagerProxy.minimumDepositForCandidate()).to.eq(layer2ManagerInfo.minimumDepositForCandidate)
    
                expect(await deployed.layer2ManagerProxy.delayBlocksForWithdraw()).to.eq(layer2ManagerInfo.delayBlocksForWithdraw)
            })
        })

        describe("#2-2. setMaxLayer2Count", async () => {
            it('setMaxLayer2Count can be executed by only owner ', async () => {
                const maxLayer2Count = ethers.BigNumber.from("3");
                await deployed.layer2Manager.connect(deployer).setMaxLayer2Count(maxLayer2Count)
                expect(await deployed.layer2Manager.maxLayer2Count()).to.eq(maxLayer2Count)
            })
        })

        describe("#2-3. setMinimumDepositForSequencer", async () => {
            it('setMinimumDepositForSequencer can be executed by only owner ', async () => {
                const minimumDepositForSequencer = ethers.utils.parseEther("200");
                await deployed.layer2Manager.connect(deployer).setMinimumDepositForSequencer(minimumDepositForSequencer)
                expect(await deployed.layer2Manager.minimumDepositForSequencer()).to.eq(minimumDepositForSequencer)
    
                await deployed.layer2Manager.connect(deployer).setMinimumDepositForSequencer(layer2ManagerInfo.minimumDepositForSequencer)
                expect(await deployed.layer2Manager.minimumDepositForSequencer()).to.eq(layer2ManagerInfo.minimumDepositForSequencer)
            })
        })

        describe("#2-4. setRatioSecurityDepositOfTvl", async () => {
            it('setRatioSecurityDepositOfTvl can be executed by only owner ', async () => {
                const ratioSecurityDepositOfTvl = 1000;
                await deployed.layer2Manager.connect(deployer).setRatioSecurityDepositOfTvl(ratioSecurityDepositOfTvl)
                expect(await deployed.layer2Manager.ratioSecurityDepositOfTvl()).to.eq(ratioSecurityDepositOfTvl)
    
                await deployed.layer2Manager.connect(deployer).setRatioSecurityDepositOfTvl(layer2ManagerInfo.ratioSecurityDepositOfTvl)
                expect(await deployed.layer2Manager.ratioSecurityDepositOfTvl()).to.eq(layer2ManagerInfo.ratioSecurityDepositOfTvl)
            })
        })

        describe("#2-5. setMinimumDepositForCandidate", async () => {
            it('setMinimumDepositForSequencer can be executed by only owner ', async () => {
                const minimumDepositForCandidate = ethers.utils.parseEther("100");
                await deployed.layer2Manager.connect(deployer).setMinimumDepositForCandidate(minimumDepositForCandidate)
                expect(await deployed.layer2Manager.minimumDepositForCandidate()).to.eq(minimumDepositForCandidate)
    
                await deployed.layer2Manager.connect(deployer).setMinimumDepositForCandidate(layer2ManagerInfo.minimumDepositForCandidate)
                expect(await deployed.layer2Manager.minimumDepositForCandidate()).to.eq(layer2ManagerInfo.minimumDepositForCandidate)
            })
        })

        describe("#2-6. setDelayBlocksForWithdraw", async () => {
            it('setDelayBlocksForWithdraw can be executed by only owner ', async () => {
                const delayBlocksForWithdraw = ethers.BigNumber.from("100");
                await deployed.layer2Manager.connect(deployer).setDelayBlocksForWithdraw(delayBlocksForWithdraw)
                expect(await deployed.layer2Manager.delayBlocksForWithdraw()).to.eq(delayBlocksForWithdraw)
    
    
                await deployed.layer2Manager.connect(deployer).setDelayBlocksForWithdraw(layer2ManagerInfo.delayBlocksForWithdraw)
                expect(await deployed.layer2Manager.delayBlocksForWithdraw()).to.eq(layer2ManagerInfo.delayBlocksForWithdraw)
            })
        })

        describe("#2-7. setDAOCommittee", async () => {
            it('setDAOCommittee can be executed by only owner', async () => {
                await deployed.layer2Manager.connect(deployer).setDAOCommittee(DAOProxy.address)
                expect(await deployed.layer2Manager.DAOCommittee()).to.eq(DAOProxy.address)
            })
        })
    })

    describe("#3. OptimismSequencer set", () => {
        describe("#3-1. initialize", async () => {
            it('initialize can be executed by only owner', async () => {
                await deployed.optimismSequencerProxy.connect(deployer).initialize(
                    seigManagerInfo.ton,
                    deployed.seigManagerV2Proxy.address,
                    deployed.layer2ManagerProxy.address,
                    addr1.address
                )
    
                expect(await deployed.optimismSequencerProxy.ton()).to.eq(seigManagerInfo.ton)
                expect(await deployed.optimismSequencerProxy.seigManagerV2()).to.eq(deployed.seigManagerV2Proxy.address)
                expect(await deployed.optimismSequencerProxy.layer2Manager()).to.eq(deployed.layer2ManagerProxy.address)
            })
        })
    })

    describe("#4. Candidate set", () => {
        describe("#4-1. initialize", () => {
            it('initialize can be executed by only owner', async () => {
                await deployed.candidateProxy.connect(deployer).initialize(
                    seigManagerInfo.ton,
                    deployed.seigManagerV2Proxy.address,
                    deployed.layer2ManagerProxy.address,
                    addr1.address
                )

                expect(await deployed.candidateProxy.ton()).to.eq(seigManagerInfo.ton)
                expect(await deployed.candidateProxy.seigManagerV2()).to.eq(deployed.seigManagerV2Proxy.address)
                expect(await deployed.candidateProxy.layer2Manager()).to.eq(deployed.layer2ManagerProxy.address)
                expect(await deployed.candidateProxy.fwReceipt()).to.eq(addr1.address)
            })
        })
    })

    describe("#7. DAOv2Committee set", () => {
        describe("#7-0. Role Test", () => {
            it("hasRole", async () => {
                let tx = await DAOProxyLogicV2.connect(DAOOwner).hasRole(
                    "0x0000000000000000000000000000000000000000000000000000000000000000",
                    deployer.address
                )
                expect(tx).to.be.eq(false);
                let tx2 = await DAOProxyLogicV2.connect(DAOOwner).hasRole(
                    "0x0000000000000000000000000000000000000000000000000000000000000000",
                    DAOOwner.address
                )
                expect(tx2).to.be.eq(true);
            })
            it("grantRole can not by not owner", async () => {
                await expect(
                    DAOProxyLogicV2.connect(addr1).grantRole(
                        deployed.seigManagerV2Proxy.address,
                    )
                ).to.be.revertedWith("") 
            })

            it("grantRole can by only owner", async () => {
                await DAOProxyLogicV2.connect(daoAdmin).grantRole(
                    "0x0000000000000000000000000000000000000000000000000000000000000000",
                    deployer.address
                )
                expect(await DAOProxyLogicV2.connect(daoAdmin).hasRole(
                    "0x0000000000000000000000000000000000000000000000000000000000000000",
                    deployer.address
                )).to.be.eq(true)
            })

            it("DEFAULT_ADMIN_ROLE", async () => {
                let tx = await DAOProxyLogicV2.connect(DAOOwner).DEFAULT_ADMIN_ROLE()
                expect(tx).to.be.equal("0x0000000000000000000000000000000000000000000000000000000000000000")
            })

            it("revokeRole can not by owner", async () => {
                await expect(
                    DAOProxyLogicV2.connect(addr1).revokeRole(
                        deployed.seigManagerV2Proxy.address,
                    )
                ).to.be.revertedWith("") 
            })

            it("revokeRole can by only owner", async () => {
                await DAOProxyLogicV2.connect(daoAdmin).revokeRole(
                    "0x0000000000000000000000000000000000000000000000000000000000000000",
                    deployer.address
                )
                expect(await DAOProxyLogicV2.connect(daoAdmin).hasRole(
                    "0x0000000000000000000000000000000000000000000000000000000000000000",
                    deployer.address
                )).to.be.eq(false)
            })

        })

        describe("#7-1. initialize setting", () => {
            it("setSeigManagerV2 can not by not owner", async () => {
                await expect(
                    DAOProxyLogicV2.connect(addr1).setSeigManagerV2(
                        deployed.seigManagerV2Proxy.address,
                    )
                ).to.be.revertedWith("DAOCommitteeV2: msg.sender is not an admin") 
            })

            it("setSeigManagerV2 can by only owner", async () => {
                await DAOProxyLogicV2.connect(daoAdmin).setSeigManagerV2(
                    deployed.seigManagerV2Proxy.address,
                );
                expect(await DAOProxyLogicV2.ton()).to.be.eq(deployed.ton.address);
                expect(await DAOProxyLogicV2.seigManagerV2()).to.be.eq(deployed.seigManagerV2Proxy.address);
                expect(await DAOProxyLogicV2.daoVault()).to.be.eq(deployed.daovault.address);
                expect(await DAOProxyLogicV2.agendaManager()).to.be.eq(deployed.daoagendaManager.address);
                expect(await DAOProxyLogicV2.layer2Registry()).to.be.eq(layer2RegistryAddress);
                // console.log("layer2Manger : ",await DAOProxyLogicV2.layer2Manager());
                // console.log("candidate : ",await DAOProxyLogicV2.candidate());
                // console.log("sequencer : ",await DAOProxyLogicV2.sequencer());
                // console.log("pauseProxy : ",await DAOProxyLogicV2.pauseProxy());
            })

            it("setDaoVault can not by not owner", async () => {
                await expect(
                    DAOProxyLogicV2.connect(addr1).setDaoVault(
                        sequencer1.address,
                    )
                ).to.be.revertedWith("DAOCommitteeV2: msg.sender is not an admin") 
            })

            it("setDaoVault can by only owner", async () => {
                await DAOProxyLogicV2.connect(daoAdmin).setDaoVault(
                    sequencer1.address,
                );
                expect(await DAOProxyLogicV2.daoVault()).to.be.eq(sequencer1.address);
                await DAOProxyLogicV2.connect(daoAdmin).setDaoVault(
                    deployed.daovault.address,
                );
                expect(await DAOProxyLogicV2.daoVault()).to.be.eq(deployed.daovault.address);
            })

            it("setLayer2Manager can not by not owner", async () => {
                await expect(
                    DAOProxyLogicV2.connect(addr1).setLayer2Manager(
                        sequencer1.address,
                    )
                ).to.be.revertedWith("DAOCommitteeV2: msg.sender is not an admin") 
            })

            it("setLayer2Manager can by only owner", async () => {
                await DAOProxyLogicV2.connect(daoAdmin).setLayer2Manager(
                    deployed.layer2ManagerProxy.address,
                );
                expect(await DAOProxyLogicV2.layer2Manager()).to.be.eq(deployed.layer2ManagerProxy.address);
            })

            it("setAgendaManager can not by not owner", async () => {
                await expect(
                    DAOProxyLogicV2.connect(addr1).setAgendaManager(
                        sequencer1.address,
                    )
                ).to.be.revertedWith("DAOCommitteeV2: msg.sender is not an admin") 
            })

            it("setAgendaManager can by only owner", async () => {
                await DAOProxyLogicV2.connect(daoAdmin).setAgendaManager(
                    sequencer1.address,
                );
                expect(await DAOProxyLogicV2.agendaManager()).to.be.eq(sequencer1.address);
                await DAOProxyLogicV2.connect(daoAdmin).setAgendaManager(
                    deployed.daoagendaManager.address,
                );
                expect(await DAOProxyLogicV2.agendaManager()).to.be.eq(deployed.daoagendaManager.address);
            })

            it("setCandidates can not by not owner", async () => {
                await expect(
                    DAOProxyLogicV2.connect(addr1).setCandidates(
                        sequencer1.address
                    )
                ).to.be.revertedWith("DAOCommitteeV2: msg.sender is not an admin") 
            })

            it("setCandidates can by only owner", async () => {
                await DAOProxyLogicV2.connect(daoAdmin).setCandidates(
                    deployed.candidateProxy.address
                );
                expect(await DAOProxyLogicV2.candidate()).to.be.eq(deployed.candidateProxy.address);
                // expect(await deployed.daov2committeeProxy.candidate()).to.be.eq(deployed.candidateProxy.address);
                // expect(await deployed.daov2committeeProxy.sequencer()).to.be.eq(deployed.optimismSequencerProxy.address);
            })

            it("setOptimismSequencer can not by not owner", async () => {
                await expect(
                    DAOProxyLogicV2.connect(addr1).setOptimismSequencer(
                        sequencer1.address
                    )
                ).to.be.revertedWith("DAOCommitteeV2: msg.sender is not an admin") 
            })

            it("setOptimismSequencer can by only owner", async () => {
                await DAOProxyLogicV2.connect(daoAdmin).setOptimismSequencer(
                    deployed.optimismSequencerProxy.address
                );
                expect(await DAOProxyLogicV2.sequencer()).to.be.eq(deployed.optimismSequencerProxy.address);
            })

            it("setTon can not by not owner", async () => {
                await expect(
                    DAOProxyLogicV2.connect(addr1).setTon(
                        sequencer1.address
                    )
                ).to.be.revertedWith("DAOCommitteeV2: msg.sender is not an admin") 
            })

            it("setTon can by only owner", async () => {
                await DAOProxyLogicV2.connect(daoAdmin).setTon(
                    deployed.ton.address
                );
                expect(await DAOProxyLogicV2.ton()).to.be.eq(deployed.ton.address);
            })

            it("setActivityRewardPerSecond can not by not owner", async () => {
                await expect(
                    DAOProxyLogicV2.connect(addr1).setActivityRewardPerSecond(
                        123
                    )
                ).to.be.revertedWith("DAOCommitteeV2: msg.sender is not an admin") 
            })

            it("setActivityRewardPerSecond can by only owner", async () => {
                await DAOProxyLogicV2.connect(daoAdmin).setActivityRewardPerSecond(
                    123
                );
                expect(await DAOProxyLogicV2.activityRewardPerSecond()).to.be.eq(123);
                await DAOProxyLogicV2.connect(daoAdmin).setActivityRewardPerSecond(
                    31709791983764
                );
                expect(await DAOProxyLogicV2.activityRewardPerSecond()).to.be.eq(31709791983764);
            })
        })

        describe("#7-2. DAO Agenda Policy setting", () => {
            it("setQuorum can not by not owner", async () => {
                await expect(
                    DAOProxyLogicV2.connect(addr1).setQuorum(
                        3
                    )
                ).to.be.revertedWith("DAOCommitteeV2: msg.sender is not an admin") 
            })

            it("setQuorum can by only owner", async () => {
                await DAOProxyLogicV2.connect(daoAdmin).setQuorum(
                    3
                );
                expect(await DAOProxyLogicV2.quorum()).to.be.eq(3);

                await DAOProxyLogicV2.connect(daoAdmin).setQuorum(
                    2
                );
                expect(await DAOProxyLogicV2.quorum()).to.be.eq(2);
            })

            it("setCreateAgendaFees can not by not owner", async () => {
                await expect(
                    DAOProxyLogicV2.connect(addr1).setCreateAgendaFees(
                        daoAgendaInfo.agendaFee
                    )
                ).to.be.revertedWith("DAOCommitteeV2: msg.sender is not an admin") 
            })

            it("setCreateAgendaFees can by only owner", async () => {
                await DAOProxyLogicV2.connect(daoAdmin).setCreateAgendaFees(
                    daoAgendaInfo.agendaFee2
                );
                expect(await deployed.daoagendaManager.createAgendaFees()).to.be.eq(daoAgendaInfo.agendaFee2);

                await DAOProxyLogicV2.connect(daoAdmin).setCreateAgendaFees(
                    daoAgendaInfo.agendaFee
                );
                expect(await deployed.daoagendaManager.createAgendaFees()).to.be.eq(daoAgendaInfo.agendaFee);
            })

            it("setMinimumNoticePeriodSeconds can not by not owner", async () => {
                await expect(
                    DAOProxyLogicV2.connect(addr1).setMinimumNoticePeriodSeconds(
                        daoAgendaInfo.minimumNoticePeriodSeconds
                    )
                ).to.be.revertedWith("DAOCommitteeV2: msg.sender is not an admin") 
            })

            it("setMinimumNoticePeriodSeconds can by only owner", async () => {
                await DAOProxyLogicV2.connect(daoAdmin).setMinimumNoticePeriodSeconds(
                    daoAgendaInfo.minimumNoticePeriodSeconds
                );
                expect(await deployed.daoagendaManager.minimumNoticePeriodSeconds()).to.be.eq(daoAgendaInfo.minimumNoticePeriodSeconds)
            })

            it("setMinimumVotingPeriodSeconds can not by not owner", async () => {
                await expect(
                    DAOProxyLogicV2.connect(addr1).setMinimumVotingPeriodSeconds(
                        daoAgendaInfo.minimumVotingPeriodSeconds
                    )
                ).to.be.revertedWith("DAOCommitteeV2: msg.sender is not an admin") 
            })

            it("setMinimumVotingPeriodSeconds can by only owner", async () => {
                await DAOProxyLogicV2.connect(daoAdmin).setMinimumVotingPeriodSeconds(
                    daoAgendaInfo.minimumVotingPeriodSeconds
                );
                expect(await deployed.daoagendaManager.minimumVotingPeriodSeconds()).to.be.eq(daoAgendaInfo.minimumVotingPeriodSeconds)
            })

            it("setExecutingPeriodSeconds can not by not owner", async () => {
                await expect(
                    DAOProxyLogicV2.connect(addr1).setExecutingPeriodSeconds(
                        daoAgendaInfo.executingPeriodSeconds
                    )
                ).to.be.revertedWith("DAOCommitteeV2: msg.sender is not an admin") 
            })

            it("setExecutingPeriodSeconds can by only owner", async () => {
                await DAOProxyLogicV2.connect(daoAdmin).setExecutingPeriodSeconds(
                    daoAgendaInfo.executingPeriodSeconds
                );
                expect(await deployed.daoagendaManager.executingPeriodSeconds()).to.be.eq(daoAgendaInfo.executingPeriodSeconds)
            })
        })

        describe("#7-3. createSequencerCandidate", () => {
            it('Cannot be created unless the caller is the layer\'s sequencer.', async () => {
                expect(await deployed.addressManager.getAddress("OVM_Sequencer")).to.not.eq(addr1.address)
                let name = "Tokamak Optimism";
                let amount = ethers.utils.parseEther("100");
    
                await expect(
                    deployed.layer2Manager.connect(addr1).createOptimismSequencer(
                        ethers.utils.formatBytes32String(name),
                        deployed.addressManager.address,
                        deployed.l1Bridge.address,
                        deployed.l2Bridge.address,
                        deployed.l2ton.address,
                        amount
                    )
                    ).to.be.revertedWith("NOT Sequencer")
            })
    
            it('If the minimum security deposit is not provided, it cannot be created.', async () => {
                let name = "Tokamak Optimism";
                let amount = ethers.utils.parseEther("100");
    
                expect(await deployed.addressManager.getAddress("OVM_Sequencer")).to.eq(sequencer1.address)
                await expect(
                    deployed.layer2Manager.connect(sequencer1).createOptimismSequencer(
                        ethers.utils.formatBytes32String(name),
                        deployed.addressManager.address,
                        deployed.l1Bridge.address,
                        deployed.l2Bridge.address,
                        deployed.l2ton.address,
                        amount
                    )).to.be.reverted;
            })
            
            it('Approve the minimum security deposit and create.', async () => {
                expect(await DAOProxyLogicV2.candidatesLength()).to.be.eq(0)
                let name = "Tokamak Optimism";
    
                let totalLayers = await deployed.layer2Manager.totalLayers()
                let getAllLayersBefore = await deployed.layer2Manager.getAllLayers();
                expect(await deployed.addressManager.getAddress("OVM_Sequencer")).to.eq(sequencer1.address)
                let totalSecurityDeposit = await deployed.layer2Manager.totalSecurityDeposit();
                let amount = await deployed.layer2Manager.minimumDepositForSequencer();

                if(sequencerInfo.tonAmount1 < amount) {
                    sequencerInfo.tonAmount1 = amount;
                }
    
                if (sequencerInfo.tonAmount1.gt(await deployed.ton.balanceOf(sequencer1.address)))
                    await (await deployed.ton.connect(deployed.tonAdmin).mint(sequencer1.address, sequencerInfo.tonAmount1)).wait();
    
                if (sequencerInfo.tonAmount1.gte(await deployed.ton.allowance(sequencer1.address, deployed.layer2Manager.address)))
                    await (await deployed.ton.connect(sequencer1).approve(deployed.layer2Manager.address, sequencerInfo.tonAmount1)).wait();
    
                const topic = deployed.layer2Manager.interface.getEventTopic('CreatedOptimismSequencer');
    
                const receipt = await (await snapshotGasCost(deployed.layer2Manager.connect(sequencer1).createOptimismSequencer(
                        ethers.utils.formatBytes32String(name),
                        deployed.addressManager.address,
                        deployed.l1Bridge.address,
                        deployed.l2Bridge.address,
                        deployed.l2ton.address,
                        sequencerInfo.tonAmount1
                    ))).wait();
    
                const log = receipt.logs.find(x => x.topics.indexOf(topic) >= 0);
                const deployedEvent = deployed.layer2Manager.interface.parseLog(log);
    
                let sequencerIndex = deployedEvent.args._index;
    
                expect(deployedEvent.args._sequencer).to.eq(sequencer1.address);
                expect(deployedEvent.args._name).to.eq(ethers.utils.formatBytes32String(name));
                expect(deployedEvent.args.addressManager).to.eq(deployed.addressManager.address);
                expect(deployedEvent.args.l1Bridge).to.eq(deployed.l1Bridge.address);
                expect(deployedEvent.args.l2Bridge).to.eq(deployed.l2Bridge.address);
    
                expect(deployedEvent.args.l2ton).to.eq(deployed.l2ton.address);
    
                expect(await deployed.layer2Manager.totalLayers()).to.eq(totalLayers.add(1))
                expect(await deployed.layer2Manager.totalSecurityDeposit()).to.eq(totalSecurityDeposit.add(sequencerInfo.tonAmount1))
    
                let layerKey = await getLayerKey({
                        addressManager: deployed.addressManager.address,
                        l1Messenger: ethers.constants.AddressZero,
                        l2Messenger: ethers.constants.AddressZero,
                        l1Bridge: deployed.l1Bridge.address,
                        l2Bridge: deployed.l2Bridge.address,
                        l2ton: deployed.l2ton.address
                    }
                );
    
                expect(await deployed.optimismSequencer.getLayerKey(sequencerIndex)).to.eq(layerKey)
    
                let layer = await deployed.optimismSequencer.getLayerInfo(sequencerIndex);
    
                expect(layer.addressManager).to.eq(deployed.addressManager.address)
                expect(layer.l1Bridge).to.eq(deployed.l1Bridge.address)
                expect(layer.l2Bridge).to.eq(deployed.l2Bridge.address)
                expect(layer.l2ton).to.eq(deployed.l2ton.address)
    
                expect(await deployed.layer2Manager.layerKeys(layerKey)).to.eq(true)
                expect(await deployed.layer2Manager.indexSequencers()).to.eq(sequencerIndex)
    
                let getAllLayersAfter = await deployed.layer2Manager.getAllLayers();
    
                expect(getAllLayersBefore.optimismSequencerIndexes_.length).to.eq(
                    getAllLayersAfter.optimismSequencerIndexes_.length-1
                )
            })

            it("DAOContract check candidate", async () => {
                expect(await DAOProxyLogicV2.candidatesLength()).to.be.eq(1)
                expect(await DAOProxyLogicV2.candidatesV2(0)).to.be.eq(sequencer1.address)
                expect(await DAOProxyLogicV2.isExistCandidate(sequencer1.address)).to.be.eq(true);
            })

            it("You can stake without approval before staking", async () => {
                let layerIndex = await deployed.layer2Manager.indexSequencers();
                let balanceOf = await deployed.optimismSequencer.balanceOf(layerIndex, sequencer1.address);
                let balanceOfLton = await deployed.optimismSequencer["balanceOfLton(uint32,address)"](layerIndex, sequencer1.address);

                let totalStakedLton = await deployed.optimismSequencer.totalStakedLton()
                let totalStakeAccountList = await deployed.optimismSequencer.totalStakeAccountList()

                if (sequencerInfo.tonAmount1.gt(await deployed.ton.balanceOf(sequencer1.address)))
                    await (await deployed.ton.connect(deployed.tonAdmin).mint(sequencer1.address, sequencerInfo.tonAmount1)).wait();

                const data = ethers.utils.solidityPack(
                    ["uint32"],
                    [layerIndex]
                );

                await deployed.ton.connect(sequencer1).approveAndCall(
                    deployed.optimismSequencer.address,
                    sequencerInfo.tonAmount1,
                    data
                );

                expect(await deployed.optimismSequencer.totalStakedLton()).to.gt(totalStakedLton)

                let getLayerStakes = await deployed.optimismSequencer.getLayerStakes(layerIndex, sequencer1.address);

                if (!getLayerStakes.stake) {
                    expect(await deployed.optimismSequencer.totalStakeAccountList()).to.eq(totalStakeAccountList.add(1))
                    expect(await deployed.optimismSequencer.stakeAccountList(totalStakeAccountList)).to.eq(sequencer1.address)
                }

                let lton = await deployed.seigManagerV2.getTonToLton(sequencerInfo.tonAmount1);
                expect(await deployed.optimismSequencer["balanceOfLton(uint32,address)"](layerIndex, sequencer1.address))
                    .to.eq(balanceOfLton.add(lton))
                expect(await deployed.optimismSequencer.balanceOf(layerIndex, sequencer1.address))
                    .to.eq(balanceOf.add(sequencerInfo.tonAmount1))
            })
        })

        describe("#7-4. createCandidate", () => {
            it('Approve the minimum deposit and create candidate1.', async () => {
                let name = "Tokamak Candidate #1";
                let getAllCandidatesBefore = await deployed.layer2Manager.getAllCandidates();
    
                let totalLayers = await deployed.layer2Manager.totalLayers()
                let totalCandidates = await deployed.layer2Manager.totalCandidates()
    
                let sequencerIndex = await deployed.layer2Manager.optimismSequencerIndexes(totalLayers.sub(ethers.constants.One))
    
                let amount = await deployed.layer2Manager.minimumDepositForCandidate();

                if(candidateInfo.tonAmount1 < amount) {
                    candidateInfo.tonAmount1 = amount;
                }
    
                if (candidateInfo.tonAmount1.gt(await deployed.ton.balanceOf(candidate1.address)))
                    await (await deployed.ton.connect(deployed.tonAdmin).mint(candidate1.address, candidateInfo.tonAmount1)).wait();
    
                if (candidateInfo.tonAmount1.gte(await deployed.ton.allowance(candidate1.address, deployed.layer2Manager.address)))
                    await (await deployed.ton.connect(candidate1).approve(deployed.layer2Manager.address, candidateInfo.tonAmount1)).wait();
    
                const commission = 500;
                await snapshotGasCost(deployed.layer2Manager.connect(candidate1).createCandidate(
                    sequencerIndex,
                    ethers.utils.formatBytes32String(name),
                    commission,
                    candidateInfo.tonAmount1
                ))

                expect(await deployed.layer2Manager.totalCandidates()).to.eq(totalCandidates.add(1))
                let getAllCandidatesAfter = await deployed.layer2Manager.getAllCandidates();
                expect(getAllCandidatesBefore.candidateNamesIndexes_.length).to.eq(
                    getAllCandidatesAfter.candidateNamesIndexes_.length-1
                )
            })
            
            it("DAOContract check candidate1", async () => {
                expect(await DAOProxyLogicV2.candidatesLength()).to.be.eq(2)
                expect(await DAOProxyLogicV2.candidatesV2(1)).to.be.eq(candidate1.address)
                expect(await DAOProxyLogicV2.isExistCandidate(candidate1.address)).to.be.eq(true);
            })

            it('Approve the minimum deposit and create candidate2.', async () => {
                let name = "Tokamak Candidate #2";
                let getAllCandidatesBefore = await deployed.layer2Manager.getAllCandidates();
    
                let totalLayers = await deployed.layer2Manager.totalLayers()
                let totalCandidates = await deployed.layer2Manager.totalCandidates()
    
                let sequencerIndex = await deployed.layer2Manager.optimismSequencerIndexes(totalLayers.sub(ethers.constants.One))
    
                let amount = await deployed.layer2Manager.minimumDepositForCandidate();

                if(candidateInfo.tonAmount2 < amount) {
                    candidateInfo.tonAmount2 = amount;
                }
    
                if (amount.gt(await deployed.ton.balanceOf(candidate2.address)))
                    await (await deployed.ton.connect(deployed.tonAdmin).mint(candidate2.address, candidateInfo.tonAmount2)).wait();
    
                if (amount.gte(await deployed.ton.allowance(candidate2.address, deployed.layer2Manager.address)))
                    await (await deployed.ton.connect(candidate2).approve(deployed.layer2Manager.address, candidateInfo.tonAmount2)).wait();
    
                const commission = 500;
                await snapshotGasCost(deployed.layer2Manager.connect(candidate2).createCandidate(
                    sequencerIndex,
                    ethers.utils.formatBytes32String(name),
                    commission,
                    candidateInfo.tonAmount2
                ))

                expect(await deployed.layer2Manager.totalCandidates()).to.eq(totalCandidates.add(1))
                let getAllCandidatesAfter = await deployed.layer2Manager.getAllCandidates();
                expect(getAllCandidatesBefore.candidateNamesIndexes_.length).to.eq(
                    getAllCandidatesAfter.candidateNamesIndexes_.length-1
                )
            })
            
            it("DAOContract check candidate2", async () => {
                expect(await DAOProxyLogicV2.candidatesLength()).to.be.eq(3)
                expect(await DAOProxyLogicV2.candidatesV2(2)).to.be.eq(candidate2.address)
                expect(await DAOProxyLogicV2.isExistCandidate(candidate2.address)).to.be.eq(true);
            })

            it('Approve the minimum deposit and create candidate3.', async () => {
                let name = "Tokamak Candidate #3";
                let getAllCandidatesBefore = await deployed.layer2Manager.getAllCandidates();
    
                let totalLayers = await deployed.layer2Manager.totalLayers()
                let totalCandidates = await deployed.layer2Manager.totalCandidates()
    
                let sequencerIndex = await deployed.layer2Manager.optimismSequencerIndexes(totalLayers.sub(ethers.constants.One))
    
                let amount = await deployed.layer2Manager.minimumDepositForCandidate();

                if(candidateInfo.tonAmount3 < amount) {
                    candidateInfo.tonAmount3 = amount;
                }
    
                if (amount.gt(await deployed.ton.balanceOf(candidate3.address)))
                    await (await deployed.ton.connect(deployed.tonAdmin).mint(candidate3.address, candidateInfo.tonAmount3)).wait();
    
                if (amount.gte(await deployed.ton.allowance(candidate3.address, deployed.layer2Manager.address)))
                    await (await deployed.ton.connect(candidate3).approve(deployed.layer2Manager.address, candidateInfo.tonAmount3)).wait();
    
                const commission = 500;
                await snapshotGasCost(deployed.layer2Manager.connect(candidate3).createCandidate(
                    sequencerIndex,
                    ethers.utils.formatBytes32String(name),
                    commission,
                    candidateInfo.tonAmount3
                ))

                expect(await deployed.layer2Manager.totalCandidates()).to.eq(totalCandidates.add(1))
                let getAllCandidatesAfter = await deployed.layer2Manager.getAllCandidates();
                expect(getAllCandidatesBefore.candidateNamesIndexes_.length).to.eq(
                    getAllCandidatesAfter.candidateNamesIndexes_.length-1
                )
            })
            
            it("DAOContract check candidate3", async () => {
                expect(await DAOProxyLogicV2.candidatesLength()).to.be.eq(4)
                expect(await DAOProxyLogicV2.candidatesV2(3)).to.be.eq(candidate3.address)
                expect(await DAOProxyLogicV2.isExistCandidate(candidate3.address)).to.be.eq(true);
            })

            it('Approve the minimum deposit and create candidate4.', async () => {
                let name = "Tokamak Candidate #4";
                let getAllCandidatesBefore = await deployed.layer2Manager.getAllCandidates();
    
                let totalLayers = await deployed.layer2Manager.totalLayers()
                let totalCandidates = await deployed.layer2Manager.totalCandidates()
    
                let sequencerIndex = await deployed.layer2Manager.optimismSequencerIndexes(totalLayers.sub(ethers.constants.One))
    
                let amount = await deployed.layer2Manager.minimumDepositForCandidate();

                if(candidateInfo.tonAmount4 < amount) {
                    candidateInfo.tonAmount4 = amount;
                }
    
                if (amount.gt(await deployed.ton.balanceOf(candidate4.address)))
                    await (await deployed.ton.connect(deployed.tonAdmin).mint(candidate4.address, candidateInfo.tonAmount4)).wait();
    
                if (amount.gte(await deployed.ton.allowance(candidate4.address, deployed.layer2Manager.address)))
                    await (await deployed.ton.connect(candidate4).approve(deployed.layer2Manager.address, candidateInfo.tonAmount4)).wait();
    
                const commission = 500;
                await snapshotGasCost(deployed.layer2Manager.connect(candidate4).createCandidate(
                    sequencerIndex,
                    ethers.utils.formatBytes32String(name),
                    commission,
                    candidateInfo.tonAmount4
                ))

                expect(await deployed.layer2Manager.totalCandidates()).to.eq(totalCandidates.add(1))
                let getAllCandidatesAfter = await deployed.layer2Manager.getAllCandidates();
                expect(getAllCandidatesBefore.candidateNamesIndexes_.length).to.eq(
                    getAllCandidatesAfter.candidateNamesIndexes_.length-1
                )
            })
            
            it("DAOContract check candidate4", async () => {
                expect(await DAOProxyLogicV2.candidatesLength()).to.be.eq(5)
                expect(await DAOProxyLogicV2.candidatesV2(4)).to.be.eq(candidate4.address)
                expect(await DAOProxyLogicV2.isExistCandidate(candidate4.address)).to.be.eq(true);
            })
        })

        describe("#7-5. updateSeigniorage", () => {
            it('After the recent seignorage issuance, seignorage will not be issued unless the minimum block has passed.', async () => {
                const lastSeigBlock = await deployed.seigManagerV2.lastSeigBlock()
                const minimumBlocksForUpdateSeig = await deployed.seigManagerV2.minimumBlocksForUpdateSeig()
                const block = await ethers.provider.getBlock('latest')
    
                await DAOProxyLogicV2.connect(candidate1).updateSeigniorage()
    
                if (block.number - lastSeigBlock.toNumber() < minimumBlocksForUpdateSeig ) {
                    expect(await deployed.seigManagerV2.lastSeigBlock()).to.eq(lastSeigBlock)
                } else {
                    expect(await deployed.seigManagerV2.lastSeigBlock()).to.gt(lastSeigBlock)
                }
            })

            it("pass blocks", async function () {
                const minimumBlocksForUpdateSeig = await deployed.seigManagerV2.minimumBlocksForUpdateSeig()
                let i
                for (i = 0; i < minimumBlocksForUpdateSeig; i++){
                    await ethers.provider.send('evm_mine');
                }
            });
    
            it('If the staked amount is greater than 0, indexLton increase.', async () => {    
                let prevBalanceOfCandidate = await deployed.candidate.balanceOf(1, candidate1.address);
                let prevBalanceLtonOfCandidate =await deployed.candidate["balanceOfLton(uint32,address)"](1, candidate1.address)
                // console.log("prevBalanceOfCandidate:", prevBalanceOfCandidate)
                // console.log("prevBalanceLtonOfCandidate:", prevBalanceLtonOfCandidate)

                expect(await deployed.seigManagerV2.ratesDao()).to.eq(rates.ratesDao)
                expect(await deployed.seigManagerV2.ratesStosHolders()).to.eq(rates.ratesStosHolders)
                expect(await deployed.seigManagerV2.getTotalLton()).to.gt(ethers.constants.Zero)
                const indexLton = await deployed.seigManagerV2.indexLton();
                await DAOProxyLogicV2.connect(candidate1).updateSeigniorage()
                expect(await deployed.seigManagerV2.indexLton()).to.gt(indexLton)
                
                // console.log(await deployed.candidate["balanceOfLton(uint32,address)"](1, candidate1.address))
                // console.log(await deployed.candidate.balanceOf(1, candidate1.address))

                expect(await deployed.candidate["balanceOfLton(uint32,address)"](1, candidate1.address)).to.eq(prevBalanceLtonOfCandidate)
                expect(await deployed.candidate.balanceOf(1, candidate1.address)).to.gt(prevBalanceOfCandidate)
            });
        })

        describe("#7-6. increaseMaxMember & decreaseMaxMember", () => {
            it("now MaxMember is 3", async () => {
                expect(await DAOProxyLogicV2.maxMember()).to.be.eq(3)
            })

            it("increaseMaxMember can not by not owner", async () => {
                let maxMeber = Number(await DAOProxyLogicV2.maxMember())
                await expect(
                    DAOProxyLogicV2.connect(addr1).increaseMaxMember((maxMeber+1),(maxMeber))
                ).to.be.revertedWith("DAOCommitteeV2: msg.sender is not an admin") 
            })

            it("increaseMaxMember can not under nowMember", async () => {
                let maxMeber = Number(await DAOProxyLogicV2.maxMember())
                await expect(
                    DAOProxyLogicV2.connect(daoAdmin).increaseMaxMember((maxMeber-1),(maxMeber-2))
                ).to.be.revertedWith("DAOCommittee: You have to call decreaseMaxMember to decrease") 
            })
            
            it("increaseMaxMember can by only owner", async () => {
                let maxMeber = Number(await DAOProxyLogicV2.maxMember())
                await DAOProxyLogicV2.connect(daoAdmin).increaseMaxMember((maxMeber+1),maxMeber)
                expect(await DAOProxyLogicV2.maxMember()).to.be.eq((maxMeber+1))
                expect(await DAOProxyLogicV2.quorum()).to.be.eq(maxMeber)
            })

            it("decreaseMaxMember can not by not owner", async () => {
                let maxMeber = Number(await DAOProxyLogicV2.maxMember())
                // let reducingMamber = await DAOProxyLogicV2.members((maxMeber-1))
                // console.log("reducingMamber :", reducingMamber);
                await expect(
                    DAOProxyLogicV2.connect(addr1).decreaseMaxMember((maxMeber-1),(maxMeber-2))
                ).to.be.revertedWith("DAOCommitteeV2: msg.sender is not an admin") 
            })

            it("decreaseMaxMember can not invalid member index", async () => {
                let maxMeber = Number(await DAOProxyLogicV2.maxMember())
                await expect(
                    DAOProxyLogicV2.connect(daoAdmin).decreaseMaxMember((maxMeber+1),(maxMeber))
                ).to.be.revertedWith("DAOCommitteeV2: invalid member index") 
            })

            it("decreaseMaxMember can not invalid member index", async () => {
                let maxMeber = Number(await DAOProxyLogicV2.maxMember())
                await DAOProxyLogicV2.connect(daoAdmin).decreaseMaxMember((maxMeber-1),(maxMeber-2))
                expect(await DAOProxyLogicV2.maxMember()).to.be.eq((maxMeber-1))
                expect(await DAOProxyLogicV2.quorum()).to.be.eq(maxMeber-2)
            })
        })
        
        describe("#7-7. Member challenge", () => {
            it("not candidate not challenge", async () => {
                await expect(
                    DAOProxyLogicV2.connect(addr1).changeMember(0)
                ).to.be.revertedWith("DAOCommitteeV2: not registerd") 
            })

            it("There is a member of V1, but a V2 candidate challenge", async () => {
                let changeIndex = 0;
                let beforeMember = await DAOProxyLogicV2.members(changeIndex)
                const topic = deployed.daov2committeeV2.interface.getEventTopic('ChangedMember');
                const receipt = await(await DAOProxyLogicV2.connect(candidate1).changeMember(changeIndex)).wait();
                const log = receipt.logs.find(x => x.topics.indexOf(topic) >= 0);
                const deployedEvent = deployed.daov2committeeV2.interface.parseLog(log);
                
                expect(deployedEvent.args.slotIndex).to.eq(changeIndex);
                expect(deployedEvent.args.prevMember).to.eq(beforeMember);
                expect(deployedEvent.args.newMember).to.eq(candidate1.address);
            })

            it("everyMember change V2member", async () => {
                let changeIndex = 1;
                let beforeMember = await DAOProxyLogicV2.members(changeIndex)
                const topic = deployed.daov2committeeV2.interface.getEventTopic('ChangedMember');
                const receipt = await(await DAOProxyLogicV2.connect(candidate2).changeMember(changeIndex)).wait();
                const log = receipt.logs.find(x => x.topics.indexOf(topic) >= 0);
                const deployedEvent = deployed.daov2committeeV2.interface.parseLog(log);
                
                expect(deployedEvent.args.slotIndex).to.eq(changeIndex);
                expect(deployedEvent.args.prevMember).to.eq(beforeMember);
                expect(deployedEvent.args.newMember).to.eq(candidate2.address);

                expect(await DAOProxyLogicV2.isMemberV2(candidate2.address)).to.be.equal(true)
                
                let changeIndex2 = 2;
                let beforeMember2 = await DAOProxyLogicV2.members(changeIndex2)
                const topic2 = deployed.daov2committeeV2.interface.getEventTopic('ChangedMember');
                const receipt2 = await(await DAOProxyLogicV2.connect(candidate3).changeMember(changeIndex2)).wait();
                const log2 = receipt2.logs.find(x => x.topics.indexOf(topic2) >= 0);
                const deployedEvent2 = deployed.daov2committeeV2.interface.parseLog(log2);
                
                expect(deployedEvent2.args.slotIndex).to.eq(changeIndex2);
                expect(deployedEvent2.args.prevMember).to.eq(beforeMember2);
                expect(deployedEvent2.args.newMember).to.eq(candidate3.address);

                expect(await DAOProxyLogicV2.isMemberV2(candidate3.address)).to.be.equal(true)
            })

            it("If the deposit amount is less, the challenge fails.", async () => {
                // console.log(await deployed.optimismSequencer["balanceOfLton(uint32,address)"](1, sequencer1.address))
                // console.log(await deployed.candidate["balanceOfLton(uint32,address)"](3, candidate3.address))
                await expect(
                    DAOProxyLogicV2.connect(sequencer1).changeMember(2)
                ).to.be.revertedWith("not enough amount") 
            })

            it("Even if the deposit amount is the same, the challenge fails.", async () => {
                // console.log(await deployed.optimismSequencer["balanceOfLton(uint32,address)"](1, sequencer1.address))
                // console.log(await deployed.candidate["balanceOfLton(uint32,address)"](2, candidate2.address))
                await expect(
                    DAOProxyLogicV2.connect(sequencer1).changeMember(1)
                ).to.be.revertedWith("not enough amount") 
            })

            it("If the deposit amount is greater, the challenge succeeds.", async () => {
                let changeIndex = 0;
                let beforeMember = await DAOProxyLogicV2.members(changeIndex)
                const topic = deployed.daov2committeeV2.interface.getEventTopic('ChangedMember');
                const receipt = await(await DAOProxyLogicV2.connect(sequencer1).changeMember(changeIndex)).wait();
                const log = receipt.logs.find(x => x.topics.indexOf(topic) >= 0);
                const deployedEvent = deployed.daov2committeeV2.interface.parseLog(log);
                
                expect(deployedEvent.args.slotIndex).to.eq(changeIndex);
                expect(deployedEvent.args.prevMember).to.eq(beforeMember);
                expect(deployedEvent.args.prevMember).to.eq(candidate1.address);
                expect(deployedEvent.args.newMember).to.eq(sequencer1.address);
            })

            it("cannot run retire if you are not a member.", async () => {
                await expect(
                    DAOProxyLogicV2.connect(addr1).retireMember()
                ).to.be.revertedWith("DAOCommitteeV2: not a member") 
            })

            it("Members can retire. The member retired at address0.", async () => {
                let changeIndex = 2;
                const topic = deployed.daov2committeeV2.interface.getEventTopic('ChangedMember');
                const receipt = await(await DAOProxyLogicV2.connect(candidate3).retireMember()).wait();
                const log = receipt.logs.find(x => x.topics.indexOf(topic) >= 0);
                const deployedEvent = deployed.daov2committeeV2.interface.parseLog(log);
                
                expect(deployedEvent.args.slotIndex).to.eq(changeIndex);
                expect(deployedEvent.args.prevMember).to.eq(candidate3.address);
                expect(deployedEvent.args.newMember).to.eq(addr0);
            })

            it("Even after retirement, you can register as a member again.", async () => {
                expect(await DAOProxyLogicV2.isMemberV2(candidate3.address)).to.be.equal(false)

                let changeIndex2 = 2;
                let beforeMember2 = await DAOProxyLogicV2.members(changeIndex2)
                const topic2 = deployed.daov2committeeV2.interface.getEventTopic('ChangedMember');
                const receipt2 = await(await DAOProxyLogicV2.connect(candidate3).changeMember(changeIndex2)).wait();
                const log2 = receipt2.logs.find(x => x.topics.indexOf(topic2) >= 0);
                const deployedEvent2 = deployed.daov2committeeV2.interface.parseLog(log2);
                
                expect(deployedEvent2.args.slotIndex).to.be.eq(changeIndex2);
                expect(deployedEvent2.args.prevMember).to.be.eq(beforeMember2);
                expect(deployedEvent2.args.newMember).to.be.eq(candidate3.address);

                expect(await DAOProxyLogicV2.isMemberV2(candidate3.address)).to.be.equal(true)
            })

            it("fill all slots", async () => {
                expect(await DAOProxyLogicV2.members(0)).to.be.equal(sequencer1.address);
                expect(await DAOProxyLogicV2.members(1)).to.be.equal(candidate2.address);
                expect(await DAOProxyLogicV2.members(2)).to.be.equal(candidate3.address);
            })

            it("can not exceed maximum", async () => {
                expect(await DAOProxyLogicV2.maxMember()).to.be.equal(3);
                await expect(
                    DAOProxyLogicV2.connect(candidate1).changeMember(3)
                ).to.be.revertedWith("DAOCommitteeV2: invalid member index") 
            })
        })
    })

    describe("#8. DAO Agenda Test", () => {
        describe("check the beforeAgenda", () => {
            it("check", async () => {
                beforeAgendaID = await deployed.daoagendaManager.numAgendas();
            })
        })
        for(let i = 0; i < votesList.length; i ++) {
        // for(let i = 0; i < 1; i ++) {
            describe(`ACCEPTED Agenda ${i}`, () => {
                it("create new agenda", async () => {
                    const noticePeriod = await deployed.daoagendaManager.minimumNoticePeriodSeconds();
                    const votingPeriod = await deployed.daoagendaManager.minimumVotingPeriodSeconds();
                    const selector = Web3EthAbi.encodeFunctionSignature("setMinimumNoticePeriodSeconds(uint256)");
                    const newMinimumNoticePeriod = i * 10;
                    const data = padLeft(newMinimumNoticePeriod.toString(16), 64);
                    const functionBytecode = selector.concat(data);

                    const param = Web3EthAbi.encodeParameters(
                        ["address[]", "uint128", "uint128", "bool", "bytes[]"],
                        [[deployed.daoagendaManager.address], noticePeriod.toString(), votingPeriod.toString(), true, [functionBytecode]]
                    );
            
                    const beforeBalance = await deployed.ton.balanceOf(addr1.address);
                    const agendaFee = await deployed.daoagendaManager.createAgendaFees();
                    expect(agendaFee).to.be.gt(0);

                    if (agendaFee.gt(beforeBalance))
                        await (await deployed.ton.connect(deployed.tonAdmin).mint(addr1.address, agendaFee)).wait();

                    const beforeBalance2 = await deployed.ton.balanceOf(addr1.address);

                    // create agenda
                    await deployed.ton.connect(addr1).approveAndCall(
                        DAOProxyLogicV2.address,
                        agendaFee,
                        param
                    );

                    const afterBalance = await deployed.ton.balanceOf(addr1.address);
                    expect(afterBalance).to.be.lt(beforeBalance2);
                    expect(beforeBalance2.sub(afterBalance)).to.be.equal(agendaFee)
        
                    agendaID = (await deployed.daoagendaManager.numAgendas()).sub(1);
                    //const executionInfo = await agendaManager.executionInfos(agendaID);
                    const executionInfo = await deployed.daoagendaManager.getExecutionInfo(agendaID);
                    expect(executionInfo[0][0]).to.be.equal(deployed.daoagendaManager.address);
                    expect(executionInfo[1][0]).to.be.equal(functionBytecode);
                })

                it('increase block time and check votable', async function () {
                    const agenda = await deployed.daoagendaManager.agendas(agendaID);  
                    const noticeEndTimestamp = agenda[AGENDA_INDEX_NOTICE_END_TIMESTAMP];
                    await time.increaseTo(Number(noticeEndTimestamp));
                    expect(await deployed.daoagendaManager.isVotableStatus(agendaID)).to.be.equal(true);
                });

                describe(`Vote - ${votesList[i].votes}`, function () {
                    it(`cast vote`, async () => {
                        for (let j = 0; j < votesList[i].votes.length; j++) {
                    //   for (let j = 0; j < 1; j++) {
                        console.log("candidates[",j,"] : ",candidates[j].address);
                        await castVote(agendaID, candidates[j], votesList[i].votes[j]);
                        }
                    });
        
                    it("check vote result/status", async () => {
                        const agenda = await deployed.daoagendaManager.agendas(agendaID);
                        expect(agenda[AGENDA_INDEX_RESULT]).to.be.equal(votesList[i].expected_result);
                        expect(agenda[AGENDA_INDEX_STATUS]).to.be.equal(votesList[i].expected_status);
        
                        if (agenda[AGENDA_INDEX_STATUS] == AGENDA_STATUS_WAITING_EXEC) {
                        const votingEndTimestamp = agenda[AGENDA_INDEX_VOTING_END_TIMESTAMP];
                        const currentTime = await time.latest();
                        if (currentTime < votingEndTimestamp) {
                            await time.increaseTo(Number(votingEndTimestamp));
                        }
                        expect(await deployed.daoagendaManager.canExecuteAgenda(agendaID)).to.be.equal(true);
                        }
                    });

                    it("execute", async () => {
                        const agenda = await deployed.daoagendaManager.agendas(agendaID);
                        expect(agenda[AGENDA_INDEX_EXECUTED_TIMESTAMP]).to.be.equal(0);
                        const beforeValue2 = await deployed.daoagendaManager.minimumNoticePeriodSeconds();
                        console.log("agendaID : ", agendaID)
                        console.log("beforeAgendaID : ", beforeAgendaID)
                        console.log("beforeValue2 :", beforeValue2)
                        let diffAgenda = agendaID - beforeAgendaID
            
                        if (agenda[AGENDA_INDEX_STATUS] == AGENDA_STATUS_WAITING_EXEC) {
                            const beforeValue = await deployed.daoagendaManager.minimumNoticePeriodSeconds();
                            await DAOProxyLogicV2.executeAgenda(agendaID);
                            const afterValue = await deployed.daoagendaManager.minimumNoticePeriodSeconds();
                            console.log("beforeValue :", beforeValue)
                            console.log("afterValue :", afterValue)
                            expect(beforeValue).to.be.not.equal(afterValue);
                            expect(afterValue).to.be.equal((diffAgenda * 10));
            
                            const afterAgenda = await deployed.daoagendaManager.agendas(agendaID); 
                            expect(afterAgenda[AGENDA_INDEX_EXECUTED]).to.be.equal(true);
                            expect(afterAgenda[AGENDA_INDEX_EXECUTED_TIMESTAMP]).to.be.gt(0); 
                        }
                    });
                })
            })
        }
        
        describe("DISMISS agenda", async () => {
            it('create new agenda', async function () {
                const noticePeriod = await deployed.daoagendaManager.minimumNoticePeriodSeconds();
                const votingPeriod = await deployed.daoagendaManager.minimumVotingPeriodSeconds();
                const selector = Web3EthAbi.encodeFunctionSignature("setMinimumNoticePeriodSeconds(uint256)");
                const newMinimumNoticePeriod = 10;
                const data = padLeft(newMinimumNoticePeriod.toString(16), 64);
                const functionBytecode = selector.concat(data);
      
                const param = Web3EthAbi.encodeParameters(
                  ["address[]", "uint128", "uint128", "bool", "bytes[]"],
                    [ 
                        [deployed.daoagendaManager.address], 
                        noticePeriod.toString(), 
                        votingPeriod.toString(), 
                        true, 
                        [functionBytecode]
                    ]
                );
      
                const beforeBalance = await deployed.ton.balanceOf(addr1.address);
                const agendaFee = await deployed.daoagendaManager.createAgendaFees();
                expect(agendaFee).to.be.gt(0);

                if (agendaFee.gt(beforeBalance))
                    await (await deployed.ton.connect(deployed.tonAdmin).mint(addr1.address, agendaFee)).wait();
                
                const beforeBalance2 = await deployed.ton.balanceOf(addr1.address);
      
                // create agenda
                await deployed.ton.connect(addr1).approveAndCall(
                    DAOProxyLogicV2.address,
                    agendaFee,
                    param
                );
                const afterBalance = await deployed.ton.balanceOf(addr1.address);
                expect(afterBalance).to.be.lt(beforeBalance2);
                expect(beforeBalance2.sub(afterBalance)).to.be.equal(agendaFee);
      
                agendaID = (await deployed.daoagendaManager.numAgendas()).sub(1);
                //const executionInfo = await agendaManager.executionInfos(agendaID);
                const executionInfo = await deployed.daoagendaManager.getExecutionInfo(agendaID);
                expect(executionInfo[0][0]).to.be.equal(deployed.daoagendaManager.address);
                expect(executionInfo[1][0]).to.be.equal(functionBytecode);
            });

            it('increase block time and check votable', async function () {
                const agenda = await deployed.daoagendaManager.agendas(agendaID);  
                const noticeEndTimestamp = agenda[AGENDA_INDEX_NOTICE_END_TIMESTAMP];
                await time.increaseTo(Number(noticeEndTimestamp));
                expect(await deployed.daoagendaManager.isVotableStatus(agendaID)).to.be.equal(true);
            });
    
            it(`cast vote`, async function () {
                await castVote(agendaID, candidates[0], VOTE_YES);
            });
    
            it("check vote result/status", async function () {
                const agenda = await deployed.daoagendaManager.agendas(agendaID);
                expect(agenda[AGENDA_INDEX_RESULT]).to.be.equal(AGENDA_RESULT_PENDING);
                expect(agenda[AGENDA_INDEX_STATUS]).to.be.equal(AGENDA_STATUS_VOTING);
            });
    
            it('increase block time', async function () {
                const agenda = await deployed.daoagendaManager.agendas(agendaID);  
                const noticeEndTimestamp = agenda[AGENDA_INDEX_VOTING_END_TIMESTAMP];
                await time.increaseTo(Number(noticeEndTimestamp)+1);
                expect(await deployed.daoagendaManager.isVotableStatus(agendaID)).to.be.equal(false);
            });
    
            it("end agenda voting", async function () {
                await DAOProxyLogicV2.endAgendaVoting(agendaID);
            });
    
            it("check vote result/status", async function () {
                const agenda = await deployed.daoagendaManager.agendas(agendaID);
                expect(agenda[AGENDA_INDEX_RESULT]).to.be.equal(AGENDA_RESULT_DISMISSED);
                expect(agenda[AGENDA_INDEX_STATUS]).to.be.equal(AGENDA_STATUS_ENDED);
                expect(await deployed.daoagendaManager.isVotableStatus(agendaID)).to.be.equal(false);
            });
        })

        describe("non-atomic agenda(multi agenda)", async function () {
            it('create new agenda', async function () {
              const noticePeriod = await deployed.daoagendaManager.minimumNoticePeriodSeconds();
              const votingPeriod = await deployed.daoagendaManager.minimumVotingPeriodSeconds();
    
              let targets = [];
              let functionBytecodes = [];
              for (let i = 0; i < 10; i++) {
                const selector1 = Web3EthAbi.encodeFunctionSignature("setMinimumNoticePeriodSeconds(uint256)");
                const newMinimumNoticePeriod = 1000000 * (i+1);
                const data1 = padLeft(newMinimumNoticePeriod.toString(16), 64);
                const functionBytecode1 = selector1.concat(data1);
                targets.push(deployed.daoagendaManager.address);
                functionBytecodes.push(functionBytecode1);
              }
    
              const param = Web3EthAbi.encodeParameters(
                ["address[]", "uint128", "uint128", "bool", "bytes[]"],
                [
                    targets, 
                    noticePeriod.toString(),
                    votingPeriod.toString(),
                    false,
                    functionBytecodes
                ]
              );
    
              const beforeBalance = await deployed.ton.balanceOf(addr1.address);
              const agendaFee = await deployed.daoagendaManager.createAgendaFees();
              expect(agendaFee).to.be.gt(0);

              if (agendaFee.gt(beforeBalance))
                    await (await deployed.ton.connect(deployed.tonAdmin).mint(addr1.address, agendaFee)).wait();
                
              const beforeBalance2 = await deployed.ton.balanceOf(addr1.address);
    
              // create agenda
              await deployed.ton.connect(addr1).approveAndCall(
                DAOProxyLogicV2.address,
                agendaFee,
                param
              );

              const afterBalance = await deployed.ton.balanceOf(addr1.address);
              expect(afterBalance).to.be.lt(beforeBalance2);
              expect(beforeBalance2.sub(afterBalance)).to.be.equal(agendaFee);
    
              agendaID = (await deployed.daoagendaManager.numAgendas()).sub(1);
              //const executionInfo = await agendaManager.executionInfos(agendaID);
              const executionInfo = await deployed.daoagendaManager.getExecutionInfo(agendaID);
              //console.log(executionInfo)
              //expect(executionInfo[0][0]).to.be.equal(deployed.daoagendaManager.address);
              //expect(executionInfo[1][0]).to.be.equal(functionBytecodes);
            });
    
            it('increase block time and check votable', async function () {
              const agenda = await deployed.daoagendaManager.agendas(agendaID);  
              const noticeEndTimestamp = agenda[AGENDA_INDEX_NOTICE_END_TIMESTAMP];
              await time.increaseTo(Number(noticeEndTimestamp));
              expect(await deployed.daoagendaManager.isVotableStatus(agendaID)).to.be.equal(true);
            });
    
            it(`cast vote`, async function () {
              await castVote(agendaID, candidates[0], VOTE_YES);
              await castVote(agendaID, candidates[1], VOTE_YES);
            });
    
            it("check vote result/status", async function () {
              const agenda = await deployed.daoagendaManager.agendas(agendaID);
              expect(agenda[AGENDA_INDEX_RESULT]).to.be.equal(AGENDA_RESULT_ACCEPTED);
              expect(agenda[AGENDA_INDEX_STATUS]).to.be.equal(AGENDA_STATUS_WAITING_EXEC);
            });
    
            it('increase block time', async function () {
              const agenda = await deployed.daoagendaManager.agendas(agendaID);  
              const noticeEndTimestamp = agenda[AGENDA_INDEX_VOTING_END_TIMESTAMP];
              await time.increaseTo(Number(noticeEndTimestamp)+1);
              expect(await deployed.daoagendaManager.isVotableStatus(agendaID)).to.be.equal(false);
            });
    
            it("execute", async function () {
              const beforeAgenda = await deployed.daoagendaManager.agendas(agendaID); 
              const beforeValue = await deployed.daoagendaManager.minimumNoticePeriodSeconds();
              expect(beforeAgenda[AGENDA_INDEX_EXECUTED]).to.be.equal(false);
              const executeTx = await DAOProxyLogicV2.executeAgenda(agendaID);
              const afterValue = await deployed.daoagendaManager.minimumNoticePeriodSeconds();
              expect(beforeValue).to.be.not.equal(afterValue);
    
              const afterAgenda = await deployed.daoagendaManager.agendas(agendaID); 
              expect(afterAgenda[AGENDA_INDEX_EXECUTED]).to.be.equal(true);
              //afterAgenda[AGENDA_INDEX_EXECUTED_TIMESTAMP].should.be.bignumber.gt(toBN("0")); 
            });
    
            it("check executed result/status", async function () {
              const executedInfo = await deployed.daoagendaManager.getExecutionInfo(agendaID);
              //expect(executedInfo.executeStartFrom).to.be.lt(10);
              //expect(await deployed.daoagendaManager.minimumNoticePeriodSeconds()).to.be.lt(10000000);
              expect(executedInfo.executeStartFrom).to.be.equal(10);
              expect(await deployed.daoagendaManager.minimumNoticePeriodSeconds()).to.be.equal(10000000);
            });
        });

        describe("executing period of agenda", async function () {
            it('create new agenda', async function () {
                const noticePeriod = await deployed.daoagendaManager.minimumNoticePeriodSeconds();
                const votingPeriod = await deployed.daoagendaManager.minimumVotingPeriodSeconds();
                const selector = Web3EthAbi.encodeFunctionSignature("setMinimumNoticePeriodSeconds(uint256)");
                // console.log(selector);
                const newMinimumNoticePeriod = 20;
                const data = padLeft(newMinimumNoticePeriod.toString(16), 64);
                const functionBytecode = selector.concat(data);
                // console.log(functionBytecode);
    
                const param = Web3EthAbi.encodeParameters(
                    ["address[]", "uint128", "uint128", "bool", "bytes[]"],
                    [[deployed.daoagendaManager.address], noticePeriod.toString(), votingPeriod.toString(), true, [functionBytecode]]
                );
    
                const beforeBalance = await deployed.ton.balanceOf(addr1.address);
                const agendaFee = await deployed.daoagendaManager.createAgendaFees();
                expect(agendaFee).to.be.gt(0);

                if (agendaFee.gt(beforeBalance))
                    await (await deployed.ton.connect(deployed.tonAdmin).mint(addr1.address, agendaFee)).wait();
                
                const beforeBalance2 = await deployed.ton.balanceOf(addr1.address);
    
                // create agenda
                await deployed.ton.connect(addr1).approveAndCall(
                    DAOProxyLogicV2.address,
                    agendaFee,
                    param
                );
                const afterBalance = await deployed.ton.balanceOf(addr1.address);
                expect(afterBalance).to.be.lt(beforeBalance2);
                expect(beforeBalance2.sub(afterBalance)).to.be.equal(agendaFee);
    
                agendaID = (await deployed.daoagendaManager.numAgendas()).sub(1);
                //const executionInfo = await agendaManager.executionInfos(agendaID);
                const executionInfo = await deployed.daoagendaManager.getExecutionInfo(agendaID);
                expect(executionInfo[0][0]).to.be.equal(deployed.daoagendaManager.address);
                expect(executionInfo[1][0]).to.be.equal(functionBytecode);
            });
    
            it('increase block time and check votable', async function () {
                const agenda = await deployed.daoagendaManager.agendas(agendaID);  
                const noticeEndTimestamp = agenda[AGENDA_INDEX_NOTICE_END_TIMESTAMP];
                await time.increaseTo(Number(noticeEndTimestamp));
                expect(await deployed.daoagendaManager.isVotableStatus(agendaID)).to.be.equal(true);
            });
    
            it(`cast vote`, async function () {
                await castVote(agendaID, candidates[0], VOTE_YES);
                await castVote(agendaID, candidates[1], VOTE_YES);
                await castVote(agendaID, candidates[2], VOTE_YES);
            });
    
            it("check vote result/status", async function () {
                const agenda = await deployed.daoagendaManager.agendas(agendaID);
                expect(agenda[AGENDA_INDEX_RESULT]).to.be.equal(AGENDA_RESULT_ACCEPTED);
                expect(agenda[AGENDA_INDEX_STATUS]).to.be.equal(AGENDA_STATUS_WAITING_EXEC);
                expect(await time.latest()).to.be.lt(agenda[AGENDA_INDEX_VOTING_END_TIMESTAMP]);
                expect(await deployed.daoagendaManager.canExecuteAgenda(agendaID)).to.be.equal(false);
            });
    
            it('increase block time', async function () {
              const agenda = await deployed.daoagendaManager.agendas(agendaID);  
    
              const votingEndTimestamp = agenda[AGENDA_INDEX_VOTING_END_TIMESTAMP];
              const executingPeriodTimestamp = await deployed.daoagendaManager.executingPeriodSeconds();
              console.log("votingEndTimestamp :", votingEndTimestamp);
              console.log("executingPeriodTimestamp :", executingPeriodTimestamp);
              await time.increaseTo(Number(votingEndTimestamp)+1);
              
              expect(await deployed.daoagendaManager.canExecuteAgenda(agendaID)).to.be.equal(true);
              
              const executableLimitTimestamp = agenda[AGENDA_INDEX_EXECUTABLE_LIMIT_TIMESTAMP];
              expect(Number(votingEndTimestamp)+Number(executingPeriodTimestamp)).to.be.equal(Number(executableLimitTimestamp));
              console.log("executableLimitTimestamp :", executableLimitTimestamp);
              await time.increaseTo(Number(executableLimitTimestamp)+1);
            });
    
            it("check executable limit", async function () {
              const agenda = await deployed.daoagendaManager.agendas(agendaID);  
    
              expect(await deployed.daoagendaManager.isVotableStatus(agendaID)).to.be.equal(false);
              expect(await time.latest()).to.be.gt(agenda[AGENDA_INDEX_EXECUTABLE_LIMIT_TIMESTAMP]);
              expect(await deployed.daoagendaManager.canExecuteAgenda(agendaID)).to.be.equal(false);
              await expect(
                DAOProxyLogicV2.executeAgenda(agendaID)
              ).to.be.revertedWith("DAOCommittee: can not execute the agenda"); 
            });
        });
    })

    describe("#9. Vault", () => {
        it('check DAOVault balance', async function () {
            let amount = await deployed.ton.balanceOf(deployed.daovault.address);
            expect(amount).to.be.gt(0);
        });
      
        describe('Claim activity reward', function () {
            it("Candidates who were not members will not receive any rewards.", async () => {
                expect(await DAOProxyLogicV2.isMemberV2(candidate4.address)).to.be.equal(false)
                let claimableAmount = await DAOProxyLogicV2.getClaimableActivityReward(candidate4.address);
                expect(claimableAmount).to.be.equal(0)
            })

            it("Candidates who were members even if they are not current members can receive rewards.", async () => {
                expect(await DAOProxyLogicV2.isMemberV2(candidate1.address)).to.be.equal(false)
                let claimableAmount = await DAOProxyLogicV2.getClaimableActivityReward(candidate1.address);
                expect(claimableAmount).to.be.gt(0)
            })

            it("All current members can receive rewards.", async () => {
                expect(await DAOProxyLogicV2.isMemberV2(sequencer1.address)).to.be.equal(true)
                expect(await DAOProxyLogicV2.isMemberV2(candidate2.address)).to.be.equal(true)
                expect(await DAOProxyLogicV2.isMemberV2(candidate3.address)).to.be.equal(true)
                expect(await DAOProxyLogicV2.getClaimableActivityReward(sequencer1.address)).to.be.gt(0)
                expect(await DAOProxyLogicV2.getClaimableActivityReward(candidate2.address)).to.be.gt(0)
                expect(await DAOProxyLogicV2.getClaimableActivityReward(candidate3.address)).to.be.gt(0)
            })

            it("Anyone who has a claimReward can receive a claim.", async () => {
                const beforeBalance = await deployed.ton.balanceOf(candidate1.address);

                const claimableAmount = await DAOProxyLogicV2.getClaimableActivityReward(candidate1.address);
                expect(claimableAmount).to.be.gt(0)

                await DAOProxyLogicV2.connect(candidate1).claimActivityReward(candidate1.address);

                const afterBalance = await deployed.ton.balanceOf(candidate1.address);

                expect(Number(afterBalance)-Number(beforeBalance)).to.be.equal(Number(claimableAmount));
            })

            it("All current members can claim.", async () => {
                const beforeBalance = await deployed.ton.balanceOf(sequencer1.address);
                // console.log(beforeBalance)

                const claimableAmount = await DAOProxyLogicV2.getClaimableActivityReward(sequencer1.address);
                // console.log(claimableAmount)
                expect(claimableAmount).to.be.gt(0)

                await DAOProxyLogicV2.connect(sequencer1).claimActivityReward(sequencer1.address);

                const afterBalance = await deployed.ton.balanceOf(sequencer1.address);
                // console.log(afterBalance)

                //getClaim할때는 period가 1001140인데 calimActivity할때는 period가 1001141이다
                //멤버는 초당 reward를 받기 때문에 getClaim과의 정확한 비교는 힘들다.
                expect(Number(afterBalance)).to.be.gt(Number(beforeBalance));
                expect(Number(afterBalance)-Number(beforeBalance)).to.be.gt(Number(claimableAmount));

                const beforeBalance2 = await deployed.ton.balanceOf(candidate2.address);

                const claimableAmount2 = await DAOProxyLogicV2.getClaimableActivityReward(candidate2.address);
                expect(claimableAmount2).to.be.gt(0)

                await DAOProxyLogicV2.connect(candidate2).claimActivityReward(candidate2.address);

                const afterBalance2 = await deployed.ton.balanceOf(candidate2.address);

                expect(Number(afterBalance2)-Number(beforeBalance2)).to.be.gt(Number(claimableAmount2));
                expect(Number(afterBalance2)).to.be.gt(Number(beforeBalance2));

                const beforeBalance3 = await deployed.ton.balanceOf(candidate3.address);

                const claimableAmount3 = await DAOProxyLogicV2.getClaimableActivityReward(candidate3.address);
                expect(claimableAmount3).to.be.gt(0)

                await DAOProxyLogicV2.connect(candidate3).claimActivityReward(candidate3.address);

                const afterBalance3 = await deployed.ton.balanceOf(candidate3.address);

                expect(Number(afterBalance3)-Number(beforeBalance3)).to.be.gt(Number(claimableAmount3));
                expect(Number(afterBalance3)).to.be.gt(Number(beforeBalance3));
            })
        });
    })

    describe("#10. multi Agenda test", () => {
        describe("same targetAddress, different function test", () => {
            it("create Multi Agenda", async () => {
                const noticePeriod = await deployed.daoagendaManager.minimumNoticePeriodSeconds();
                const votingPeriod = await deployed.daoagendaManager.minimumVotingPeriodSeconds();
    
                let targets = [];
                let functionBytecodes = [];
    
                const selector1 = Web3EthAbi.encodeFunctionSignature("setMinimumNoticePeriodSeconds(uint256)");
                const selector2 = Web3EthAbi.encodeFunctionSignature("setCreateAgendaFees(uint256)");
                const selector3 = Web3EthAbi.encodeFunctionSignature("setExecutingPeriodSeconds(uint256)");
    
                const newMinimumNoticePeriod = 150
                const daoAgendaFee = daoAgendaInfo.agendaFee2
                const daoAgendaFee2 = 200000000000000000000
                // console.log("daoAgendaFee :", daoAgendaFee);
                const executingPeriod = 300
                const wtonAmount = 1000000000000000000000000000
    
                // console.log("------------------------------------")
                // console.log(newMinimumNoticePeriod.toString(16));
                // console.log(daoAgendaFee.toHexString());
                // console.log((daoAgendaFee.toHexString()).substr(2));
                // console.log(daoAgendaFee2.toString(16));
                // console.log(executingPeriod.toString(16));
                // console.log(wtonAmount.toString(16));
                // console.log("------------------------------------")
    
                const data1 = padLeft(newMinimumNoticePeriod.toString(16), 64);
                // console.log(data1)
                // const data2 = padLeft(daoAgendaFee.toHexString(), 64);
                // console.log(data2)
                // console.log(data2.substr(2));
                const data2 = padLeft(daoAgendaFee2.toString(16), 64);
                // console.log(data2)
                const data3 = padLeft(executingPeriod.toString(16), 64);
                // console.log(data3)
                // const data4 = padLeft(wtonAmount.toString(16), 64);
                // console.log(data4)
    
                const functionBytecode1 = selector1.concat(data1)
                const functionBytecode2 = selector2.concat(data2)
                const functionBytecode3 = selector3.concat(data3)
    
                targets.push(deployed.daoagendaManager.address);
                targets.push(deployed.daoagendaManager.address);
                targets.push(deployed.daoagendaManager.address);
                functionBytecodes.push(functionBytecode1)
                functionBytecodes.push(functionBytecode2)
                functionBytecodes.push(functionBytecode3)
    
                const param = Web3EthAbi.encodeParameters(
                    ["address[]", "uint128", "uint128", "bool", "bytes[]"],
                    [
                        targets, 
                        noticePeriod.toString(),
                        votingPeriod.toString(),
                        false,
                        functionBytecodes
                    ]
                )
    
                const beforeBalance = await deployed.ton.balanceOf(addr1.address);
                const agendaFee = await deployed.daoagendaManager.createAgendaFees();
                expect(agendaFee).to.be.gt(0);
    
                if (agendaFee.gt(beforeBalance))
                    await (await deployed.ton.connect(deployed.tonAdmin).mint(addr1.address, agendaFee)).wait();
                
                const beforeBalance2 = await deployed.ton.balanceOf(addr1.address);
    
                // agendaID = (await deployed.daoagendaManager.numAgendas()).sub(1);
                // console.log("beforeAgendaID : ", agendaID)
                // create agenda
                await deployed.ton.connect(addr1).approveAndCall(
                    DAOProxyLogicV2.address,
                    agendaFee,
                    param
                );
    
                const afterBalance = await deployed.ton.balanceOf(addr1.address);
                expect(afterBalance).to.be.lt(beforeBalance2);
                expect(beforeBalance2.sub(afterBalance)).to.be.equal(agendaFee);
    
                agendaID = (await deployed.daoagendaManager.numAgendas()).sub(1);
                //agendaId는 1증가 (multi Agenda여도 투표는 한번이다, 한번을 통해서 한번에 여러 function을 실행시킴)
                console.log("afterAgendaID : ", agendaID) 
    
                const executionInfo = await deployed.daoagendaManager.getExecutionInfo(agendaID);
                // console.log(executionInfo)
                // console.log(executionInfo[0][0])
                // console.log(executionInfo[1][0])
                expect(executionInfo[0][0]).to.be.equal(deployed.daoagendaManager.address)
                expect(executionInfo[0][1]).to.be.equal(deployed.daoagendaManager.address)
                expect(executionInfo[0][2]).to.be.equal(deployed.daoagendaManager.address)
                expect(executionInfo[1][0]).to.be.equal(functionBytecode1);
                expect(executionInfo[1][1]).to.be.equal(functionBytecode2);
                expect(executionInfo[1][2]).to.be.equal(functionBytecode3);
            })
    
            it('increase block time and check votable', async function () {
                const agenda = await deployed.daoagendaManager.agendas(agendaID);  
                const noticeEndTimestamp = agenda[AGENDA_INDEX_NOTICE_END_TIMESTAMP];
                await time.increaseTo(Number(noticeEndTimestamp));
                expect(await deployed.daoagendaManager.isVotableStatus(agendaID)).to.be.equal(true);
            });
    
            it(`cast vote`, async function () {
                await castVote(agendaID, candidates[0], VOTE_YES);
                await castVote(agendaID, candidates[1], VOTE_YES);
            });
    
            it("check vote result/status", async function () {
                const agenda = await deployed.daoagendaManager.agendas(agendaID);
                expect(agenda[AGENDA_INDEX_RESULT]).to.be.equal(AGENDA_RESULT_ACCEPTED);
                expect(agenda[AGENDA_INDEX_STATUS]).to.be.equal(AGENDA_STATUS_WAITING_EXEC);
            });
    
            it('increase block time', async function () {
                const agenda = await deployed.daoagendaManager.agendas(agendaID);  
                const noticeEndTimestamp = agenda[AGENDA_INDEX_VOTING_END_TIMESTAMP];
                await time.increaseTo(Number(noticeEndTimestamp)+1);
                expect(await deployed.daoagendaManager.isVotableStatus(agendaID)).to.be.equal(false);
            });
    
            it("execute & check functionBytes1,2,3 ", async function () {
                const beforeAgenda = await deployed.daoagendaManager.agendas(agendaID); 
                expect(beforeAgenda[AGENDA_INDEX_EXECUTED]).to.be.equal(false);
                const beforeExecutedInfo = await deployed.daoagendaManager.getExecutionInfo(agendaID);
                expect(beforeExecutedInfo.executeStartFrom).to.be.equal(0)
                
                const beforeValue = await deployed.daoagendaManager.minimumNoticePeriodSeconds();
                const beforeValue2 = await deployed.daoagendaManager.createAgendaFees();
                const beforeValue3 = await deployed.daoagendaManager.executingPeriodSeconds();
    
                const executeTx = await DAOProxyLogicV2.executeAgenda(agendaID);
    
                const afterValue = await deployed.daoagendaManager.minimumNoticePeriodSeconds();
                const afterValue2 = await deployed.daoagendaManager.createAgendaFees();
                const afterValue3 = await deployed.daoagendaManager.executingPeriodSeconds();
                expect(beforeValue).to.be.not.equal(afterValue);
                expect(beforeValue2).to.be.not.equal(afterValue2);
                expect(beforeValue3).to.be.not.equal(afterValue3);
                
                
                expect(afterValue).to.be.equal(150);
                // expect(afterValue2).to.be.equal(200000000000000000000);
                expect(afterValue2).to.be.equal(daoAgendaInfo.agendaFee2);
                expect(afterValue3).to.be.equal(300);
    
                const afterExecutedInfo = await deployed.daoagendaManager.getExecutionInfo(agendaID);
                expect(afterExecutedInfo.executeStartFrom).to.be.equal(3)
    
                const afterAgenda = await deployed.daoagendaManager.agendas(agendaID); 
                expect(afterAgenda[AGENDA_INDEX_EXECUTED]).to.be.equal(true);
                //afterAgenda[AGENDA_INDEX_EXECUTED_TIMESTAMP].should.be.bignumber.gt(toBN("0")); 
            });
        })

        describe("different targetAddress, different function test", () => {
            it("create Multi Agenda", async () => {
                const noticePeriod = await deployed.daoagendaManager.minimumNoticePeriodSeconds();
                const votingPeriod = await deployed.daoagendaManager.minimumVotingPeriodSeconds();
    
                let targets = [];
                let functionBytecodes = [];
    
                const selector1 = Web3EthAbi.encodeFunctionSignature("setMinimumNoticePeriodSeconds(uint256)");
                const selector2 = Web3EthAbi.encodeFunctionSignature("setCreateAgendaFees(uint256)");
                const selector3 = Web3EthAbi.encodeFunctionSignature("increaseMaxMember(uint256,uint256)");
    
                const newMinimumNoticePeriod = 100
                const daoAgendaFee = daoAgendaInfo.agendaFee
                const daoAgendaFee2 = 100000000000000000000
                // console.log("daoAgendaFee :", daoAgendaFee);
                const maxMember = 4
                const quorum = 3
                const wtonAmount = 1000000000000000000000000000

    
                const data1 = padLeft(newMinimumNoticePeriod.toString(16), 64);
                const data2 = padLeft(daoAgendaFee2.toString(16), 64);
                const data3 = padLeft(maxMember.toString(16), 64);
                const data4 = padLeft(quorum.toString(16), 64);
                const data5 = data3 + data4
                console.log(data5);
    
                const functionBytecode1 = selector1.concat(data1)
                const functionBytecode2 = selector2.concat(data2)
                const functionBytecode3 = selector3.concat(data5)
    
                targets.push(deployed.daoagendaManager.address);
                targets.push(deployed.daoagendaManager.address);
                targets.push(DAOProxyLogicV2.address);
                functionBytecodes.push(functionBytecode1)
                functionBytecodes.push(functionBytecode2)
                functionBytecodes.push(functionBytecode3)
    
                const param = Web3EthAbi.encodeParameters(
                    ["address[]", "uint128", "uint128", "bool", "bytes[]"],
                    [
                        targets, 
                        noticePeriod.toString(),
                        votingPeriod.toString(),
                        false,
                        functionBytecodes
                    ]
                )
    
                const beforeBalance = await deployed.ton.balanceOf(addr1.address);
                const agendaFee = await deployed.daoagendaManager.createAgendaFees();
                expect(agendaFee).to.be.gt(0);
    
                if (agendaFee.gt(beforeBalance))
                    await (await deployed.ton.connect(deployed.tonAdmin).mint(addr1.address, agendaFee)).wait();
                
                const beforeBalance2 = await deployed.ton.balanceOf(addr1.address);
    
                agendaID = (await deployed.daoagendaManager.numAgendas()).sub(1);
                console.log("beforeAgendaID : ", agendaID)
                // create agenda
                await deployed.ton.connect(addr1).approveAndCall(
                    DAOProxyLogicV2.address,
                    agendaFee,
                    param
                );
    
                const afterBalance = await deployed.ton.balanceOf(addr1.address);
                expect(afterBalance).to.be.lt(beforeBalance2);
                expect(beforeBalance2.sub(afterBalance)).to.be.equal(agendaFee);
    
                agendaID = (await deployed.daoagendaManager.numAgendas()).sub(1);
                console.log("afterAgendaID : ", agendaID)
    
                const executionInfo = await deployed.daoagendaManager.getExecutionInfo(agendaID);
                // console.log(executionInfo)
                // console.log(executionInfo[0][0])
                // console.log(executionInfo[1][0])
                expect(executionInfo[0][0]).to.be.equal(deployed.daoagendaManager.address)
                expect(executionInfo[0][1]).to.be.equal(deployed.daoagendaManager.address)
                expect(executionInfo[0][2]).to.be.equal(DAOProxyLogicV2.address)
                expect(executionInfo[1][0]).to.be.equal(functionBytecode1);
                expect(executionInfo[1][1]).to.be.equal(functionBytecode2);
                expect(executionInfo[1][2]).to.be.equal(functionBytecode3);
            })

            it('increase block time and check votable', async function () {
                const agenda = await deployed.daoagendaManager.agendas(agendaID);  
                const noticeEndTimestamp = agenda[AGENDA_INDEX_NOTICE_END_TIMESTAMP];
                await time.increaseTo(Number(noticeEndTimestamp));
                expect(await deployed.daoagendaManager.isVotableStatus(agendaID)).to.be.equal(true);
            });
    
            it(`cast vote`, async function () {
                await castVote(agendaID, candidates[0], VOTE_YES);
                await castVote(agendaID, candidates[1], VOTE_YES);
            });
    
            it("check vote result/status", async function () {
                const agenda = await deployed.daoagendaManager.agendas(agendaID);
                expect(agenda[AGENDA_INDEX_RESULT]).to.be.equal(AGENDA_RESULT_ACCEPTED);
                expect(agenda[AGENDA_INDEX_STATUS]).to.be.equal(AGENDA_STATUS_WAITING_EXEC);
            });
    
            it('increase block time', async function () {
                const agenda = await deployed.daoagendaManager.agendas(agendaID);  
                const noticeEndTimestamp = agenda[AGENDA_INDEX_VOTING_END_TIMESTAMP];
                await time.increaseTo(Number(noticeEndTimestamp)+1);
                expect(await deployed.daoagendaManager.isVotableStatus(agendaID)).to.be.equal(false);
            });
    
            it("execute & check functionBytes1,2,3 ", async function () {
                const beforeAgenda = await deployed.daoagendaManager.agendas(agendaID); 
                expect(beforeAgenda[AGENDA_INDEX_EXECUTED]).to.be.equal(false);
                const beforeExecutedInfo = await deployed.daoagendaManager.getExecutionInfo(agendaID);
                expect(beforeExecutedInfo.executeStartFrom).to.be.equal(0)
                
                const beforeValue = await deployed.daoagendaManager.minimumNoticePeriodSeconds();
                const beforeValue2 = await deployed.daoagendaManager.createAgendaFees();
                const beforeValue3 = await DAOProxyLogicV2.maxMember();
                const beforeValue4 = await DAOProxyLogicV2.quorum();
    
                const executeTx = await DAOProxyLogicV2.executeAgenda(agendaID);
    
                const afterValue = await deployed.daoagendaManager.minimumNoticePeriodSeconds();
                const afterValue2 = await deployed.daoagendaManager.createAgendaFees();
                const afterValue3 = await DAOProxyLogicV2.maxMember();
                const afterValue4 = await DAOProxyLogicV2.quorum();
                expect(beforeValue).to.be.not.equal(afterValue);
                expect(beforeValue2).to.be.not.equal(afterValue2);
                expect(beforeValue3).to.be.not.equal(afterValue3);
                expect(beforeValue4).to.be.not.equal(afterValue4);
                
                
                expect(afterValue).to.be.equal(100);
                expect(afterValue2).to.be.equal(daoAgendaInfo.agendaFee);
                expect(afterValue3).to.be.equal(4);
                expect(afterValue4).to.be.equal(3);
    
                const afterExecutedInfo = await deployed.daoagendaManager.getExecutionInfo(agendaID);
                expect(afterExecutedInfo.executeStartFrom).to.be.equal(3)
    
                const afterAgenda = await deployed.daoagendaManager.agendas(agendaID); 
                expect(afterAgenda[AGENDA_INDEX_EXECUTED]).to.be.equal(true);
                //afterAgenda[AGENDA_INDEX_EXECUTED_TIMESTAMP].should.be.bignumber.gt(toBN("0")); 
            });
        })
    })

    describe("#11. callTest", () => {
        it("just calldata check", async () => {
            const selector1 = Web3EthAbi.encodeFunctionSignature("setMinimumNoticePeriodSeconds(uint256)");
            const newMinimumNoticePeriod = 150
            const data1 = padLeft(newMinimumNoticePeriod.toString(16), 64);
        })
    })
})