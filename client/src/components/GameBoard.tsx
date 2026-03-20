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

interface GameBoardProps {
  gameState: GameState
}

export default function GameBoard({ gameState }: GameBoardProps) {
  const [board, setBoard] = useState<Tile[][]>(gameState.board)
  const [rack, setRack] = useState<Tile[]>(gameState.myTiles)
  const [activeTile, setActiveTile] = useState<Tile | null>(null)
  const [error, setError] = useState('')
  const [timeLeft, setTimeLeft] = useState(60)
  const [message, setMessage] = useState('')

  const isMyTurn = gameState.currentPlayerId === socket.id
  const myPlayer = gameState.players.find(p => p.id === socket.id)

  // Sync state when server sends updates
  useEffect(() => {
    setBoard(gameState.board)
    setRack(gameState.myTiles)
    setError('')
  }, [gameState.board, gameState.myTiles])

  // Turn timer
  useEffect(() => {
    if (!isMyTurn || !gameState.started) return
    setTimeLeft(60)
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          socket.emit('timeout')
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [isMyTurn, gameState.currentPlayerId, gameState.started])

  // Listen for events
  useEffect(() => {
    function onPlayerTimeout(data: { name: string }) {
      setMessage(`${data.name} ran out of time! +3 penalty tiles`)
      setTimeout(() => setMessage(''), 3000)
    }
    function onPlayerLeft(data: { name: string }) {
      setMessage(`${data.name} left the game`)
      setTimeout(() => setMessage(''), 3000)
    }
    socket.on('player-timeout', onPlayerTimeout)
    socket.on('player-left', onPlayerLeft)
    return () => {
      socket.off('player-timeout', onPlayerTimeout)
      socket.off('player-left', onPlayerLeft)
    }
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  function findTileLocation(tileId: number): { area: 'rack' | 'board'; setIndex?: number; tileIndex: number } | null {
    const rackIdx = rack.findIndex(t => t.id === tileId)
    if (rackIdx !== -1) return { area: 'rack', tileIndex: rackIdx }
    for (let si = 0; si < board.length; si++) {
      const ti = board[si].findIndex(t => t.id === tileId)
      if (ti !== -1) return { area: 'board', setIndex: si, tileIndex: ti }
    }
    return null
  }

  function handleDragStart(event: DragStartEvent) {
    const tileId = Number(event.active.id)
    const allTiles = [...rack, ...board.flat()]
    setActiveTile(allTiles.find(t => t.id === tileId) ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTile(null)
    if (!isMyTurn) return

    const { active, over } = event
    if (!over) return

    const tileId = Number(active.id)
    const overId = String(over.id)

    const source = findTileLocation(tileId)
    if (!source) return

    // Get the tile
    let tile: Tile
    const newBoard = board.map(s => [...s])
    const newRack = [...rack]

    if (source.area === 'rack') {
      tile = newRack.splice(source.tileIndex, 1)[0]
    } else {
      tile = newBoard[source.setIndex!].splice(source.tileIndex, 1)[0]
      if (newBoard[source.setIndex!].length === 0) {
        newBoard.splice(source.setIndex!, 1)
      }
    }

    // Determine drop target
    if (overId === 'rack') {
      newRack.push(tile)
    } else if (overId === 'new-set') {
      newBoard.push([tile])
    } else if (overId.startsWith('set-')) {
      const setIdx = parseInt(overId.replace('set-', ''))
      if (newBoard[setIdx]) {
        newBoard[setIdx].push(tile)
      }
    } else if (overId.startsWith('tile-')) {
      // Dropped on another tile - find where that tile is
      const overTileId = parseInt(overId.replace('tile-', ''))
      const overLoc = findTileLocationInState(overTileId, newBoard, newRack)
      if (overLoc?.area === 'rack') {
        newRack.splice(overLoc.tileIndex, 0, tile)
      } else if (overLoc?.area === 'board') {
        newBoard[overLoc.setIndex!].splice(overLoc.tileIndex, 0, tile)
      }
    }

    setBoard(newBoard)
    setRack(newRack)
  }

  function findTileLocationInState(tileId: number, boardState: Tile[][], rackState: Tile[]) {
    const rackIdx = rackState.findIndex(t => t.id === tileId)
    if (rackIdx !== -1) return { area: 'rack' as const, tileIndex: rackIdx }
    for (let si = 0; si < boardState.length; si++) {
      const ti = boardState[si].findIndex(t => t.id === tileId)
      if (ti !== -1) return { area: 'board' as const, setIndex: si, tileIndex: ti }
    }
    return null
  }

  function handleDraw() {
    socket.emit('draw-tile', (res: any) => {
      if (!res.success) setError(res.error)
    })
  }

  function handleSubmit() {
    // Filter out empty sets
    const cleanBoard = board.filter(s => s.length > 0)
    socket.emit('submit-turn', { board: cleanBoard, playerTiles: rack }, (res: any) => {
      if (!res.valid) {
        setError(res.error)
      }
    })
  }

  function handleReset() {
    setBoard(gameState.board)
    setRack(gameState.myTiles)
    setError('')
  }

  function handleRestart() {
    socket.emit('restart-game', (res: any) => {
      if (!res.success) setError(res.error)
    })
  }

  const currentPlayerName = gameState.players.find(p => p.id === gameState.currentPlayerId)?.name

  if (gameState.winner) {
    const isWinner = gameState.winner.id === socket.id
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-rk-panel rounded-2xl p-8 text-center border border-rk-border">
          <h1 className="text-4xl font-bold mb-4">
            {isWinner ? 'You Win!' : `${gameState.winner.name} Wins!`}
          </h1>
          <p className="text-rk-muted mb-6">
            {isWinner ? 'Congratulations!' : 'Better luck next time!'}
          </p>
          {gameState.players[0]?.id === socket.id && (
            <button
              onClick={handleRestart}
              className="bg-rk-accent hover:bg-rk-accent/80 text-white font-semibold px-6 py-3 rounded-lg"
            >
              Play Again
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <div className="bg-rk-panel border-b border-rk-border px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-rk-accent font-bold text-lg">Rummikub</span>
            <span className="text-rk-muted text-sm">Room: {gameState.roomId}</span>
            <span className="text-rk-muted text-sm">Pool: {gameState.poolCount} tiles</span>
          </div>
          <div className="flex items-center gap-4">
            {gameState.players.map(p => (
              <div
                key={p.id}
                className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm ${
                  p.isCurrentPlayer ? 'bg-rk-accent/20 text-rk-accent ring-1 ring-rk-accent' : 'text-rk-muted'
                }`}
              >
                <span className="font-medium">{p.name}</span>
                <span className="bg-rk-surface px-1.5 rounded text-xs">{p.tileCount}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div className="bg-rk-orange/20 text-rk-orange text-center py-2 text-sm">{message}</div>
        )}

        {/* Turn indicator */}
        <div className={`text-center py-2 text-sm font-medium ${isMyTurn ? 'bg-rk-green/20 text-rk-green' : 'bg-rk-surface text-rk-muted'}`}>
          {isMyTurn ? (
            <span>Your turn! {timeLeft}s remaining {!myPlayer?.hasMadeInitialMeld && '(Initial meld: 30+ points needed)'}</span>
          ) : (
            <span>Waiting for {currentPlayerName}...</span>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-rk-red/20 text-rk-red text-center py-2 text-sm">
            {error}
            <button onClick={() => setError('')} className="ml-3 underline">dismiss</button>
          </div>
        )}

        {/* Board area */}
        <div className="flex-1 p-4 overflow-auto">
          <div className="min-h-[300px] bg-rk-darker rounded-xl border border-rk-border p-4 space-y-3">
            {board.length === 0 && (
              <div className="text-center text-rk-muted py-8">
                Board is empty. Drag tiles here to play!
              </div>
            )}
            {board.map((set, setIdx) => (
              <DroppableSet key={setIdx} id={`set-${setIdx}`}>
                <SortableContext items={set.map(t => `tile-${t.id}`)} strategy={horizontalListSortingStrategy}>
                  <div className="flex gap-1 flex-wrap">
                    {set.map(tile => (
                      <SortableTile key={tile.id} tile={tile} />
                    ))}
                  </div>
                </SortableContext>
              </DroppableSet>
            ))}
            {/* Drop zone for new set */}
            {isMyTurn && (
              <DroppableSet id="new-set">
                <div className="border-2 border-dashed border-rk-border rounded-lg px-4 py-3 text-rk-muted text-sm text-center">
                  Drop tile here to create a new set
                </div>
              </DroppableSet>
            )}
          </div>
        </div>

        {/* Action buttons */}
        {isMyTurn && (
          <div className="flex justify-center gap-3 py-2">
            <button
              onClick={handleDraw}
              className="bg-rk-surface hover:bg-rk-border text-white px-4 py-2 rounded-lg text-sm border border-rk-border"
            >
              Draw Tile (End Turn)
            </button>
            <button
              onClick={handleReset}
              className="bg-rk-surface hover:bg-rk-border text-rk-orange px-4 py-2 rounded-lg text-sm border border-rk-border"
            >
              Reset Board
            </button>
            <button
              onClick={handleSubmit}
              className="bg-rk-green hover:bg-rk-green/80 text-white px-6 py-2 rounded-lg text-sm font-semibold"
            >
              Submit Turn
            </button>
          </div>
        )}

        {/* Rack */}
        <div className="bg-rk-panel border-t border-rk-border p-4">
          <DroppableSet id="rack">
            <div className="flex gap-1 flex-wrap justify-center min-h-[60px] items-center">
              <SortableContext items={rack.map(t => `tile-${t.id}`)} strategy={horizontalListSortingStrategy}>
                {rack.map(tile => (
                  <SortableTile key={tile.id} tile={tile} />
                ))}
              </SortableContext>
              {rack.length === 0 && (
                <span className="text-rk-muted text-sm">Your rack is empty</span>
              )}
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
