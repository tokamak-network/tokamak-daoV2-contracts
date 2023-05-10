// import { HardhatUserConfig } from "hardhat/config";
// import "@nomicfoundation/hardhat-toolbox";

// const config: HardhatUserConfig = {
//   solidity: "0.8.17",
// };

// export default config;

import "@nomicfoundation/hardhat-toolbox";
import '@typechain/hardhat'
import '@nomiclabs/hardhat-ethers'
import "@nomicfoundation/hardhat-chai-matchers";

import "hardhat-gas-reporter";
import dotenv from "dotenv" ;
import { HardhatUserConfig } from "hardhat/types";
import "hardhat-deploy";

dotenv.config();

const config: HardhatUserConfig = {
  namedAccounts: {
    deployer: 0,
  },
  networks: {
    // hardhat: {
    //   forking: {
    //     url: `${process.env.ETH_NODE_URI_MAINNET}`,
    //     blockNumber: 16823556
    //   },
    //   allowUnlimitedContractSize: false,
    // },
    hardhat: {
      chainId: 31337,
    },
    local: {
      chainId: 31337,
      url: `http://127.0.0.1:8545/`,
    },
    // mainnet: {
    //   url: `${process.env.ETH_NODE_URI_MAINNET}`,
    // },
    goerli: {
      url: `https://goerli.infura.io/v3/${process.env.INFURA_API_KEY}`,
      // accounts: [`${process.env.PRIVATE_KEY}`],
      // chainId: 5,
    },
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  // gasReporter: {
  //   enabled: true,
  //   currency: 'USD',
  //   gasPrice: 21,
  //   coinmarketcap: `${process.env.COINMARKETCAP_API_KEY}`
  // },
  solidity: {
    version: '0.8.18',
    settings: {
      optimizer: {
        enabled: true,
        runs: 625,
      },
      metadata: {
        // do not include the metadata hash, since this is machine dependent
        // and we want all generated code to be deterministic
        // https://docs.soliditylang.org/en/v0.8.12/metadata.html
        bytecodeHash: 'none',
      },
    },
  },
};

export default config;