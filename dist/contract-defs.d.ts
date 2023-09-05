import { ethers } from 'ethers';
export declare const getContractDefinition: (name: string) => any;
export declare const getContractInterface: (name: string) => ethers.utils.Interface;
export declare const getContractFactoryTokamakDaoV2: (name: string, signer?: ethers.Signer) => ethers.ContractFactory;
