import { useState, useEffect } from 'react'
import { socket } from './socket'
import type { GameState } from './types'
import Lobby from './components/Lobby'
import WaitingRoom from './components/WaitingRoom'
import GameBoard from './components/GameBoard'

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [playerName, setPlayerName] = useState('')
  const [inRoom, setInRoom] = useState(false)

  useEffect(() => {
    function onGameState(state: GameState) {
      setGameState(state)
    }

    socket.on('game-state', onGameState)

    return () => {
      socket.off('game-state', onGameState)
    }
  }, [])

  function handleJoined(_roomId: string, name: string) {
    setPlayerName(name)
    setInRoom(true)
  }

  if (!inRoom || !gameState) {
    return <Lobby onJoined={handleJoined} />
  }

  if (!gameState.started && !gameState.winner) {
    return <WaitingRoom gameState={gameState} playerName={playerName} />
  }

  return <GameBoard gameState={gameState} />
}
