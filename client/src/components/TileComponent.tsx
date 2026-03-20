import type { Tile } from '../types'

const SCHEMES: Record<string, { color: string; glow: string; gradient: string }> = {
  red:    { color: '#ff2d55', glow: '255, 45, 85',  gradient: 'linear-gradient(135deg, #ff2d55, #ff6b81)' },
  blue:   { color: '#00aaff', glow: '0, 170, 255',  gradient: 'linear-gradient(135deg, #00aaff, #38d9ff)' },
  black:  { color: '#d4d4ff', glow: '212, 212, 255', gradient: 'linear-gradient(135deg, #d4d4ff, #ffffff)' },
  orange: { color: '#ff9500', glow: '255, 149, 0',  gradient: 'linear-gradient(135deg, #ff9500, #ffb340)' },
  joker:  { color: '#c084fc', glow: '192, 132, 252', gradient: 'linear-gradient(135deg, #c084fc, #e879f9)' },
}

interface TileProps {
  tile: Tile
  isDragging?: boolean
}

export default function TileComponent({ tile, isDragging }: TileProps) {
  const s = SCHEMES[tile.color] ?? SCHEMES.black

  return (
    <div
      className={`tile ${isDragging ? 'tile-dragging' : ''}`}
      style={{
        borderColor: `rgba(${s.glow}, 0.15)`,
        boxShadow: isDragging
          ? `0 12px 40px rgba(${s.glow}, 0.4), 0 0 0 2px rgba(${s.glow}, 0.3), inset 0 1px 0 rgba(255,255,255,0.08)`
          : `0 2px 4px rgba(0,0,0,0.4), 0 8px 16px rgba(0,0,0,0.2), 0 0 0 1px rgba(${s.glow}, 0.08), inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -1px 0 rgba(0,0,0,0.2)`,
      }}
    >
      {/* Inner gradient glow */}
      <div
        className="tile-inner-glow"
        style={{
          background: `radial-gradient(ellipse at 50% 20%, rgba(${s.glow}, 0.1) 0%, transparent 60%)`,
        }}
      />

      {/* Shine line */}
      <div
        className="absolute top-0 left-0 right-0 h-[1px] rounded-t-[10px]"
        style={{ background: `linear-gradient(90deg, transparent, rgba(${s.glow}, 0.2), transparent)` }}
      />

      {tile.isJoker ? (
        <div className="relative z-10 flex flex-col items-center gap-0.5">
          <span className="text-xs font-black tracking-[0.15em]" style={{ color: s.color, textShadow: `0 0 12px rgba(${s.glow}, 0.6)` }}>
            JKR
          </span>
          <div className="w-5 h-[2px] rounded-full" style={{ background: s.gradient, opacity: 0.5 }} />
        </div>
      ) : (
        <>
          <span className="tile-corner tile-corner-tl" style={{ color: s.color }}>{tile.number}</span>
          <span
            className="tile-number"
            style={{
              color: s.color,
              textShadow: `0 0 16px rgba(${s.glow}, 0.5), 0 2px 4px rgba(0,0,0,0.3)`,
            }}
          >
            {tile.number}
          </span>
          <span className="tile-corner tile-corner-br" style={{ color: s.color }}>{tile.number}</span>

          {/* Bottom accent line */}
          <div
            className="absolute bottom-[6px] left-[25%] right-[25%] h-[2px] rounded-full"
            style={{ background: s.gradient, opacity: 0.25 }}
          />
        </>
      )}
    </div>
  )
}
