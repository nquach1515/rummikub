import { useState, useEffect } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { socket } from '../socket'
import type { GameState, Tile } from '../types'
import TileComponent from './TileComponent'
import SortableTile from './SortableTile'
import DroppableSet from './DroppableSet'
import CosmicBackground from './CosmicBackground'

const PLAYER_COLORS = ['#8b5cf6', '#3b82f6', '#ec4899', '#f59e0b']
const AVATARS = ['🎮', '🚀', '🌟', '⚡']

function TimerRing({ timeLeft, total }: { timeLeft: number; total: number }) {
  const radius = 28
  const circumference = 2 * Math.PI * radius
  const progress = (timeLeft / total) * circumference
  const pct = timeLeft / total
  const color = pct > 0.33 ? '#22c55e' : pct > 0.16 ? '#f59e0b' : '#ef4444'

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="68" height="68" className="-rotate-90">
        <circle cx="34" cy="34" r={radius} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="3" />
        <circle
          cx="34" cy="34" r={radius} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={circumference} strokeDashoffset={circumference - progress}
          strokeLinecap="round" className="transition-all duration-1000 ease-linear"
          style={{ filter: `drop-shadow(0 0 8px ${color}66)` }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-lg font-bold" style={{ color, fontFamily: "'JetBrains Mono', monospace" }}>
          {timeLeft}
        </span>
      </div>
    </div>
  )
}

interface GameBoardProps { gameState: GameState }

