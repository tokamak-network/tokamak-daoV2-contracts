const hre = require("hardhat");
const { ethers } = hre;
const fs = require('fs');
const layer2RegistryAddress = "0x0b3E174A2170083e770D5d4Cf56774D221b7063e";
const depositManagerAddress = "0x56E465f654393fa48f007Ed7346105c7195CEe43";
const seigManagerAddress = "0x710936500aC59e8551331871Cbad3D33d5e0D909";

async function getLayer2s() {

  const layer2RegistryABI = JSON.parse(await fs.readFileSync("./abi/layer2Registry.json")).abi;
  const seigManagerABI = JSON.parse(await fs.readFileSync("./abi/seigManager.json")).abi;

  const layer2Registry = new ethers.Contract(
    layer2RegistryAddress,
    layer2RegistryABI,
    ethers.provider
  );

  const seigManager = new ethers.Contract(
    seigManagerAddress,
    seigManagerABI,
    ethers.provider
  );
  const layer2s = []
  const coinages = []
  const numberOfLayer2s = await layer2Registry.numLayer2s()
  for (let i = 0; i < numberOfLayer2s; i++) {

    let layer2Address = await layer2Registry.layer2ByIndex(i)
    let coinageAddress = await seigManager.coinages(layer2Address)

    layer2s.push(layer2Address)
    coinages.push(coinageAddress)
  }
  console.log({ layer2s });
  console.log({ coinages });
  console.log("length: ", layer2s.length);
  await fs.writeFileSync("./data/layer2s.json", JSON.stringify(layer2s));
  await fs.writeFileSync("./data/coinages.json", JSON.stringify(coinages));

  return layer2s;
}

async function execBurnFromEvent() {
  const coinages = JSON.parse(await fs.readFileSync("./data/coinages.json"));

  for (const coinage of coinages) {

    if(coinage != "0x0273cD08B80733f1C627F0Cad7985aa77b507787" ) {
      let start = 10837664
      let end = 18169829
      console.log("------------- coinage : ", coinage)
      // await getBurnFromEvent( start, end, coinage)

      // console.log("------------- getBurnFromEvent end " )

      await readTxs(coinage)
      console.log("------------- readTxs end " )

    }
  }

}

async function getBurnFromEvent(fromBlock, endBlock, coinage) {
  const events = [];
  const abi = [ "event Transfer(address indexed from, address indexed to, uint256 amount)" ];
  const iface = new ethers.utils.Interface(abi);

  let startBlock = fromBlock;
  let uint = 1000000
  let boolWhile = false
  let filter = null;
  const burnTxs = []
  // {tx: '', to:''}
  while (!boolWhile) {
    let toBlock = startBlock + uint;
    if(toBlock > endBlock)  {
      toBlock = endBlock;
      boolWhile = true;
    }

    filter = {
      address: coinage,
      fromBlock: startBlock,
      toBlock: toBlock,
      topics: [ethers.utils.id("Transfer(address,address,uint256)")]
    };
    console.log('filter', filter )

    const txs = await ethers.provider.getLogs(filter);

    for (const tx of txs) {
      const { transactionHash } = tx;
      // console.log('transactionHash', transactionHash )
      const { logs } = await ethers.provider.getTransactionReceipt(transactionHash);
      const foundLog = logs.find(el => el && el.topics && el.topics.includes(ethers.utils.id("Transfer(address,address,uint256)")));
      if (!foundLog) continue;
      const parsedlog = iface.parseLog(foundLog);
      const { to } = parsedlog["args"];
      if( to == '0x0000000000000000000000000000000000000000') {
        // console.log(parsedlog)
        burnTxs.push(transactionHash)
      }
      // stakers.push(depositor);
    }
    startBlock = toBlock;

  }
  console.log({ burnTxs });
  console.log("length: ", burnTxs.length);
  // const stakersUnique = stakers.filter((v, idx, self) => self.indexOf(v) === idx);
  // console.log("length: ", stakersUnique.length);
  await fs.writeFileSync("./data/burnTxs/"+coinage+".json", JSON.stringify(burnTxs));
  return burnTxs;
}

async function readTxs(coinage) {

  const nonExistWithdrawTx = []
  const burnTxs = JSON.parse(await fs.readFileSync("./data/burnTxs/"+coinage+".json"));
  let i = 0;
  for (const tx of burnTxs) {
    const { logs } = await ethers.provider.getTransactionReceipt(tx);
    const foundLog = logs.find(el => el && el.topics && el.topics.includes(ethers.utils.id("WithdrawalRequested(address,address,uint256)")));
    if (!foundLog) {
      console.log('non exist WithdrawalRequested ', tx)
      nonExistWithdrawTx.push(tx)
      continue;
    }
    i++;
    if(i % 50 == 0) console.log('-- i : ', i);
  }
  console.log({ nonExistWithdrawTx });
  console.log("length: ", nonExistWithdrawTx.length);
  await fs.writeFileSync("./data/nonExistWithdraw/"+coinage+".json", JSON.stringify(nonExistWithdrawTx));
  return nonExistWithdrawTx;
}

async function main() {

  await getLayer2s();
//   await execBurnFromEvent();

  // await getBurnFromEvent( 10837664, 18169829, coinage)
  // await readTxs(coinage)

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });