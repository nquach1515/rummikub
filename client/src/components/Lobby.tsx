import { useState } from 'react'
import { socket } from '../socket'
import CosmicBackground from './CosmicBackground'

interface LobbyProps {
  onJoined: (roomId: string, playerName: string) => void
}

const TILE_LETTERS = [
  { letter: 'R', color: '#ff2d55' },
  { letter: 'U', color: '#00aaff' },
  { letter: 'M', color: '#d4d4ff' },
  { letter: 'M', color: '#ff9500' },
  { letter: 'I', color: '#ff2d55' },
  { letter: 'K', color: '#00aaff' },
  { letter: 'U', color: '#d4d4ff' },
  { letter: 'B', color: '#ff9500' },
]

export default function Lobby({ onJoined }: LobbyProps) {
  const [name, setName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'menu' | 'join'>('menu')

  function handleCreate() {
    if (!name.trim()) return setError('Enter your name')
    socket.connect()
    socket.emit('create-room', name.trim(), (res: any) => {
      if (res.success) onJoined(res.roomId, name.trim())
      else setError(res.error)
    })
  }

  function handleJoin() {
    if (!name.trim()) return setError('Enter your name')
    if (!roomCode.trim()) return setError('Enter room code')
    socket.connect()
    socket.emit('join-room', roomCode.trim(), name.trim(), (res: any) => {
      if (res.success) onJoined(res.roomId, name.trim())
      else setError(res.error)
    })
  }

  return (
    <>
      <CosmicBackground />
      <div className="min-h-screen flex items-center justify-center relative z-10 p-4">
        <div className="glass rounded-[28px] p-10 w-full max-w-[440px] grad-border fade-up">

          {/* Logo tiles */}
          <div className="flex justify-center gap-[6px] mb-3 fade-up fade-up-1">
            {TILE_LETTERS.map((t, i) => (
              <div
                key={i}
                className="tile !w-10 !h-12 !text-base !rounded-lg"
                style={{
                  borderColor: `${t.color}22`,
                  animationDelay: `${i * 0.06}s`,
                }}
              >
                <span style={{ color: t.color, textShadow: `0 0 12px ${t.color}66`, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 16 }}>
                  {t.letter}
                </span>
              </div>
            ))}
          </div>

          <p className="text-center text-rk-muted text-xs tracking-[0.35em] uppercase mb-10 fade-up fade-up-2">
            Online Multiplayer
          </p>

          {error && (
            <div className="glass-subtle rounded-xl px-4 py-3 mb-5 text-sm text-rk-red border border-rk-red/15 flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {error}
            </div>
          )}

          {mode === 'menu' && (
            <div className="space-y-4 fade-up fade-up-3">
              <div>
                <label className="text-[11px] text-rk-muted uppercase tracking-[0.2em] mb-1.5 block">Your name</label>
                <input
                  type="text"
                  placeholder="Enter your name..."
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError('') }}
                  className="w-full glass-subtle rounded-xl px-5 py-3.5 text-white placeholder-rk-muted/30 focus:outline-none focus:ring-2 focus:ring-rk-accent/30 transition-all text-[15px]"
                  maxLength={20}
                  autoFocus
                />
              </div>
              <button onClick={handleCreate} className="btn-primary w-full text-white font-semibold py-3.5 rounded-xl text-[15px] relative z-10">
                Create Room
              </button>
              <button onClick={() => { if (name.trim()) setMode('join'); else setError('Enter your name') }} className="btn-ghost w-full text-white/80 font-medium py-3.5 rounded-xl text-[15px]">
                Join Room
              </button>

              <div className="flex items-center gap-3 pt-2">
                <div className="flex-1 h-px bg-white/5" />
                <span className="text-[10px] text-rk-muted/40 uppercase tracking-widest">2-4 Players</span>
                <div className="flex-1 h-px bg-white/5" />
              </div>
            </div>
          )}

          {mode === 'join' && (
            <div className="space-y-4 fade-up fade-up-3">
              <div className="flex items-center gap-2 glass-subtle rounded-lg px-3 py-2">
                <div className="w-6 h-6 rounded-full bg-rk-accent/20 flex items-center justify-center">
                  <span className="text-rk-accent text-xs font-bold">{name[0]?.toUpperCase()}</span>
                </div>
                <span className="text-sm text-white/60">Playing as <span className="text-white font-medium">{name}</span></span>
              </div>

              <div>
                <label className="text-[11px] text-rk-muted uppercase tracking-[0.2em] mb-1.5 block">Room Code</label>
                <input
                  type="text"
                  placeholder="XXXXX"
                  value={roomCode}
                  onChange={(e) => { setRoomCode(e.target.value.toUpperCase()); setError('') }}
                  className="w-full glass-subtle rounded-xl px-5 py-4 text-white placeholder-rk-muted/20 focus:outline-none focus:ring-2 focus:ring-rk-accent/30 text-center text-3xl tracking-[0.5em] uppercase font-bold transition-all"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  maxLength={5}
                  autoFocus
                />
              </div>

              <button onClick={handleJoin} className="btn-success w-full text-white font-semibold py-3.5 rounded-xl text-[15px] relative z-10">
                Join Game
              </button>
              <button onClick={() => setMode('menu')} className="w-full text-rk-muted/50 hover:text-rk-muted text-sm py-2 transition-colors">
                &larr; Back
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
