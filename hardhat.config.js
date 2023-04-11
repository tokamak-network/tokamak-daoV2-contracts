require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");

require('dotenv').config()

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: { 
    compilers: [
      {
        version: '0.8.17',
        settings: {
          optimizer: { enabled: true, runs: 10_000 },
        },
      },
      {
        version: '0.7.6', // Required for previous version
        settings: {
          optimizer: { enabled: true, runs: 10_000 },
        },
      },
    ],
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      chainId: 31337,
    },
    local: {
      chainId: 31337,
      url: `http://127.0.0.1:8545/`,
      // accounts: [
      //   // `${process.env.PRIVATE_KEY}`,
      //   `${process.env.LOCAL_KEY}`,
      //   `${process.env.LOCAL_KEY2}`,
      //   `${process.env.LOCAL_KEY3}`,
      //   `${process.env.LOCAL_KEY4}`,
      //   `${process.env.LOCAL_KEY5}`,
      //   `${process.env.LOCAL_KEY6}`,
      //   `${process.env.LOCAL_KEY7}`,
      //   `${process.env.LOCAL_KEY8}`,
      //   `${process.env.LOCAL_KEY9}`,
      //   `${process.env.LOCAL_KEY10}`,
      //   `${process.env.LOCAL_KEY11}`,
      //   `${process.env.LOCAL_KEY12}`,
      //   `${process.env.LOCAL_KEY13}`,
      //   `${process.env.LOCAL_KEY14}`,
      //   `${process.env.LOCAL_KEY15}`,
      //   `${process.env.LOCAL_KEY16}`,
      // ]
    },
    //harvey setting
    goerli: {
      url: `https://goerli.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: [
        `${process.env.PRIVATE_KEY}`,
        `${process.env.LOCAL_KEY}`,
        `${process.env.LOCAL_KEY2}`,
        `${process.env.LOCAL_KEY3}`,
        `${process.env.LOCAL_KEY4}`,
        `${process.env.LOCAL_KEY5}`,
        `${process.env.LOCAL_KEY6}`,
        `${process.env.LOCAL_KEY7}`,
        `${process.env.LOCAL_KEY8}`,
        `${process.env.LOCAL_KEY9}`,
        `${process.env.LOCAL_KEY10}`,
        `${process.env.LOCAL_KEY11}`,
        `${process.env.LOCAL_KEY12}`,
        `${process.env.LOCAL_KEY13}`,
        `${process.env.LOCAL_KEY14}`,
        `${process.env.LOCAL_KEY15}`
      ]
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: [ `${process.env.MAINNET_PRIVATE_KEY}` ],
      gasMultiplier: 1.25,
      gasPrice: 48000000000
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },

};
