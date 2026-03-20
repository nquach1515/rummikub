import type { Tile } from '../types'

const COLOR_MAP: Record<string, string> = {
  red: '#e74c3c',
  blue: '#3498db',
  black: '#ecf0f1',
  orange: '#e67e22',
  joker: '#9b59b6',
}

interface TileProps {
  tile: Tile
  isDragging?: boolean
  small?: boolean
}

export default function TileComponent({ tile, isDragging, small }: TileProps) {
  const color = COLOR_MAP[tile.color] ?? '#888'
  const size = small ? 'w-8 h-10 text-sm' : 'w-11 h-14 text-lg'

  return (
    <div
      className={`${size} bg-[#f5f0e8] rounded-md flex items-center justify-center font-bold select-none
        border-2 border-[#d4c9b5] shadow-md relative
        ${isDragging ? 'opacity-50 scale-105' : 'hover:scale-105'}
        transition-transform cursor-grab active:cursor-grabbing`}
      style={{ color }}
    >
      {tile.isJoker ? (
        <span className="text-base">JKR</span>
      ) : (
        <span>{tile.number}</span>
      )}
      {!tile.isJoker && (
        <>
          <span className="absolute top-0.5 left-1 text-[8px]" style={{ color }}>{tile.number}</span>
          <span className="absolute bottom-0.5 right-1 text-[8px] rotate-180" style={{ color }}>{tile.number}</span>
        </>
      )}
    </div>
  )
}
