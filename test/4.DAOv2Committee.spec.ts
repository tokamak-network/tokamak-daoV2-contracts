import { expect } from './shared/expect'
import { ethers, network } from 'hardhat'

import { Signer } from 'ethers'
import {daostakingV2Fixtures, getLayerKey} from './shared/fixtures'
import { DAOStakingV2Fixture } from './shared/fixtureInterfaces'
import snapshotGasCost from './shared/snapshotGasCost'

import DAOv1CommitteProxy_ABI from '../abi/DAOCommitteeProxy.json'
import DAOv2Committee_ABI from '../artifacts/contracts/dao/DAOv2Committee.sol/DAOv2Committee.json'
import DAOv2CommitteeV2_ABI from '../artifacts/contracts/dao/DAOv2CommitteeV2.sol/DAOv2CommitteeV2.json'

// DAOProxy(기존 것)
// DAOv2Committe(새로배포) 
// DAOVault(메인넷에 있는 것 사용)
// DAOAgendaManager(메인넷에 있는 것 사용)는 메인넷 Contract에서 Owner를 변경하는 방식으로 사용
// 기존 Proxy에 새로운 V2로직을 연동하여서 V2에 대한 새로운 DAO를 테스트
describe('DAOv2Committee', () => {
    let deployer: Signer, addr1: Signer, sequencer1: Signer, daoPrivateOwner: Signer

    let candidate1: Signer, candidate2: Signer, candidate3: Signer

    let deployed: DAOStakingV2Fixture
    
    let daoCommitteProxyAddress = "0xDD9f0cCc044B0781289Ee318e5971b0139602C26"; //DAOCommitteProxy Address
    let daoAdminAddress = "0xb4983da083a5118c903910db4f5a480b1d9f3687"
    let daoCommitteV1Address = "0xd1A3fDDCCD09ceBcFCc7845dDba666B7B8e6D1fb";
    let tonAddress = "0x2be5e8c109e2197D077D13A82dAead6a9b3433C5";
    let daoValutAddress = "0x2520CD65BAa2cEEe9E6Ad6EBD3F45490C42dd303";
    let agendaMangerAddress = "0xcD4421d082752f363E1687544a09d5112cD4f484";
    let seigMangerAddress = "0x710936500aC59e8551331871Cbad3D33d5e0D909";
    let layer2RegistryAddress = "0x0b3E174A2170083e770D5d4Cf56774D221b7063e";

    let DAOProxy: any
    let DAOProxyLogicV2: any
    let DAOOwner: any
    
    let daoAdmin: Signer

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
    }

    let sequencerInfo = {
        tonAmount1: ethers.utils.parseEther("300")
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
            console.log("DAO logicV2 Address :",deployed.daov2committeeV2.address);
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
                let rates = {
                    ratesDao: 5000,           // 0.5 , 0.002 %
                    ratesStosHolders: 2000,  // 0.2
                    ratesTonStakers: 3000,   // 0.3
                    ratesUnits: 10000
                }
    
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
                    DAOProxyLogicV2.address,
                    deployed.stosDistribute.address
                )
            
                expect(await deployed.seigManagerV2.dao()).to.eq(DAOProxyLogicV2.address)
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
        })


    })
})