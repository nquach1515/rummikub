export interface Tile {
  id: number
  color: string
  number: number
  isJoker: boolean
}

export interface PlayerInfo {
  id: string
  name: string
  tileCount: number
  hasMadeInitialMeld: boolean
  isCurrentPlayer: boolean
}

export interface GameState {
  roomId: string
  players: PlayerInfo[]
  board: Tile[][]
  myTiles: Tile[]
  currentPlayerId: string
  poolCount: number
  started: boolean
  winner: { id: string; name: string } | null
}
