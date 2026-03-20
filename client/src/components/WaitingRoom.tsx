import type { GameState } from '../types'
import { socket } from '../socket'
import { useState } from 'react'

interface WaitingRoomProps {
  gameState: GameState
  playerName: string
}

export default function WaitingRoom({ gameState }: WaitingRoomProps) {
  const [error, setError] = useState('')
  const isHost = gameState.players[0]?.id === socket.id

  function handleStart() {
    socket.emit('start-game', (res: any) => {
      if (!res.success) setError(res.error)
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-rk-panel rounded-2xl p-8 w-full max-w-md shadow-2xl border border-rk-border text-center">
        <h2 className="text-2xl font-bold mb-2">Waiting Room</h2>
        <div className="bg-rk-surface rounded-lg px-6 py-4 mb-6">
          <p className="text-rk-muted text-xs uppercase tracking-wider mb-1">Room Code</p>
          <p className="text-4xl font-bold tracking-[0.3em] text-rk-accent">{gameState.roomId}</p>
          <p className="text-rk-muted text-xs mt-2">Share this code with friends to join</p>
        </div>

        <div className="mb-6">
          <p className="text-rk-muted text-sm mb-3">Players ({gameState.players.length}/4)</p>
          <div className="space-y-2">
            {gameState.players.map((p, i) => (
              <div key={p.id} className="bg-rk-surface rounded-lg px-4 py-2 flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${i === 0 ? 'bg-rk-orange' : 'bg-rk-green'}`} />
                <span className="text-white font-medium">{p.name}</span>
                {i === 0 && <span className="text-xs text-rk-orange ml-auto">Host</span>}
                {p.id === socket.id && <span className="text-xs text-rk-muted ml-auto">(You)</span>}
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-rk-red/20 border border-rk-red/50 rounded-lg px-4 py-2 mb-4 text-sm text-rk-red">
            {error}
          </div>
        )}

        {isHost ? (
          <button
            onClick={handleStart}
            disabled={gameState.players.length < 2}
            className={`w-full font-semibold py-3 rounded-lg transition-colors ${
              gameState.players.length >= 2
                ? 'bg-rk-green hover:bg-rk-green/80 text-white'
                : 'bg-rk-surface text-rk-muted cursor-not-allowed'
            }`}
          >
            {gameState.players.length >= 2 ? 'Start Game' : 'Waiting for players...'}
          </button>
        ) : (
          <p className="text-rk-muted text-sm">Waiting for host to start the game...</p>
        )}
      </div>
    </div>
  )
}
