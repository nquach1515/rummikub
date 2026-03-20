const { createTilePool, shuffle } = require('./types')
const { validateBoard, calculateInitialMeldPoints } = require('./validation')

class Game {
  constructor(roomId) {
    this.roomId = roomId
    this.players = [] // { id, name, tiles, hasMadeInitialMeld }
    this.pool = []
    this.board = [] // Array of sets, each set is array of tiles
    this.currentPlayerIndex = 0
    this.started = false
    this.turnTimer = null
    this.turnTimeLimit = 60000 // 60 seconds
    this.boardSnapshot = null // for rollback
    this.playerTilesSnapshot = null
    this.winner = null
  }

  addPlayer(id, name) {
    if (this.players.length >= 4) return false
    if (this.started) return false
    this.players.push({
      id,
      name,
      tiles: [],
      hasMadeInitialMeld: false,
    })
    return true
  }

  removePlayer(id) {
    const idx = this.players.findIndex(p => p.id === id)
    if (idx === -1) return
    const player = this.players[idx]
    // Return tiles to pool
    this.pool.push(...player.tiles)
    this.players.splice(idx, 1)
    if (this.currentPlayerIndex >= this.players.length) {
      this.currentPlayerIndex = 0
    }
  }

  start() {
    if (this.players.length < 2) return false
    this.pool = shuffle(createTilePool())
    this.board = []
    this.winner = null

    // Deal 14 tiles to each player
    for (const player of this.players) {
      player.tiles = this.pool.splice(0, 14)
      player.hasMadeInitialMeld = false
    }

    this.started = true
    this.currentPlayerIndex = 0
    this.snapshotState()
    return true
  }

  snapshotState() {
    this.boardSnapshot = JSON.parse(JSON.stringify(this.board))
    const player = this.getCurrentPlayer()
    if (player) {
      this.playerTilesSnapshot = JSON.parse(JSON.stringify(player.tiles))
    }
  }

  rollback() {
    this.board = JSON.parse(JSON.stringify(this.boardSnapshot))
    const player = this.getCurrentPlayer()
    if (player && this.playerTilesSnapshot) {
      player.tiles = JSON.parse(JSON.stringify(this.playerTilesSnapshot))
    }
  }

  getCurrentPlayer() {
    return this.players[this.currentPlayerIndex] ?? null
  }

  drawTile(playerId) {
    const player = this.players.find(p => p.id === playerId)
    if (!player) return null
    if (this.getCurrentPlayer()?.id !== playerId) return null
    if (this.pool.length === 0) return null

    // Rollback any board changes first
    this.rollback()

    const tile = this.pool.pop()
    player.tiles.push(tile)
    this.nextTurn()
    return tile
  }

  // Player submits their turn: new board state + remaining tiles on rack
  submitTurn(playerId, newBoard, playerTiles) {
    const player = this.players.find(p => p.id === playerId)
    if (!player) return { valid: false, error: 'Player not found' }
    if (this.getCurrentPlayer()?.id !== playerId) return { valid: false, error: 'Not your turn' }

    // Validate all sets on the board
    if (!validateBoard(newBoard)) {
      return { valid: false, error: 'Invalid sets on the board' }
    }

    // Verify tile integrity: all tiles from snapshot must be accounted for
    const allOldTiles = new Set()
    for (const set of this.boardSnapshot) {
      for (const tile of set) allOldTiles.add(tile.id)
    }
    for (const tile of this.playerTilesSnapshot) {
      allOldTiles.add(tile.id)
    }

    const allNewTiles = new Set()
    for (const set of newBoard) {
      for (const tile of set) allNewTiles.add(tile.id)
    }
    for (const tile of playerTiles) {
      allNewTiles.add(tile.id)
    }

    // Check no tiles appeared or disappeared
    if (allOldTiles.size !== allNewTiles.size) {
      return { valid: false, error: 'Tile count mismatch' }
    }
    for (const id of allOldTiles) {
      if (!allNewTiles.has(id)) {
        return { valid: false, error: 'Missing tile' }
      }
    }

    // Check player actually placed tiles (didn't just rearrange)
    const playerTilesBefore = this.playerTilesSnapshot.length
    const playerTilesAfter = playerTiles.length
    if (playerTilesAfter >= playerTilesBefore) {
      return { valid: false, error: 'You must place at least one tile' }
    }

    // Check initial meld requirement
    if (!player.hasMadeInitialMeld) {
      // Find which sets are entirely new (contain at least one player tile)
      const boardTileIds = new Set()
      for (const set of this.boardSnapshot) {
        for (const tile of set) boardTileIds.add(tile.id)
      }

      const newSets = newBoard.filter(set =>
        set.some(tile => !boardTileIds.has(tile.id))
      )

      // For initial meld, only count sets made entirely from player's tiles
      const playerTileIds = new Set(this.playerTilesSnapshot.map(t => t.id))
      const initialMeldSets = newSets.filter(set =>
        set.every(tile => playerTileIds.has(tile.id))
      )

      const points = calculateInitialMeldPoints(initialMeldSets)
      if (points < 30) {
        return { valid: false, error: `Initial meld must be at least 30 points (you have ${points})` }
      }
      player.hasMadeInitialMeld = true
    }

    // Apply the new state
    this.board = newBoard
    player.tiles = playerTiles

    // Check for winner
    if (player.tiles.length === 0) {
      this.winner = player
      this.started = false
      return { valid: true, winner: player }
    }

    this.nextTurn()
    return { valid: true }
  }

  nextTurn() {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length
    this.snapshotState()
  }

  // Timeout: rollback + draw 3 penalty tiles
  handleTimeout(playerId) {
    this.rollback()
    const player = this.players.find(p => p.id === playerId)
    if (player) {
      for (let i = 0; i < 3 && this.pool.length > 0; i++) {
        player.tiles.push(this.pool.pop())
      }
    }
    this.nextTurn()
  }

  getStateForPlayer(playerId) {
    const player = this.players.find(p => p.id === playerId)
    return {
      roomId: this.roomId,
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        tileCount: p.tiles.length,
        hasMadeInitialMeld: p.hasMadeInitialMeld,
        isCurrentPlayer: this.getCurrentPlayer()?.id === p.id,
      })),
      board: this.board,
      myTiles: player?.tiles ?? [],
      currentPlayerId: this.getCurrentPlayer()?.id,
      poolCount: this.pool.length,
      started: this.started,
      winner: this.winner ? { id: this.winner.id, name: this.winner.name } : null,
    }
  }
}

module.exports = Game