export default function GameBoard({ gameState }: GameBoardProps) {
  const [board, setBoard] = useState<Tile[][]>(gameState.board)
  const [rack, setRack] = useState<Tile[]>(gameState.myTiles)
  const [activeTile, setActiveTile] = useState<Tile | null>(null)
  const [error, setError] = useState('')
  const [timeLeft, setTimeLeft] = useState(60)
  const [message, setMessage] = useState('')

  const isMyTurn = gameState.currentPlayerId === socket.id
  const myPlayer = gameState.players.find(p => p.id === socket.id)
  const myIndex = gameState.players.findIndex(p => p.id === socket.id)

  useEffect(() => { setBoard(gameState.board); setRack(gameState.myTiles); setError('') }, [gameState.board, gameState.myTiles])

  useEffect(() => {
    if (!isMyTurn || !gameState.started) return
    setTimeLeft(60)
    const interval = setInterval(() => {
      setTimeLeft(prev => { if (prev <= 1) { socket.emit('timeout'); clearInterval(interval); return 0 } return prev - 1 })
    }, 1000)
    return () => clearInterval(interval)
  }, [isMyTurn, gameState.currentPlayerId, gameState.started])

  useEffect(() => {
    const onTimeout = (d: { name: string }) => { setMessage(`${d.name} timed out — +3 penalty tiles`); setTimeout(() => setMessage(''), 3000) }
    const onLeft = (d: { name: string }) => { setMessage(`${d.name} disconnected`); setTimeout(() => setMessage(''), 3000) }
    socket.on('player-timeout', onTimeout)
    socket.on('player-left', onLeft)
    return () => { socket.off('player-timeout', onTimeout); socket.off('player-left', onLeft) }
  }, [])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function findTile(tileId: number): { area: 'rack' | 'board'; setIndex?: number; tileIndex: number } | null {
    const ri = rack.findIndex(t => t.id === tileId)
    if (ri !== -1) return { area: 'rack', tileIndex: ri }
    for (let si = 0; si < board.length; si++) {
      const ti = board[si].findIndex(t => t.id === tileId)
      if (ti !== -1) return { area: 'board', setIndex: si, tileIndex: ti }
    }
    return null
  }
  function findTileIn(tileId: number, b: Tile[][], r: Tile[]) {
    const ri = r.findIndex(t => t.id === tileId)
    if (ri !== -1) return { area: 'rack' as const, tileIndex: ri }
    for (let si = 0; si < b.length; si++) {
      const ti = b[si].findIndex(t => t.id === tileId)
      if (ti !== -1) return { area: 'board' as const, setIndex: si, tileIndex: ti }
    }
    return null
  }

  function onDragStart(e: DragStartEvent) {
    setActiveTile([...rack, ...board.flat()].find(t => t.id === Number(e.active.id)) ?? null)
  }
  function onDragEnd(e: DragEndEvent) {
    setActiveTile(null)
    if (!isMyTurn || !e.over) return
    const tileId = Number(e.active.id)
    const overId = String(e.over.id)
    const src = findTile(tileId)
    if (!src) return
    const nb = board.map(s => [...s]); const nr = [...rack]
    let tile: Tile
    if (src.area === 'rack') { tile = nr.splice(src.tileIndex, 1)[0] }
    else { tile = nb[src.setIndex!].splice(src.tileIndex, 1)[0]; if (!nb[src.setIndex!].length) nb.splice(src.setIndex!, 1) }
    if (overId === 'rack') nr.push(tile)
    else if (overId === 'new-set') nb.push([tile])
    else if (overId.startsWith('set-')) { const si = parseInt(overId.replace('set-', '')); nb[si]?.push(tile) }
    else if (overId.startsWith('tile-')) {
      const ol = findTileIn(parseInt(overId.replace('tile-', '')), nb, nr)
      if (ol?.area === 'rack') nr.splice(ol.tileIndex, 0, tile)
      else if (ol?.area === 'board') nb[ol.setIndex!].splice(ol.tileIndex, 0, tile)
    }
    setBoard(nb); setRack(nr)
  }

  const handleDraw = () => socket.emit('draw-tile', (r: any) => { if (!r.success) setError(r.error) })
  const handleSubmit = () => socket.emit('submit-turn', { board: board.filter(s => s.length > 0), playerTiles: rack }, (r: any) => { if (!r.valid) setError(r.error) })
  const handleReset = () => { setBoard(gameState.board); setRack(gameState.myTiles); setError('') }
  const handleRestart = () => socket.emit('restart-game', (r: any) => { if (!r.success) setError(r.error) })

  const currentPlayerName = gameState.players.find(p => p.id === gameState.currentPlayerId)?.name

  // Winner screen
  if (gameState.winner) {
    const won = gameState.winner.id === socket.id
    return (
      <>
        <CosmicBackground />
        <div className="min-h-screen flex items-center justify-center relative z-10">
          <div className="glass rounded-[28px] p-14 text-center grad-border max-w-md fade-up">
            <div className="text-7xl mb-6">{won ? '👑' : '🌌'}</div>
            <h1 className="text-4xl font-black mb-2 text-white">{won ? 'Victory!' : `${gameState.winner.name} Wins`}</h1>
            <p className="text-rk-muted mb-8 text-sm">{won ? 'You cleared your rack first!' : 'Better luck next round.'}</p>
            {gameState.players[0]?.id === socket.id && (
              <button onClick={handleRestart} className="btn-primary text-white font-semibold px-10 py-3 rounded-xl relative z-10">
                Play Again
              </button>
            )}
          </div>
        </div>
      </>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <CosmicBackground />
      <div className="min-h-screen flex flex-col relative z-10">

        {/* ===== TOP BAR ===== */}
        <div className="glass border-b border-white/[0.03] px-5 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-base font-black tracking-tight bg-gradient-to-r from-violet-400 via-indigo-400 to-violet-400 bg-clip-text text-transparent">
              RUMMIKUB
            </span>
            <div className="h-4 w-px bg-white/5" />
            <span className="text-[11px] text-rk-muted/50 font-mono tracking-wider">{gameState.roomId}</span>
            <div className="h-4 w-px bg-white/5" />
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-rk-muted/40" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
              <span className="text-[11px] text-rk-muted/50">{gameState.poolCount} tiles</span>
            </div>
          </div>

          {/* Player pills */}
          <div className="flex items-center gap-1.5">
            {gameState.players.map((p, i) => (
              <div
                key={p.id}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[12px] transition-all ${
                  p.isCurrentPlayer
                    ? 'glass border-emerald-500/20'
                    : 'glass-subtle'
                }`}
                style={p.isCurrentPlayer ? { boxShadow: `0 0 16px ${PLAYER_COLORS[i]}15` } : {}}
              >
                <span className="text-sm">{AVATARS[i]}</span>
                <span className={`font-medium ${p.isCurrentPlayer ? 'text-white' : 'text-rk-muted/70'}`}>
                  {p.name}
                </span>
                <span className="glass rounded-md px-1.5 py-0.5 text-[10px] font-bold text-rk-muted/50 font-mono">
                  {p.tileCount}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div className="bg-amber-500/[0.06] border-b border-amber-500/10 text-amber-300/80 text-center py-2 text-[13px]">
            {message}
          </div>
        )}

        {/* Turn bar */}
        <div className={`flex items-center justify-center gap-4 py-3 border-b transition-all ${
          isMyTurn ? 'bg-emerald-500/[0.04] border-emerald-500/10' : 'bg-white/[0.01] border-white/[0.03]'
        }`}>
          {isMyTurn && <TimerRing timeLeft={timeLeft} total={60} />}
          <div>
            {isMyTurn ? (
              <div>
                <p className="text-emerald-400 font-bold text-[15px]" style={{ textShadow: '0 0 20px rgba(34,197,94,0.3)' }}>
                  Your Turn
                </p>
                {!myPlayer?.hasMadeInitialMeld && (
                  <p className="text-amber-400/60 text-[11px] mt-0.5">First play must total 30+ points</p>
                )}
              </div>
            ) : (
              <p className="text-rk-muted/60 text-[13px]">
                Waiting for <span className="text-white/70 font-medium">{currentPlayerName}</span>
              </p>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/[0.06] border-b border-red-500/10 text-rk-red text-center py-2.5 text-[13px] flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            {error}
            <button onClick={() => setError('')} className="text-rk-red/40 hover:text-rk-red text-[11px] ml-2 underline">dismiss</button>
          </div>
        )}

        {/* ===== BOARD ===== */}
        <div className="flex-1 p-5 overflow-auto">
          <div className="min-h-[260px] glass rounded-2xl p-5 space-y-2.5">
            {board.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-rk-muted/20">
                <svg className="w-12 h-12 mb-3 opacity-30" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                </svg>
                <p className="text-sm">Drag tiles from your rack to play</p>
              </div>
            )}
            {board.map((set, si) => (
              <DroppableSet key={si} id={`set-${si}`}>
                <SortableContext items={set.map(t => `tile-${t.id}`)} strategy={horizontalListSortingStrategy}>
                  <div className="flex gap-1.5 items-center glass-subtle rounded-xl px-3 py-2.5 glass-hover">
                    <span className="text-[9px] text-rk-muted/20 font-mono mr-1 w-5 text-right shrink-0">
                      {si + 1}
                    </span>
                    {set.map(tile => <SortableTile key={tile.id} tile={tile} />)}
                  </div>
                </SortableContext>
              </DroppableSet>
            ))}
            {isMyTurn && (
              <DroppableSet id="new-set">
                <div className="border border-dashed border-white/[0.05] rounded-xl px-4 py-4 text-rk-muted/20 text-[13px] text-center hover:border-rk-accent/15 hover:bg-rk-accent/[0.02] transition-all cursor-default">
                  + New set
                </div>
              </DroppableSet>
            )}
          </div>
        </div>

        {/* Action buttons */}
        {isMyTurn && (
          <div className="flex justify-center gap-2.5 py-3 px-5">
            <button onClick={handleDraw} className="btn-ghost text-rk-muted/60 hover:text-white/80 px-5 py-2.5 rounded-xl text-[13px] font-medium">
              Draw Tile
            </button>
            <button onClick={handleReset} className="btn-ghost text-amber-400/50 hover:text-amber-300 px-5 py-2.5 rounded-xl text-[13px] font-medium">
              Reset
            </button>
            <button onClick={handleSubmit} className="btn-success text-white px-8 py-2.5 rounded-xl text-[13px] font-semibold relative z-10">
              Submit Turn
            </button>
          </div>
        )}

        {/* ===== RACK ===== */}
        <div className="glass border-t border-white/[0.03] p-4">
          <div className="flex items-center gap-2 mb-2 px-2">
            <span className="text-sm">{AVATARS[myIndex] ?? '🎮'}</span>
            <span className="text-[11px] text-rk-muted/40 uppercase tracking-widest font-medium">Your Rack</span>
            <span className="text-[11px] text-rk-muted/30 font-mono ml-auto">{rack.length} tiles</span>
          </div>
          <DroppableSet id="rack">
            <div className="flex gap-1.5 flex-wrap justify-center min-h-[72px] items-center py-1">
              <SortableContext items={rack.map(t => `tile-${t.id}`)} strategy={horizontalListSortingStrategy}>
                {rack.map(tile => <SortableTile key={tile.id} tile={tile} />)}
              </SortableContext>
              {rack.length === 0 && <span className="text-rk-muted/15 text-[13px]">No tiles</span>}
            </div>
          </DroppableSet>
        </div>
      </div>

      <DragOverlay>
        {activeTile ? <TileComponent tile={activeTile} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  )
}
