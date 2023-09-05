"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContractArtifactTokamakDaoV2 = void 0;
let AccessControl;
try {
    AccessControl = require('../artifacts/contracts/AccessControl/AccessControl.sol/AccessControl.json');
}
catch { }
let Address;
try {
    Address = require('../artifacts/contracts/AccessControl/Address.sol/Address.json');
}
catch { }
let EnumerableSet;
try {
    EnumerableSet = require('../artifacts/contracts/AccessControl/EnumerableSet.sol/EnumerableSet.json');
}
catch { }
let ERC165A;
try {
    ERC165A = require('../artifacts/contracts/AccessControl/ERC165A.sol/ERC165A.json');
}
catch { }
let AccessibleCommon;
try {
    AccessibleCommon = require('../artifacts/contracts/common/AccessibleCommon.sol/AccessibleCommon.json');
}
catch { }
let AccessRoleCommon;
try {
    AccessRoleCommon = require('../artifacts/contracts/common/AccessRoleCommon.sol/AccessRoleCommon.json');
}
catch { }
let ProxyAccessCommon;
try {
    ProxyAccessCommon = require('../artifacts/contracts/common/ProxyAccessCommon.sol/ProxyAccessCommon.json');
}
catch { }
let DAOCommitteeProxyV2;
try {
    DAOCommitteeProxyV2 = require('../artifacts/contracts/dao/DAOCommitteeProxyV2.sol/DAOCommitteeProxyV2.json');
}
catch { }
let DAOv1Committee;
try {
    DAOv1Committee = require('../artifacts/contracts/dao/DAOv1Committee.sol/DAOv1Committee.json');
}
catch { }
let DAOv2Committee;
try {
    DAOv2Committee = require('../artifacts/contracts/dao/DAOv2Committee.sol/DAOv2Committee.json');
}
catch { }
let DAOv2CommitteeV1;
try {
    DAOv2CommitteeV1 = require('../artifacts/contracts/dao/DAOv2CommitteeV1.sol/DAOv2CommitteeV1.json');
}
catch { }
let DAOv2CommitteeV2;
try {
    DAOv2CommitteeV2 = require('../artifacts/contracts/dao/DAOv2CommitteeV2.sol/DAOv2CommitteeV2.json');
}
catch { }
let IStakeManagerV2;
try {
    IStakeManagerV2 = require('../artifacts/contracts/dao/DAOv2CommitteeV2.sol/IStakeManagerV2.json');
}
catch { }
let StorageStateCommittee;
try {
    StorageStateCommittee = require('../artifacts/contracts/dao/StorageStateCommittee.sol/StorageStateCommittee.json');
}
catch { }
let StorageStateCommitteeV2;
try {
    StorageStateCommitteeV2 = require('../artifacts/contracts/dao/StorageStateCommitteeV2.sol/StorageStateCommitteeV2.json');
}
catch { }
let ICandidateFactory;
try {
    ICandidateFactory = require('../artifacts/contracts/interfaces/ICandidateFactory.sol/ICandidateFactory.json');
}
catch { }
let ICandidateV2;
try {
    ICandidateV2 = require('../artifacts/contracts/interfaces/ICandidateV2.sol/ICandidateV2.json');
}
catch { }
let IDAOAgendaManager;
try {
    IDAOAgendaManager = require('../artifacts/contracts/interfaces/IDAOAgendaManager.sol/IDAOAgendaManager.json');
}
catch { }
let IDAOCommittee;
try {
    IDAOCommittee = require('../artifacts/contracts/interfaces/IDAOCommittee.sol/IDAOCommittee.json');
}
catch { }
let IDAOv2Committee;
try {
    IDAOv2Committee = require('../artifacts/contracts/interfaces/IDAOv2Committee.sol/IDAOv2Committee.json');
}
catch { }
let IDAOVault;
try {
    IDAOVault = require('../artifacts/contracts/interfaces/IDAOVault.sol/IDAOVault.json');
}
catch { }
let ILayer2;
try {
    ILayer2 = require('../artifacts/contracts/interfaces/ILayer2.sol/ILayer2.json');
}
catch { }
let ILayer2Manager;
try {
    ILayer2Manager = require('../artifacts/contracts/interfaces/ILayer2Manager.sol/ILayer2Manager.json');
}
catch { }
let ILayer2Registry;
try {
    ILayer2Registry = require('../artifacts/contracts/interfaces/ILayer2Registry.sol/ILayer2Registry.json');
}
catch { }
let IOptimismSequencer;
try {
    IOptimismSequencer = require('../artifacts/contracts/interfaces/IOptimismSequencer.sol/IOptimismSequencer.json');
}
catch { }
let IProxyAction;
try {
    IProxyAction = require('../artifacts/contracts/interfaces/IProxyAction.sol/IProxyAction.json');
}
catch { }
let IProxyEvent;
try {
    IProxyEvent = require('../artifacts/contracts/interfaces/IProxyEvent.sol/IProxyEvent.json');
}
catch { }
let ISeigManager;
try {
    ISeigManager = require('../artifacts/contracts/interfaces/ISeigManager.sol/ISeigManager.json');
}
catch { }
let ISeigManagerV2;
try {
    ISeigManagerV2 = require('../artifacts/contracts/interfaces/ISeigManagerV2.sol/ISeigManagerV2.json');
}
catch { }
let IStaking;
try {
    IStaking = require('../artifacts/contracts/interfaces/IStaking.sol/IStaking.json');
}
catch { }
let IStorageStateCommittee;
try {
    IStorageStateCommittee = require('../artifacts/contracts/interfaces/IStorageStateCommittee.sol/IStorageStateCommittee.json');
}
catch { }
let IWTON;
try {
    IWTON = require('../artifacts/contracts/interfaces/IWTON.sol/IWTON.json');
}
catch { }
let LibAgenda;
try {
    LibAgenda = require('../artifacts/contracts/lib/Agenda.sol/LibAgenda.json');
}
catch { }
let BytesLib;
try {
    BytesLib = require('../artifacts/contracts/libraries/BytesLib.sol/BytesLib.json');
}
catch { }
let BytesParserLib;
try {
    BytesParserLib = require('../artifacts/contracts/libraries/BytesParserLib.sol/BytesParserLib.json');
}
catch { }
let Layer2;
try {
    Layer2 = require('../artifacts/contracts/libraries/Layer2.sol/Layer2.json');
}
catch { }
let LibArrays;
try {
    LibArrays = require('../artifacts/contracts/libraries/LibArrays.sol/LibArrays.json');
}
catch { }
let LibDaoV2;
try {
    LibDaoV2 = require('../artifacts/contracts/libraries/LibDaoV2.sol/LibDaoV2.json');
}
catch { }
let LibMath;
try {
    LibMath = require('../artifacts/contracts/libraries/LibMath.sol/LibMath.json');
}
catch { }
let LibOperator;
try {
    LibOperator = require('../artifacts/contracts/libraries/LibOperator.sol/LibOperator.json');
}
catch { }
let LibOptimism;
try {
    LibOptimism = require('../artifacts/contracts/libraries/LibOptimism.sol/LibOptimism.json');
}
catch { }
let LibStake;
try {
    LibStake = require('../artifacts/contracts/libraries/LibStake.sol/LibStake.json');
}
catch { }
let LibStorageSlot;
try {
    LibStorageSlot = require('../artifacts/contracts/libraries/LibStorageSlot.sol/LibStorageSlot.json');
}
catch { }
let SafeERC20;
try {
    SafeERC20 = require('../artifacts/contracts/libraries/SafeERC20.sol/SafeERC20.json');
}
catch { }
let BaseProxy;
try {
    BaseProxy = require('../artifacts/contracts/proxy/BaseProxy.sol/BaseProxy.json');
}
catch { }
let BaseProxyStorage;
try {
    BaseProxyStorage = require('../artifacts/contracts/proxy/BaseProxyStorage.sol/BaseProxyStorage.json');
}
catch { }
let BaseProxyStorageV2;
try {
    BaseProxyStorageV2 = require('../artifacts/contracts/proxy/BaseProxyStorageV2.sol/BaseProxyStorageV2.json');
}
catch { }
let CandidateProxy;
try {
    CandidateProxy = require('../artifacts/contracts/proxy/CandidateProxy.sol/CandidateProxy.json');
}
catch { }
let DaoProxy;
try {
    DaoProxy = require('../artifacts/contracts/proxy/DaoProxy.sol/DaoProxy.json');
}
catch { }
let DaoProxyStorage;
try {
    DaoProxyStorage = require('../artifacts/contracts/proxy/DaoProxyStorage.sol/DaoProxyStorage.json');
}
catch { }
let Layer2ManagerProxy;
try {
    Layer2ManagerProxy = require('../artifacts/contracts/proxy/Layer2ManagerProxy.sol/Layer2ManagerProxy.json');
}
catch { }
let OptimismSequencerProxy;
try {
    OptimismSequencerProxy = require('../artifacts/contracts/proxy/OptimismSequencerProxy.sol/OptimismSequencerProxy.json');
}
catch { }
let SeigManagerV2Proxy;
try {
    SeigManagerV2Proxy = require('../artifacts/contracts/proxy/SeigManagerV2Proxy.sol/SeigManagerV2Proxy.json');
}
catch { }
let CandidateStorage;
try {
    CandidateStorage = require('../artifacts/contracts/storages/CandidateStorage.sol/CandidateStorage.json');
}
catch { }
let DAOv2CommitteeStorage;
try {
    DAOv2CommitteeStorage = require('../artifacts/contracts/storages/DAOv2CommitteeStorage.sol/DAOv2CommitteeStorage.json');
}
catch { }
let Layer2ManagerStorage;
try {
    Layer2ManagerStorage = require('../artifacts/contracts/storages/Layer2ManagerStorage.sol/Layer2ManagerStorage.json');
}
catch { }
let OptimismSequencerStorage;
try {
    OptimismSequencerStorage = require('../artifacts/contracts/storages/OptimismSequencerStorage.sol/OptimismSequencerStorage.json');
}
catch { }
let SeigManagerV2Storage;
try {
    SeigManagerV2Storage = require('../artifacts/contracts/storages/SeigManagerV2Storage.sol/SeigManagerV2Storage.json');
}
catch { }
let StakingStorage;
try {
    StakingStorage = require('../artifacts/contracts/storages/StakingStorage.sol/StakingStorage.json');
}
catch { }
let Candidate;
try {
    Candidate = require('../artifacts/contracts/test/Candidate.sol/Candidate.json');
}
catch { }
let CrossDomainEnabled;
try {
    CrossDomainEnabled = require('../artifacts/contracts/test/CrossDomainEnabled.sol/CrossDomainEnabled.json');
}
catch { }
let DAOAgendaManager;
try {
    DAOAgendaManager = require('../artifacts/contracts/test/DAOAgendaManager.sol/DAOAgendaManager.json');
}
catch { }
let DAOVault;
try {
    DAOVault = require('../artifacts/contracts/test/DAOVault.sol/DAOVault.json');
}
catch { }
let ICandidate;
try {
    ICandidate = require('../artifacts/contracts/test/ICandidate.sol/ICandidate.json');
}
catch { }
let ICrossDomainMessenger;
try {
    ICrossDomainMessenger = require('../artifacts/contracts/test/ICrossDomainMessenger.sol/ICrossDomainMessenger.json');
}
catch { }
let CandidateI;
try {
    CandidateI = require('../artifacts/contracts/test/Layer2Manager.sol/CandidateI.json');
}
catch { }
let DAOv2I;
try {
    DAOv2I = require('../artifacts/contracts/test/Layer2Manager.sol/DAOv2I.json');
}
catch { }
let Layer2Manager;
try {
    Layer2Manager = require('../artifacts/contracts/test/Layer2Manager.sol/Layer2Manager.json');
}
catch { }
let SequencerI;
try {
    SequencerI = require('../artifacts/contracts/test/Layer2Manager.sol/SequencerI.json');
}
catch { }
let StakingLayer2I;
try {
    StakingLayer2I = require('../artifacts/contracts/test/Layer2Manager.sol/StakingLayer2I.json');
}
catch { }
let Lib_AddressManager;
try {
    Lib_AddressManager = require('../artifacts/contracts/test/Lib_AddressManager.sol/Lib_AddressManager.json');
}
catch { }
let IL1CrossDomainMessenger;
try {
    IL1CrossDomainMessenger = require('../artifacts/contracts/test/MockL1Bridge.sol/IL1CrossDomainMessenger.json');
}
catch { }
let L1MessengerI;
try {
    L1MessengerI = require('../artifacts/contracts/test/MockL1Bridge.sol/L1MessengerI.json');
}
catch { }
let MockL1Bridge;
try {
    MockL1Bridge = require('../artifacts/contracts/test/MockL1Bridge.sol/MockL1Bridge.json');
}
catch { }
let MockL1BridgeI;
try {
    MockL1BridgeI = require('../artifacts/contracts/test/MockL1Bridge.sol/MockL1BridgeI.json');
}
catch { }
let MockL1Messenger;
try {
    MockL1Messenger = require('../artifacts/contracts/test/MockL1Messenger.sol/MockL1Messenger.json');
}
catch { }
let MockL2Bridge;
try {
    MockL2Bridge = require('../artifacts/contracts/test/MockL2Bridge.sol/MockL2Bridge.json');
}
catch { }
let MockL2Messenger;
try {
    MockL2Messenger = require('../artifacts/contracts/test/MockL2Messenger.sol/MockL2Messenger.json');
}
catch { }
let OptimismSequencer;
try {
    OptimismSequencer = require('../artifacts/contracts/test/OptimismSequencer.sol/OptimismSequencer.json');
}
catch { }
let AutoRefactorCoinageI;
try {
    AutoRefactorCoinageI = require('../artifacts/contracts/test/SeigManagerV2.sol/AutoRefactorCoinageI.json');
}
catch { }
let SeigManagerV2;
try {
    SeigManagerV2 = require('../artifacts/contracts/test/SeigManagerV2.sol/SeigManagerV2.json');
}
catch { }
let StakingI;
try {
    StakingI = require('../artifacts/contracts/test/SeigManagerV2.sol/StakingI.json');
}
catch { }
let Sequencer;
try {
    Sequencer = require('../artifacts/contracts/test/Sequencer.sol/Sequencer.json');
}
catch { }
let AddressManagerI;
try {
    AddressManagerI = require('../artifacts/contracts/test/Staking.sol/AddressManagerI.json');
}
catch { }
let FwReceiptI;
try {
    FwReceiptI = require('../artifacts/contracts/test/Staking.sol/FwReceiptI.json');
}
catch { }
let L1BridgeI;
try {
    L1BridgeI = require('../artifacts/contracts/test/Staking.sol/L1BridgeI.json');
}
catch { }
let Layer2ManagerI;
try {
    Layer2ManagerI = require('../artifacts/contracts/test/Staking.sol/Layer2ManagerI.json');
}
catch { }
let SeigManagerV2I;
try {
    SeigManagerV2I = require('../artifacts/contracts/test/Staking.sol/SeigManagerV2I.json');
}
catch { }
let Staking;
try {
    Staking = require('../artifacts/contracts/test/Staking.sol/Staking.json');
}
catch { }
let TestERC20;
try {
    TestERC20 = require('../artifacts/contracts/test/TestERC20.sol/TestERC20.json');
}
catch { }
let AuthController;
try {
    AuthController = require('../artifacts/contracts/test/TON.sol/AuthController.json');
}
catch { }
let Context;
try {
    Context = require('../artifacts/contracts/test/TON.sol/Context.json');
}
catch { }
let ERC165;
try {
    ERC165 = require('../artifacts/contracts/test/TON.sol/ERC165.json');
}
catch { }
let ERC165Checker;
try {
    ERC165Checker = require('../artifacts/contracts/test/TON.sol/ERC165Checker.json');
}
catch { }
let ERC20;
try {
    ERC20 = require('../artifacts/contracts/test/TON.sol/ERC20.json');
}
catch { }
let ERC20Detailed;
try {
    ERC20Detailed = require('../artifacts/contracts/test/TON.sol/ERC20Detailed.json');
}
catch { }
let ERC20Mintable;
try {
    ERC20Mintable = require('../artifacts/contracts/test/TON.sol/ERC20Mintable.json');
}
catch { }
let ERC20OnApprove;
try {
    ERC20OnApprove = require('../artifacts/contracts/test/TON.sol/ERC20OnApprove.json');
}
catch { }
let IERC165;
try {
    IERC165 = require('../artifacts/contracts/test/TON.sol/IERC165.json');
}
catch { }
let IERC20;
try {
    IERC20 = require('../artifacts/contracts/test/TON.sol/IERC20.json');
}
catch { }
let MinterRole;
try {
    MinterRole = require('../artifacts/contracts/test/TON.sol/MinterRole.json');
}
catch { }
let MinterRoleRenounceTarget;
try {
    MinterRoleRenounceTarget = require('../artifacts/contracts/test/TON.sol/MinterRoleRenounceTarget.json');
}
catch { }
let OnApprove;
try {
    OnApprove = require('../artifacts/contracts/test/TON.sol/OnApprove.json');
}
catch { }
let Ownable;
try {
    Ownable = require('../artifacts/contracts/test/TON.sol/Ownable.json');
}
catch { }
let OwnableTarget;
try {
    OwnableTarget = require('../artifacts/contracts/test/TON.sol/OwnableTarget.json');
}
catch { }
let PauserRoleRenounceTarget;
try {
    PauserRoleRenounceTarget = require('../artifacts/contracts/test/TON.sol/PauserRoleRenounceTarget.json');
}
catch { }
let Roles;
try {
    Roles = require('../artifacts/contracts/test/TON.sol/Roles.json');
}
catch { }
let SafeMath;
try {
    SafeMath = require('../artifacts/contracts/test/TON.sol/SafeMath.json');
}
catch { }
let SeigManagerI;
try {
    SeigManagerI = require('../artifacts/contracts/test/TON.sol/SeigManagerI.json');
}
catch { }
let SeigToken;
try {
    SeigToken = require('../artifacts/contracts/test/TON.sol/SeigToken.json');
}
catch { }
let TON;
try {
    TON = require('../artifacts/contracts/test/TON.sol/TON.json');
}
catch { }
const getContractArtifactTokamakDaoV2 = (name) => {
    return {
        AccessControl,
        Address,
        Context,
        EnumerableSet,
        ERC165A,
        IERC165,
        AccessibleCommon,
        AccessRoleCommon,
        ProxyAccessCommon,
        DAOCommitteeProxyV2,
        DAOv1Committee,
        DAOv2Committee,
        IStaking,
        DAOv2CommitteeV1,
        DAOv2CommitteeV2,
        IStakeManagerV2,
        StorageStateCommittee,
        StorageStateCommitteeV2,
        ICandidate,
        ICandidateFactory,
        ICandidateV2,
        IDAOAgendaManager,
        IDAOCommittee,
        IDAOv2Committee,
        IDAOVault,
        IERC20,
        ILayer2,
        ILayer2Manager,
        ILayer2Registry,
        IOptimismSequencer,
        IProxyAction,
        IProxyEvent,
        ISeigManager,
        ISeigManagerV2,
        IStorageStateCommittee,
        IWTON,
        LibAgenda,
        BytesLib,
        BytesParserLib,
        Layer2,
        LibArrays,
        LibDaoV2,
        LibMath,
        LibOperator,
        LibOptimism,
        LibStake,
        LibStorageSlot,
        SafeERC20,
        BaseProxy,
        BaseProxyStorage,
        BaseProxyStorageV2,
        CandidateProxy,
        DaoProxy,
        DaoProxyStorage,
        Layer2ManagerProxy,
        OptimismSequencerProxy,
        SeigManagerV2Proxy,
        CandidateStorage,
        DAOv2CommitteeStorage,
        Layer2ManagerStorage,
        OptimismSequencerStorage,
        SeigManagerV2Storage,
        StakingStorage,
        Candidate,
        CrossDomainEnabled,
        DAOAgendaManager,
        DAOVault,
        ICrossDomainMessenger,
        AddressManagerI,
        CandidateI,
        DAOv2I,
        Layer2Manager,
        SeigManagerV2I,
        SequencerI,
        StakingLayer2I,
        Lib_AddressManager,
        FwReceiptI,
        IL1CrossDomainMessenger,
        L1MessengerI,
        MockL1Bridge,
        MockL1BridgeI,
        MockL1Messenger,
        MockL2Bridge,
        MockL2Messenger,
        OptimismSequencer,
        AutoRefactorCoinageI,
        Layer2ManagerI,
        SeigManagerV2,
        StakingI,
        Sequencer,
        L1BridgeI,
        Staking,
        TestERC20,
        AuthController,
        ERC165,
        ERC165Checker,
        ERC20,
        ERC20Detailed,
        ERC20Mintable,
        ERC20OnApprove,
        MinterRole,
        MinterRoleRenounceTarget,
        OnApprove,
        Ownable,
        OwnableTarget,
        PauserRoleRenounceTarget,
        Roles,
        SafeMath,
        SeigManagerI,
        SeigToken,
        TON
    }[name];
};
exports.getContractArtifactTokamakDaoV2 = getContractArtifactTokamakDaoV2;
//# sourceMappingURL=contract-artifacts.js.map