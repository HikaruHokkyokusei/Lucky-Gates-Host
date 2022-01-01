import {Player} from "./player.model";

export interface GameState {
  gameId?: string,
  gameCoinAddress?: string,
  coinChainName?: string,
  gameCreator?: string,
  minPlayers?: number,
  maxPlayers?: number,
  winnerReward?: number,
  sendRewardTransactionHash?: string,
  gameFee?: number,
  players?: Player[],
  removedPlayers?: Player[],
  currentStage?: number,
  gameStartTime?: number,
  stageStartTime?: number,
  stageEndTime?: number,
  gameEndTime?: number,
  requiredDoorSelectionStage?: number,
  currentChoiceMakingPlayer?: number,
  gameEndReason?: string,
}
