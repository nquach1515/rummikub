import { useDroppable } from '@dnd-kit/core'
import type { ReactNode } from 'react'

export default function DroppableSet({ id, children }: { id: string; children: ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl transition-all duration-200 ${isOver ? 'drop-highlight' : ''}`}
    >
      {children}
    </div>
  )
}
