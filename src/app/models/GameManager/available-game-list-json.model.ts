export interface AvailableGameListJSON {
  [gameId: string]: {
    gameCoinAddress: string,
    coinChainName: string,
    currentStage: number,
    gameCreator: string,
    playerAddresses: {
      [playerAddress: string]: string
    }
  }
}
