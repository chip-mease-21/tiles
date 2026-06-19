import { useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent
} from '@dnd-kit/core'
import { COLUMNS, type ColumnId, type Entry, type SortMode } from '../types'
import { sortEntries } from '../lib/sort'
import { updateEntry } from '../lib/useEntries'
import Column from './Column'
import Tile from './Tile'

export default function Board({
  entries,
  sorts,
  onSortChange,
  onOpen,
  onQuickAdd,
  onTagClick
}: {
  entries: Entry[]
  sorts: Record<ColumnId, SortMode>
  onSortChange: (c: ColumnId, s: SortMode) => void
  onOpen: (id: string) => void
  onQuickAdd: (c: ColumnId) => void
  onTagClick: (tag: string) => void
}) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } })
  )

  const byColumn = useMemo(() => {
    const map: Record<ColumnId, Entry[]> = {
      inbox: [],
      notes: [],
      today: [],
      this_week: [],
      someday: []
    }
    for (const e of entries) map[e.column]?.push(e)
    for (const c of COLUMNS) map[c.id] = sortEntries(map[c.id], sorts[c.id])
    return map
  }, [entries, sorts])

  const activeEntry = entries.find((e) => e.id === activeId) || null

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id))
  }

  async function onDragEnd(e: DragEndEvent) {
    setActiveId(null)
    const { active, over } = e
    if (!over) return
    const activeEntry = entries.find((x) => x.id === active.id)
    if (!activeEntry) return

    // Resolve the destination column: over can be a column droppable or a tile.
    const overId = String(over.id)
    const overEntry = entries.find((x) => x.id === overId)
    const destColumn: ColumnId = overEntry ? overEntry.column : (overId as ColumnId)
    if (!COLUMNS.some((c) => c.id === destColumn)) return

    // Build the destination ordering (current sorted order in that column).
    const dest = byColumn[destColumn].filter((x) => x.id !== activeEntry.id)
    let insertIndex = dest.length
    if (overEntry) {
      insertIndex = dest.findIndex((x) => x.id === overEntry.id)
      if (insertIndex < 0) insertIndex = dest.length
    }

    const before = dest[insertIndex - 1]
    const after = dest[insertIndex]
    let newPos: number
    if (before && after) newPos = (before.position + after.position) / 2
    else if (after) newPos = after.position - 1
    else if (before) newPos = before.position + 1
    else newPos = Date.now()

    const changedColumn = destColumn !== activeEntry.column
    if (!changedColumn && Math.abs(newPos - activeEntry.position) < 1e-9) return

    await updateEntry(activeEntry.id, { column: destColumn, position: newPos })
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-28 pt-2 sm:snap-none">
        {COLUMNS.map((c) => (
          <Column
            key={c.id}
            id={c.id}
            label={c.label}
            entries={byColumn[c.id]}
            sort={sorts[c.id]}
            onSortChange={onSortChange}
            onOpen={onOpen}
            onQuickAdd={onQuickAdd}
            onTagClick={onTagClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activeEntry ? (
          <div className="w-72 rotate-1">
            <Tile entry={activeEntry} onOpen={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
