export interface PurchaseData {
  id: string,
  encounteredError: boolean,
  hasEnded: boolean,
  amountToBuy: number,
  costOfPurchase: bigint,
  purchaseCostWithDecimals: bigint,
  hasFetchedData: boolean,
  playerBalance: bigint,
  coinAllowance: bigint,
  networkGasFee: bigint
}
