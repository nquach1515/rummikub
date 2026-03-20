import type { GameState } from '../types'
import { socket } from '../socket'
import { useState } from 'react'
import CosmicBackground from './CosmicBackground'

interface WaitingRoomProps {
  gameState: GameState
  playerName: string
}

const AVATARS = ['🎮', '🚀', '🌟', '⚡']
const PLAYER_COLORS = ['#8b5cf6', '#3b82f6', '#ec4899', '#f59e0b']

export default function WaitingRoom({ gameState }: WaitingRoomProps) {
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const isHost = gameState.players[0]?.id === socket.id

  function handleStart() {
    socket.emit('start-game', (res: any) => {
      if (!res.success) setError(res.error)
    })
  }

  function copyCode() {
    navigator.clipboard.writeText(gameState.roomId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <CosmicBackground />
      <div className="min-h-screen flex items-center justify-center relative z-10 p-4">
        <div className="glass rounded-[28px] p-10 w-full max-w-[500px] grad-border text-center fade-up">

          <h2 className="text-2xl font-bold mb-8 text-white/90 fade-up fade-up-1">Waiting for Players</h2>

          {/* Room code */}
          <div className="glass-subtle rounded-2xl px-6 py-6 mb-8 fade-up fade-up-2">
            <p className="text-[10px] text-rk-muted/50 uppercase tracking-[0.4em] mb-3">Room Code</p>
            <div className="flex gap-2 justify-center mb-3">
              {gameState.roomId.split('').map((char, i) => (
                <span
                  key={i}
                  className="inline-flex items-center justify-center w-14 h-16 rounded-xl text-2xl font-bold glass"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    color: PLAYER_COLORS[i % 4],
                    textShadow: `0 0 16px ${PLAYER_COLORS[i % 4]}55`,
                    animationDelay: `${i * 0.05}s`,
                  }}
                >
                  {char}
                </span>
              ))}
            </div>
            <button
              onClick={copyCode}
              className="text-[11px] text-rk-muted/60 hover:text-rk-muted transition-colors inline-flex items-center gap-1.5"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
              </svg>
              {copied ? 'Copied!' : 'Copy code'}
            </button>
          </div>

          {/* Players grid */}
          <div className="grid grid-cols-2 gap-3 mb-8 fade-up fade-up-3">
            {Array.from({ length: 4 }).map((_, i) => {
              const player = gameState.players[i]
              return (
                <div
                  key={i}
                  className={`rounded-xl p-4 transition-all duration-300 ${
                    player
                      ? 'glass-subtle glass-hover'
                      : 'border border-dashed border-white/5 bg-white/[0.01]'
                  }`}
                >
                  {player ? (
                    <div className="flex flex-col items-center gap-2">
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center text-xl"
                        style={{
                          background: `linear-gradient(135deg, ${PLAYER_COLORS[i]}22, ${PLAYER_COLORS[i]}11)`,
                          border: `2px solid ${PLAYER_COLORS[i]}33`,
                          boxShadow: `0 0 16px ${PLAYER_COLORS[i]}22`,
                        }}
                      >
                        {AVATARS[i]}
                      </div>
                      <span className="text-sm font-semibold text-white">{player.name}</span>
                      <div className="flex gap-1.5">
                        {i === 0 && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                            style={{ background: `${PLAYER_COLORS[i]}18`, color: PLAYER_COLORS[i], border: `1px solid ${PLAYER_COLORS[i]}25` }}
                          >
                            Host
                          </span>
                        )}
                        {player.id === socket.id && (
                          <span className="text-[9px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/5 text-rk-muted">
                            You
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-2">
                      <div className="w-11 h-11 rounded-full bg-white/[0.02] border border-dashed border-white/5 flex items-center justify-center">
                        <span className="text-rk-muted/20 text-lg">?</span>
                      </div>
                      <span className="text-xs text-rk-muted/20">Empty slot</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {error && (
            <div className="glass-subtle rounded-xl px-4 py-2.5 mb-5 text-sm text-rk-red border border-rk-red/15">
              {error}
            </div>
          )}

          {isHost ? (
            <button
              onClick={handleStart}
              disabled={gameState.players.length < 2}
              className={`w-full font-semibold py-4 rounded-xl text-[15px] transition-all fade-up fade-up-4 ${
                gameState.players.length >= 2
                  ? 'btn-success text-white relative z-10'
                  : 'glass-subtle text-rk-muted/40 cursor-not-allowed'
              }`}
            >
              {gameState.players.length >= 2 ? 'Start Game' : `Waiting for players... (${gameState.players.length}/2 min)`}
            </button>
          ) : (
            <div className="glass-subtle rounded-xl px-4 py-4 fade-up fade-up-4">
              <div className="flex items-center justify-center gap-3">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-rk-accent animate-bounce" style={{ animationDelay: '0s' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-rk-accent animate-bounce" style={{ animationDelay: '0.15s' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-rk-accent animate-bounce" style={{ animationDelay: '0.3s' }} />
                </div>
                <p className="text-rk-muted text-sm">Waiting for host to start</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
