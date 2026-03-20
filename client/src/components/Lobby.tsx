import { useState } from 'react'
import { socket } from '../socket'

interface LobbyProps {
  onJoined: (roomId: string, playerName: string) => void
}

export default function Lobby({ onJoined }: LobbyProps) {
  const [name, setName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu')

  function handleCreate() {
    if (!name.trim()) return setError('Enter your name')
    socket.connect()
    socket.emit('create-room', name.trim(), (res: any) => {
      if (res.success) {
        onJoined(res.roomId, name.trim())
      } else {
        setError(res.error)
      }
    })
  }

  function handleJoin() {
    if (!name.trim()) return setError('Enter your name')
    if (!roomCode.trim()) return setError('Enter room code')
    socket.connect()
    socket.emit('join-room', roomCode.trim(), name.trim(), (res: any) => {
      if (res.success) {
        onJoined(res.roomId, name.trim())
      } else {
        setError(res.error)
      }
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-rk-panel rounded-2xl p-8 w-full max-w-md shadow-2xl border border-rk-border">
        <h1 className="text-4xl font-bold text-center mb-2 tracking-tight">Rummikub</h1>
        <p className="text-rk-muted text-center mb-8 text-sm">Online Multiplayer</p>

        {error && (
          <div className="bg-rk-red/20 border border-rk-red/50 rounded-lg px-4 py-2 mb-4 text-sm text-rk-red">
            {error}
          </div>
        )}

        {mode === 'menu' && (
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => { setName(e.target.value); setError('') }}
              className="w-full bg-rk-surface border border-rk-border rounded-lg px-4 py-3 text-white placeholder-rk-muted focus:outline-none focus:border-rk-accent"
              maxLength={20}
            />
            <button
              onClick={() => { if (name.trim()) { setMode('create'); handleCreate() } else setError('Enter your name') }}
              className="w-full bg-rk-accent hover:bg-rk-accent/80 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Create Room
            </button>
            <button
              onClick={() => { if (name.trim()) setMode('join'); else setError('Enter your name') }}
              className="w-full bg-rk-surface hover:bg-rk-border text-white font-semibold py-3 rounded-lg transition-colors border border-rk-border"
            >
              Join Room
            </button>
          </div>
        )}

        {mode === 'join' && (
          <div className="space-y-3">
            <p className="text-sm text-rk-muted">Joining as <span className="text-white font-medium">{name}</span></p>
            <input
              type="text"
              placeholder="Room code (e.g. ABC12)"
              value={roomCode}
              onChange={(e) => { setRoomCode(e.target.value.toUpperCase()); setError('') }}
              className="w-full bg-rk-surface border border-rk-border rounded-lg px-4 py-3 text-white placeholder-rk-muted focus:outline-none focus:border-rk-accent text-center text-2xl tracking-[0.3em] uppercase"
              maxLength={5}
            />
            <button
              onClick={handleJoin}
              className="w-full bg-rk-green hover:bg-rk-green/80 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Join Game
            </button>
            <button
              onClick={() => setMode('menu')}
              className="w-full text-rk-muted hover:text-white text-sm py-2 transition-colors"
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
