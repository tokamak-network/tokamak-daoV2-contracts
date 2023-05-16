import { expect } from './shared/expect'
import { ethers, network } from 'hardhat'

import { Signer } from 'ethers'
import {daostakingV2Fixtures, getLayerKey} from './shared/fixtures'
import { DAOStakingV2Fixture } from './shared/fixtureInterfaces'
import snapshotGasCost from './shared/snapshotGasCost'

import DAOv1CommitteProxy_ABI from '../abi/DAOCommitteeProxy.json'
import DAOv2Committee_ABI from '../artifacts/contracts/dao/DAOv2Committee.sol/DAOv2Committee.json'

// DAOProxy(기존 것)
// DAOv2Committe(새로배포) 
// DAOVault(메인넷에 있는 것 사용)
// DAOAgendaManager(메인넷에 있는 것 사용)는 메인넷 Contract에서 Owner를 변경하는 방식으로 사용
// 기존 Proxy에 새로운 V2로직을 연동하여서 V2에 대한 새로운 DAO를 테스트
describe('DAOv2Committee', () => {
    let deployer: Signer, addr1: Signer, sequencer1: Signer, daoPrivateOwner: Signer

    let deployed: DAOStakingV2Fixture
    
    let daoCommitteProxyAddress = "0xDD9f0cCc044B0781289Ee318e5971b0139602C26"; //DAOCommitteProxy Address

    let DAOProxy: any
    let DAOProxyLogicV2: any
    let DAOOwner: any
    

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
        minimumNoticePeriodSeconds: 100,
        minimumVotingPeriodSeconds: 200
    }

    before('create fixture loader', async () => {
        deployed = await daostakingV2Fixtures()
        deployer = deployed.deployer;
        addr1 = deployed.addr1;
        sequencer1 = deployed.sequencer1;
        daoPrivateOwner = deployed.daoPrivateOwner;
    })

    describe("#0. setting DAOProxy and daov2Committe", () => {
        it("connect DAOProxy", async () => {
            DAOProxy = await ethers.getContractAt(DAOv1CommitteProxy_ABI.abi, daoCommitteProxyAddress, deployer)
        })

        it("DAOProxy upgradeTo logicV2", async () => {
            await ethers.provider.send("hardhat_impersonateAccount",[daoCommitteProxyAddress]);
            DAOOwner = await ethers.getSigner(daoCommitteProxyAddress);
            await DAOProxy.connect(DAOOwner).upgradeTo(deployed.daov2committee.address);
        })

        it("connect DAOProxyLogicV2", async () => {
            DAOProxyLogicV2 = await ethers.getContractAt(DAOv2Committee_ABI.abi, daoCommitteProxyAddress, deployer); 
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
                    deployed.daov2committeeProxy.address,
                    deployed.stosDistribute.address
                )
            
                // console.log(await deployed.seigManagerV2.dao());
                // console.log(deployed.daov2committeeProxy.address);
                expect(await deployed.seigManagerV2.dao()).to.eq(deployed.daov2committeeProxy.address)
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

    describe("#5. DAOagendaManager set", () => {
        describe("#5-1. Values to be set initialize & Values to change for testing", async () => {
            it("set minimumNoticePeriodSeconds can not by not DAOContract", async () => {
                await expect(
                    deployed.daoagendaManager.connect(addr1).setMinimumNoticePeriodSeconds(daoAgendaInfo.minimumNoticePeriodSeconds)
                ).to.be.revertedWith("Ownable: caller is not the owner")
            })

            it("set minimumNoticePeriodSeconds by only DAOContract", async () => {
                await deployed.daoagendaManager.connect(deployed.DAOContract).setMinimumNoticePeriodSeconds(daoAgendaInfo.minimumNoticePeriodSeconds);
                expect(await deployed.daoagendaManager.minimumNoticePeriodSeconds()).to.be.eq(daoAgendaInfo.minimumNoticePeriodSeconds)
            })

            it("set minimumVotingPeriodSeconds can not by not DAOContract", async () => {
                await expect(
                    deployed.daoagendaManager.connect(addr1).setMinimumVotingPeriodSeconds(daoAgendaInfo.minimumVotingPeriodSeconds)
                ).to.be.revertedWith("Ownable: caller is not the owner") 
            })

            it("set minimumVotingPeriodSeconds by only DAOContract", async () => {
                await deployed.daoagendaManager.connect(deployed.DAOContract).setMinimumVotingPeriodSeconds(daoAgendaInfo.minimumVotingPeriodSeconds);
                expect(await deployed.daoagendaManager.minimumVotingPeriodSeconds()).to.be.eq(daoAgendaInfo.minimumVotingPeriodSeconds)
            })

            it("set committee can not by not DAOContract", async () => {
                await expect(
                    deployed.daoagendaManager.connect(addr1).setCommittee(deployed.daov2committeeProxy.address)
                ).to.be.revertedWith("Ownable: caller is not the owner") 
            })

            it("set committee by only DAOContract", async () => {
                await deployed.daoagendaManager.connect(deployed.DAOContract).setCommittee(deployed.daov2committeeProxy.address);
                expect(await deployed.daoagendaManager.committee()).to.be.eq(deployed.daov2committeeProxy.address);
            })

            it("set transferOwnership can not by not DAOContract", async () => {
                await expect(
                    deployed.daoagendaManager.connect(addr1).setMinimumVotingPeriodSeconds(deployed.daov2committeeProxy.address)
                ).to.be.revertedWith("Ownable: caller is not the owner") 
            })

            it("set transferOwnership to committee by only DAOContract", async () => {
                await deployed.daoagendaManager.connect(deployed.DAOContract).transferOwnership(deployed.daov2committeeProxy.address);
                expect(await deployed.daoagendaManager.owner()).to.be.eq(deployed.daov2committeeProxy.address);
            })
        })
    })

    describe("#6. DAOVault set", () => {
        describe("#6-1. transferOwnership", async () => {
            it("set transferOwnership to committee by only DAOContract", async () => {
                await deployed.daovault.connect(deployed.DAOContract).transferOwnership(deployed.daov2committeeProxy.address);
                expect(await deployed.daovault.owner()).to.be.eq(deployed.daov2committeeProxy.address);
            })
        })
    })

    describe("#7. DAOv2Committee set", () => {
        describe("#7-1. initialize", () => {
            it("initialize can not by not owner", async () => {
                await expect(
                    deployed.daov2committeeProxy.connect(addr1).initialize(
                        deployed.ton.address,
                        deployed.seigManagerV2Proxy.address,
                        deployed.layer2ManagerProxy.address,
                        deployed.daoagendaManager.address,
                        deployed.candidateProxy.address,
                        deployed.optimismSequencerProxy.address,
                        deployed.daovault.address
                    )
                ).to.be.revertedWith("Accessible: Caller is not an admin") 
            })

            it("initialize can by only owner", async () => {
                await deployed.daov2committeeProxy.connect(deployer).initialize(
                    deployed.ton.address,
                    deployed.seigManagerV2Proxy.address,
                    deployed.layer2ManagerProxy.address,
                    deployed.daoagendaManager.address,
                    deployed.candidateProxy.address,
                    deployed.optimismSequencerProxy.address,
                    deployed.daovault.address
                );
                expect(await deployed.daov2committeeProxy.ton()).to.be.eq(deployed.ton.address);
                expect(await deployed.daov2committeeProxy.seigManagerV2()).to.be.eq(deployed.seigManagerV2Proxy.address);
                expect(await deployed.daov2committeeProxy.layer2Manager()).to.be.eq(deployed.layer2ManagerProxy.address);
                expect(await deployed.daov2committeeProxy.agendaManager()).to.be.eq(deployed.daoagendaManager.address);
                expect(await deployed.daov2committeeProxy.candidate()).to.be.eq(deployed.candidateProxy.address);
                expect(await deployed.daov2committeeProxy.sequencer()).to.be.eq(deployed.optimismSequencerProxy.address);
                expect(await deployed.daov2committeeProxy.daoVault()).to.be.eq(deployed.daovault.address);
            })
        })

        describe("#7-2. transferOwnership", () => {
            it("transferOwnership can not by not owner", async () => {
                await expect(
                    deployed.daov2committeeProxy.connect(addr1).transferAdmin(
                        daoPrivateOwner.address
                    )
                ).to.be.revertedWith("Accessible: Caller is not an admin") 
            })

            it("transferOwnership by only owner", async () => {
                await deployed.daov2committeeProxy.connect(deployer).transferAdmin(
                    daoPrivateOwner.address
                );
                expect(await deployed.daov2committeeProxy.isAdmin(daoPrivateOwner.address)).to.be.eq(true);
                expect(await deployed.daov2committeeProxy.isAdmin(deployed.daov2committeeProxy.address)).to.be.eq(true);
            })
        })

        describe("#7-3. createCandidate", () => {

        })

        describe("#7-4. createSequencerCandidate", () => {

        })
    })
})