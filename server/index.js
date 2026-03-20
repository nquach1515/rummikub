const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const path = require('path')
const Game = require('./game')

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: { origin: '*' },
})

// Serve static frontend in production
app.use(express.static(path.join(__dirname, '..', 'client', 'dist')))

const rooms = new Map() // roomId -> Game

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

io.on('connection', (socket) => {
  let currentRoom = null
  let playerName = null

  socket.on('create-room', (name, callback) => {
    let code = generateRoomCode()
    while (rooms.has(code)) code = generateRoomCode()

    const game = new Game(code)
    game.addPlayer(socket.id, name)
    rooms.set(code, game)
    currentRoom = code
    playerName = name
    socket.join(code)
    callback({ success: true, roomId: code })
    io.to(code).emit('game-state', game.getStateForPlayer(socket.id))
  })

  socket.on('join-room', (roomId, name, callback) => {
    const code = roomId.toUpperCase().trim()
    const game = rooms.get(code)
    if (!game) return callback({ success: false, error: 'Room not found' })
    if (game.started) return callback({ success: false, error: 'Game already started' })

    const added = game.addPlayer(socket.id, name)
    if (!added) return callback({ success: false, error: 'Room is full (max 4)' })

    currentRoom = code
    playerName = name
    socket.join(code)
    callback({ success: true, roomId: code })

    // Send updated state to all players
    for (const p of game.players) {
      io.to(p.id).emit('game-state', game.getStateForPlayer(p.id))
    }
  })

  socket.on('start-game', (callback) => {
    const game = rooms.get(currentRoom)
    if (!game) return callback({ success: false, error: 'No room' })

    // Only host (first player) can start
    if (game.players[0]?.id !== socket.id) {
      return callback({ success: false, error: 'Only the host can start' })
    }

    const started = game.start()
    if (!started) return callback({ success: false, error: 'Need at least 2 players' })

    callback({ success: true })

    for (const p of game.players) {
      io.to(p.id).emit('game-state', game.getStateForPlayer(p.id))
    }
    io.to(currentRoom).emit('turn-start', {
      playerId: game.getCurrentPlayer().id,
      timeLimit: game.turnTimeLimit,
    })
  })

  socket.on('draw-tile', (callback) => {
    const game = rooms.get(currentRoom)
    if (!game) return callback({ success: false, error: 'No room' })

    const tile = game.drawTile(socket.id)
    if (!tile) return callback({ success: false, error: 'Cannot draw' })

    callback({ success: true })
    for (const p of game.players) {
      io.to(p.id).emit('game-state', game.getStateForPlayer(p.id))
    }
    io.to(currentRoom).emit('turn-start', {
      playerId: game.getCurrentPlayer().id,
      timeLimit: game.turnTimeLimit,
    })
  })

  socket.on('submit-turn', (data, callback) => {
    const game = rooms.get(currentRoom)
    if (!game) return callback({ success: false, error: 'No room' })

    const result = game.submitTurn(socket.id, data.board, data.playerTiles)
    callback(result)

    if (result.valid) {
      for (const p of game.players) {
        io.to(p.id).emit('game-state', game.getStateForPlayer(p.id))
      }
      if (result.winner) {
        io.to(currentRoom).emit('game-over', { winner: result.winner })
      } else {
        io.to(currentRoom).emit('turn-start', {
          playerId: game.getCurrentPlayer().id,
          timeLimit: game.turnTimeLimit,
        })
      }
    }
  })

  socket.on('timeout', () => {
    const game = rooms.get(currentRoom)
    if (!game) return
    if (game.getCurrentPlayer()?.id !== socket.id) return

    game.handleTimeout(socket.id)
    for (const p of game.players) {
      io.to(p.id).emit('game-state', game.getStateForPlayer(p.id))
    }
    io.to(currentRoom).emit('turn-start', {
      playerId: game.getCurrentPlayer().id,
      timeLimit: game.turnTimeLimit,
    })
    io.to(currentRoom).emit('player-timeout', { playerId: socket.id, name: playerName })
  })

  socket.on('restart-game', (callback) => {
    const game = rooms.get(currentRoom)
    if (!game) return callback({ success: false, error: 'No room' })
    if (game.players[0]?.id !== socket.id) {
      return callback({ success: false, error: 'Only the host can restart' })
    }

    const started = game.start()
    if (!started) return callback({ success: false, error: 'Need at least 2 players' })
    callback({ success: true })

    for (const p of game.players) {
      io.to(p.id).emit('game-state', game.getStateForPlayer(p.id))
    }
    io.to(currentRoom).emit('turn-start', {
      playerId: game.getCurrentPlayer().id,
      timeLimit: game.turnTimeLimit,
    })
  })

  socket.on('disconnect', () => {
    if (currentRoom) {
      const game = rooms.get(currentRoom)
      if (game) {
        const wasCurrentPlayer = game.getCurrentPlayer()?.id === socket.id
        game.removePlayer(socket.id)

        if (game.players.length === 0) {
          rooms.delete(currentRoom)
        } else {
          for (const p of game.players) {
            io.to(p.id).emit('game-state', game.getStateForPlayer(p.id))
          }
          io.to(currentRoom).emit('player-left', { name: playerName })
          if (wasCurrentPlayer && game.started) {
            game.snapshotState()
            io.to(currentRoom).emit('turn-start', {
              playerId: game.getCurrentPlayer().id,
              timeLimit: game.turnTimeLimit,
            })
          }
        }
      }
    }
  })
})

// Catch-all: serve frontend for client-side routing
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'))
})

const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`Rummikub server running on port ${PORT}`)
})
