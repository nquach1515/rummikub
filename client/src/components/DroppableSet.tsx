import { useDroppable } from '@dnd-kit/core'
import type { ReactNode } from 'react'

interface DroppableSetProps {
  id: string
  children: ReactNode
}

export default function DroppableSet({ id, children }: DroppableSetProps) {
  const { isOver, setNodeRef } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg transition-colors ${
        isOver ? 'bg-rk-accent/10 ring-1 ring-rk-accent' : ''
      }`}
    >
      {children}
    </div>
  )
}
