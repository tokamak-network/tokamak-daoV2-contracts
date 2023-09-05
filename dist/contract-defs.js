"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContractFactoryTokamakDaoV2 = exports.getContractInterface = exports.getContractDefinition = void 0;
const ethers_1 = require("ethers");
const getContractDefinition = (name) => {
    const { getContractArtifactTokamakDaoV2 } = require('./contract-artifacts');
    const artifact = getContractArtifactTokamakDaoV2(name);
    if (artifact === undefined) {
        throw new Error(`Unable to find artifact for contract: ${name}`);
    }
    return artifact;
};
exports.getContractDefinition = getContractDefinition;
const getContractInterface = (name) => {
    const definition = (0, exports.getContractDefinition)(name);
    return new ethers_1.ethers.utils.Interface(definition.abi);
};
exports.getContractInterface = getContractInterface;
const getContractFactoryTokamakDaoV2 = (name, signer) => {
    const definition = (0, exports.getContractDefinition)(name);
    const contractInterface = (0, exports.getContractInterface)(name);
    return new ethers_1.ethers.ContractFactory(contractInterface, definition.bytecode, signer);
};
exports.getContractFactoryTokamakDaoV2 = getContractFactoryTokamakDaoV2;
//# sourceMappingURL=contract-defs.js.map