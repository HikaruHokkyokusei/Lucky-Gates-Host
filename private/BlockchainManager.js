"use strict";

const Web3 = require('web3');
const configs = require('./PythonScripts/configs.json');
const configsForRegisteredCoins = require('./PythonScripts/configsForRegisteredCoin.json');
const configsForSmartContract = require('./PythonScripts/configsForSmartContract.json');

const getRandomNumber = (start, end) => {
  return Math.floor((end - start) * Math.random()) + start;
};

const web3UrlHolder = {};
const web3ObjHolder = {};
const ownerWalletAddress = process.env[configs["blockchainData"]["ownerWalletAddressConfigKey"]];
const ownerPrivateKey = process.env[configs["blockchainData"]["ownerPrivateKeyConfigKey"]];

const keysForApiURL = configs["blockchainData"]["keysForApiURL"];
for (let key in keysForApiURL) {
  web3UrlHolder[key] = JSON.parse(process.env[keysForApiURL[key]]);
  web3ObjHolder[key] = new Web3(web3UrlHolder[key][getRandomNumber(0, web3UrlHolder[key].length)]);
}

const verifyPaymentForPlayer = async (referenceId, playerAddress, coinChainName) => {
  try {
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
      from: ownerWalletAddress,
      to: paymentManagerContractAddy,
      data: paymentManager.methods["markPaymentAsComplete"](playerAddress, referenceId).encodeABI(),
      gas: 500000,
      gasPrice: await web3ObjHolder[coinChainName].eth.getGasPrice()
    };

    let signedTransaction = await web3ObjHolder[coinChainName].eth.accounts.signTransaction(transaction, ownerPrivateKey);
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
    console.log("Payment Verification Error.\nInput Params : " +
      referenceId + ", " + playerAddress + ", " + coinChainName
    );
    console.log(err);
    return {
      success: false, ticketCount: 0, gameCoinAddress: "", reasonIfNotSuccess: "Unknown Error Encountered at server. " +
        "Please keep the reference Id handy and contact support."
    };
  }
};

module.exports = {
  verifyPaymentForPlayer
};