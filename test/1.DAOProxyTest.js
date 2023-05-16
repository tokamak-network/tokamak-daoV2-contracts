const chai = require("chai");
const { expect } = require("chai");

const { solidity } = require("ethereum-waffle");
chai.use(solidity);

// const { time } = require("@openzeppelin/test-helpers");
const { toBN, toWei, keccak256, fromWei } = require("web3-utils");

// const { getAddresses, findSigner, setupContracts } = require("./utils");
const { ethers, network } = require("hardhat");

const DAOCommitteeProxy_ABI = require("../abi/DAOCommitteeProxy.json");
const DAOv2Committee_ABI = require("../artifacts/contracts/dao/DAOv2Committee.sol/DAOv2Committee.json");

describe("1. DAOProxy Test", () => {
    let daoCommitteProxyAddress = "0xDD9f0cCc044B0781289Ee318e5971b0139602C26";

    let DAOContract;
    let DAOProxy;
    let DAOProxyLogicV2;

    let DAOCommitteLogicV2;

    

    before('set account',async () => {
        accounts = await ethers.getSigners();
        [admin1, admin2, user1, user2, user3, user4, proxyAdmin, proxyAdmin2 ] = accounts;
        console.log(admin1.address);

        await ethers.provider.send("hardhat_impersonateAccount",[daoCommitteProxyAddress]);
        
        
        DAOContract = await ethers.getSigner(daoCommitteProxyAddress); 
        
        await ethers.provider.send("hardhat_setBalance", [
            DAOContract.address,
            "0x8ac7230489e80000",
        ]);
        
    })

    describe("#0. setting DAOProxyContract", () => {
        it("deploy DAOCommitteV2", async () => {
            let contract = await ethers.getContractFactory("DAOv2Committee");
            DAOCommitteLogicV2 = await contract.connect(admin1).deploy();

            let code = await ethers.provider.getCode(DAOCommitteLogicV2.address);
            expect(code).to.not.eq("0x");
        })
        it("get DAOProxyContract", async () => {
            DAOProxy = new ethers.Contract(daoCommitteProxyAddress, DAOCommitteeProxy_ABI.abi, ethers.provider );
            // console.log(DAOProxy)
            let address = await DAOProxy.connect(DAOContract).ton();
            console.log("logic upgradeTo : ",address);
        })

        it("set DAOProxy <-> DAOCommitteLogicV2", async () => {
            await DAOProxy.connect(DAOContract).upgradeTo(DAOCommitteLogicV2.address);
            console.log("DAO logicV2 Address :",DAOCommitteLogicV2.address);
            let address = await DAOProxy.connect(DAOContract).ton();
            console.log("logic upgradeTo : ",address);
        })

        it("get DAOProxyLogicV2 Contract", async () => {
            DAOProxyLogicV2 = new ethers.Contract(daoCommitteProxyAddress, DAOv2Committee_ABI.abi, ethers.provider );
        })
    })
})