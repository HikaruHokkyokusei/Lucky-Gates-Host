import {CoinData} from "./coin-data.model";

export interface CoinCollectionData {
  [coinChainName: string]: {
    chainId: number;
    paymentManagerContractAddress: string;
    registeredCoinAddresses: {
      [gameCoinAddress: string]: CoinData
    }
  }
}
