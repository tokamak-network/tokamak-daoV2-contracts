import { expect } from './shared/expect'
import { ethers, network } from 'hardhat'

import { Signer } from 'ethers'
// import {daostakingV2Fixtures, getLayerKey} from './shared/fixtures'
// import { DAOStakingV2Fixture } from './shared/fixtureInterfaces'
import snapshotGasCost from './shared/snapshotGasCost'

import DAOv1Committee_ABI from '../abi/DAOCommittee.json'
import DAOv1CommitteProxy_ABI from '../abi/DAOCommitteeProxy.json'
import DAOv2Committee_ABI from '../artifacts/contracts/dao/DAOv2Committee.sol/DAOv2Committee.json'

// DAOProxy(기존 것)
// DAOv2Committe(새로배포) 
// DAOVault(메인넷에 있는 것 사용)
// DAOAgendaManager(메인넷에 있는 것 사용)는 메인넷 Contract에서 Owner를 변경하는 방식으로 사용
// 기존 Proxy에 새로운 V2로직을 연동하여서 V2에 대한 새로운 DAO를 테스트
describe('DAOv2Committee', () => {
    let deployer: Signer, addr1: Signer, sequencer1: Signer, daoPrivateOwner: Signer

    // let deployed: DAOStakingV2Fixture
    
    //mainnet
    let daoCommitteProxyAddress = "0xDD9f0cCc044B0781289Ee318e5971b0139602C26"; //DAOCommitteProxy Address
    let daoCommitteV1Address = "0xd1A3fDDCCD09ceBcFCc7845dDba666B7B8e6D1fb";
    let tonAddress = "0x2be5e8c109e2197D077D13A82dAead6a9b3433C5";
    let daoValutAddress = "0x2520CD65BAa2cEEe9E6Ad6EBD3F45490C42dd303";
    let agendaMangerAddress = "0xcD4421d082752f363E1687544a09d5112cD4f484";
    let seigMangerAddress = "0x710936500aC59e8551331871Cbad3D33d5e0D909";

    let DAOProxy: any
    let DAOProxyLogicV1: any
    let DAOProxyLogicV2: any
    let DAOOwner: any
    
    let DAOContract: any
    let DAOCommitteLogicV2: any

    let accounts, admin1: Signer, admin2: Signer, user1: Signer, user2: Signer, candidate: Signer, sequencer: Signer, layer2Manager: Signer, seigManagerV2: Signer

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

    before('test account setting', async () => {
        accounts = await ethers.getSigners();
        [admin1, admin2, user1, user2, candidate, sequencer, layer2Manager, seigManagerV2 ] = accounts;
        console.log(admin1.address);

        await ethers.provider.send("hardhat_impersonateAccount",[daoCommitteProxyAddress]);


        DAOContract = await ethers.getSigner(daoCommitteProxyAddress); 

        await ethers.provider.send("hardhat_setBalance", [
            DAOContract.address,
            "0x8ac7230489e80000",
        ]);
    })

    describe("#0. setting DAOProxy and daov2Committe", () => {
        it("deploy DAOCommitteV2", async () => {
            let contract = await ethers.getContractFactory("DAOv2Committee");
            DAOCommitteLogicV2 = await contract.connect(admin1).deploy();

            let code = await ethers.provider.getCode(DAOCommitteLogicV2.address);
            expect(code).to.not.eq("0x");
        })

        it("get DAOProxyContract", async () => {
            DAOProxy = await ethers.getContractAt(DAOv1CommitteProxy_ABI.abi, daoCommitteProxyAddress, deployer)

            let address = await DAOProxy.connect(DAOContract).ton();
            expect(address).to.be.eq(tonAddress);
            
            let address2 = await DAOProxy.implementation();
            expect(address2).to.be.eq(daoCommitteV1Address);
        })

        it("get DAOProxyLogicV1 Contract", async () => {
            DAOProxyLogicV1 = await ethers.getContractAt(DAOv1Committee_ABI.abi, daoCommitteProxyAddress, deployer); 
            expect((await DAOProxyLogicV1.ton())).to.be.eq(await DAOProxy.ton());
            expect((await DAOProxyLogicV1.seigManager())).to.be.eq(seigMangerAddress);
            expect((await DAOProxyLogicV1.daoVault())).to.be.eq(daoValutAddress);
            expect((await DAOProxyLogicV1.agendaManager())).to.be.eq(agendaMangerAddress);
        })

        it("set DAOProxy upgradeTo DAOCommitteLogicV2", async () => {
            await DAOProxy.connect(DAOContract).upgradeTo(DAOCommitteLogicV2.address);
            expect((await DAOProxy.implementation())).to.be.eq(DAOCommitteLogicV2.address);
        })


        it("get DAOProxyLogicV2 Contract", async () => {
            DAOProxyLogicV2 = await ethers.getContractAt(DAOv2Committee_ABI.abi, daoCommitteProxyAddress, deployer); 
            expect((await DAOProxyLogicV2.ton())).to.be.eq(await DAOProxy.ton());
            expect((await DAOProxyLogicV2.seigManager())).to.be.eq(seigMangerAddress);
            expect((await DAOProxyLogicV2.daoVault())).to.be.eq(daoValutAddress);
        })
    })

    describe("#1. DAOv2Committee set", () => {
        describe("#7-1. initialize setting", () => {
            it("grantRole", async () => {
                await DAOProxyLogicV2.connect(DAOContract).grantRole(
                    "0x0000000000000000000000000000000000000000000000000000000000000000",
                    admin1.address
                )

                expect(await DAOProxyLogicV2.connect(DAOContract).hasRole(
                    "0x0000000000000000000000000000000000000000000000000000000000000000",
                    admin1.address
                )).to.be.equal(true)
            })
            it("setSeigManagerV2 can not by not owner", async () => {
                // console.log(DAOProxyLogicV2)
                await expect(
                    DAOProxyLogicV2.connect(user1).setSeigManagerV2(
                        seigManagerV2.address,
                    )
                ).to.be.revertedWith("DAOCommitteeV2: msg.sender is not an admin") 
            })

            it("setSeigManagerV2 can by only owner", async () => {
                await DAOProxyLogicV2.connect(DAOContract).setSeigManagerV2(
                    seigManagerV2.address,
                );
                expect(await DAOProxyLogicV2.seigManagerV2()).to.be.eq(seigManagerV2.address);
                // expect(await DAOProxyLogicV2.ton()).to.be.eq(tonAddress);
                // console.log(await DAOProxyLogicV2.seigManagerV2());
                // expect(await DAOProxyLogicV2.agendaManager()).to.be.eq(deployed.daoagendaManager.address);
                // expect(await DAOProxyLogicV2.daoVault()).to.be.eq(deployed.daovault.address);
            })

            it("setDaoVault can not by not owner", async () => {
                console.log("1");
                await expect(
                    DAOProxyLogicV2.connect(user1).setDaoVault(
                        user2.address,
                    )
                ).to.be.revertedWith("DAOCommitteeV2: msg.sender is not an admin") 
            })

            it("setDaoVault can by only owner", async () => {
                await DAOProxyLogicV2.connect(DAOContract).setDaoVault(
                    user2.address,
                );
                console.log(user2.address)
                expect(await DAOProxyLogicV2.daoVault()).to.be.eq(user2.address);
                // await DAOProxyLogicV2.connect(DAOContract).setDaoVault(
                //     daoValutAddress,
                // );
                // expect(await DAOProxyLogicV2.daoVault()).to.be.eq(daoValutAddress);
                // expect(await DAOProxyLogicV2.ton()).to.be.eq(tonAddress);
                // console.log(await DAOProxyLogicV2.seigManagerV2());
                // expect(await DAOProxyLogicV2.seigManagerV2()).to.be.eq(seigManagerV2.address);
                // expect(await DAOProxyLogicV2.agendaManager()).to.be.eq(deployed.daoagendaManager.address);
                // expect(await deployed.daov2committeeProxy.layer2Manager()).to.be.eq(deployed.layer2ManagerProxy.address);
                // expect(await deployed.daov2committeeProxy.candidate()).to.be.eq(deployed.candidateProxy.address);
                // expect(await deployed.daov2committeeProxy.sequencer()).to.be.eq(deployed.optimismSequencerProxy.address);
            })
        })

        // describe("#7-2. transferOwnership", () => {
        //     it("transferOwnership can not by not owner", async () => {
        //         await expect(
        //             deployed.daov2committeeProxy.connect(addr1).transferAdmin(
        //                 daoPrivateOwner.address
        //             )
        //         ).to.be.revertedWith("Accessible: Caller is not an admin") 
        //     })

        //     it("transferOwnership by only owner", async () => {
        //         await deployed.daov2committeeProxy.connect(deployer).transferAdmin(
        //             daoPrivateOwner.address
        //         );
        //         expect(await deployed.daov2committeeProxy.isAdmin(daoPrivateOwner.address)).to.be.eq(true);
        //         expect(await deployed.daov2committeeProxy.isAdmin(deployed.daov2committeeProxy.address)).to.be.eq(true);
        //     })
        // })

        describe("#7-3. createCandidate", () => {

        })

        describe("#7-4. createSequencerCandidate", () => {

        })
    })
})