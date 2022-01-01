"use strict";

const logger = global["globalLoggerObject"];

const Web3 = require('web3');
const getRandomNumber = require("./ToolSet").Miscellaneous.getRandomNumber;
const configs = require('./PythonScripts/configs.json');
const configsForRegisteredCoins = require('./PythonScripts/configsForRegisteredCoin.json');
const configsForSmartContract = require('./PythonScripts/configsForSmartContract.json');

const web3UrlHolder = {};
const web3ObjHolder = {};
let authPublicKeys, authPrivateKeys, authorizedWalletCount, lastUsedWalletIndex = -1;

const keysForApiURL = configs["blockchainData"]["keysForApiURL"];
for (let key in keysForApiURL) {
  web3UrlHolder[key] = JSON.parse(process.env[keysForApiURL[key]]);
  web3ObjHolder[key] = new Web3(web3UrlHolder[key][getRandomNumber(0, web3UrlHolder[key].length)]);
}

const buildWallets = (publicKeys, privateKeys) => {
  if (publicKeys.length !== privateKeys.length) {
    throw "Length Mismatch";
  }

  authorizedWalletCount = publicKeys.length;
  authPublicKeys = publicKeys;
  authPrivateKeys = privateKeys;
};

const verifyPaymentForPlayer = async (referenceId, playerAddress, coinChainName) => {
  try {
    const walletToUse = (++lastUsedWalletIndex) % authorizedWalletCount;
    lastUsedWalletIndex = walletToUse;
    coinChainName = coinChainName.toUpperCase();
    let paymentManagerContractAddy = configsForRegisteredCoins[coinChainName]["paymentManagerContractAddress"];
    let paymentManager = new web3ObjHolder[coinChainName].eth.Contract(
      configsForSmartContract["paymentManagerABI"], paymentManagerContractAddy
    );

    let paymentData = await paymentManager.methods["getPaymentInformation"](playerAddress, referenceId).call();
    if (paymentData["0"].toString() === "false") {
      return {
        success: false,
        ticketCount: 0,
        gameCoinAddress: "",
        reasonIfNotSuccess: "Invalid Payment Information. No such payment exists."
      };
    } else if (paymentData["1"].toString() === "true") {
      return {
        success: false,
        ticketCount: 0,
        gameCoinAddress: "",
        reasonIfNotSuccess: "This payment has already been acknowledged"
      };
    }

    let gameCoinAddress = Web3.utils.toChecksumAddress(paymentData["3"]);
    let registeredCoinData = configsForRegisteredCoins[coinChainName]["registeredCoinAddresses"][gameCoinAddress]

    let paidAmount = BigInt(paymentData["4"]) / (BigInt(10) ** BigInt(registeredCoinData["decimals"]));
    let ticketCount = Number(paidAmount / BigInt(registeredCoinData["serverTicketCost"]));

    if (ticketCount === 0) {
      return {success: false, ticketCount, gameCoinAddress, reasonIfNotSuccess: "Cannot buy 0 tickets"};
    }

    let transaction = {
      from: authPublicKeys[walletToUse],
      to: paymentManagerContractAddy,
      data: paymentManager.methods["markPaymentAsComplete"](playerAddress, referenceId).encodeABI(),
      gas: 500000,
      gasPrice: await web3ObjHolder[coinChainName].eth.getGasPrice()
    };

    let signedTransaction = await web3ObjHolder[coinChainName].eth.accounts.signTransaction(transaction, authPrivateKeys[walletToUse]);
    let result = await web3ObjHolder[coinChainName].eth.sendSignedTransaction(signedTransaction.rawTransaction);

    if (result.status) {
      return {success: true, ticketCount, gameCoinAddress, reasonIfNotSuccess: ""};
    } else {
      return {
        success: false,
        ticketCount: 0,
        gameCoinAddress: "",
        reasonIfNotSuccess: "Approval Transaction Failed. Please keep the reference Id handy and contact support."
      };
    }
  } catch (err) {
    logger.info("Payment Verification Error.\nInput Params : " +
      referenceId + ", " + playerAddress + ", " + coinChainName
    );
    logger.info(err);
    return {
      success: false, ticketCount: 0, gameCoinAddress: "", reasonIfNotSuccess: "Unknown Error Encountered at server. " +
        "Please keep the reference Id handy and contact support."
    };
  }
};

const sendRewardToWinner = async (gameId, playerAddress, coinChainName, gameCoinAddress, rewardAmount, feeAmount) => {
  try {
    const walletToUse = (++lastUsedWalletIndex) % authorizedWalletCount;
    lastUsedWalletIndex = walletToUse;
    let paymentManagerContractAddy = configsForRegisteredCoins[coinChainName]["paymentManagerContractAddress"];
    let paymentManager = new web3ObjHolder[coinChainName].eth.Contract(
      configsForSmartContract["paymentManagerABI"], paymentManagerContractAddy
    );

    let registeredCoinData = configsForRegisteredCoins[coinChainName]["registeredCoinAddresses"][gameCoinAddress];
    let multiplier = BigInt(10) ** BigInt(registeredCoinData["decimals"]);
    let rewardValue = BigInt(rewardAmount) * (multiplier);
    let feeValue = BigInt(feeAmount) * (multiplier);

    let transaction = {
      from: authPublicKeys[walletToUse],
      to: paymentManagerContractAddy,
      data: paymentManager.methods["sendRewardToWinner"](gameCoinAddress, playerAddress, rewardValue, feeValue).encodeABI(),
      gas: 2500000,
      gasPrice: await web3ObjHolder[coinChainName].eth.getGasPrice()
    };

    let signedTransaction = await web3ObjHolder[coinChainName].eth.accounts.signTransaction(transaction, authPrivateKeys[walletToUse]);
    let trxHash = signedTransaction["transactionHash"];
    web3ObjHolder[coinChainName].eth.sendSignedTransaction(signedTransaction.rawTransaction).then((receipt) => {
      logger.info("Send Reward Transaction Complete.\nTrxHash : " + receipt["transactionHash"] + ", status : " + receipt["status"]);
    }).catch((err) => {
      logger.info("Error in sent Trx.");
      logger.info(err);
    });

    return {success: true, gameId, trxHash};
  } catch (err) {
    logger.info("Error when sending reward. gameId : " + gameId + ", playerAddress : " + playerAddress + ", coinChainName" +
      coinChainName + ", gameCoinAddress : " + gameCoinAddress + ", rewardAmount : " + rewardAmount + ", feeAmount : " + feeAmount);
    logger.info(err);
    return {success: false, gameId, trxHash: ""};
  }
};

module.exports = {
  buildWallets,
  verifyPaymentForPlayer,
  sendRewardToWinner
};
