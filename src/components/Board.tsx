import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { COLUMNS, type ColumnId, type Entry, type SortMode } from '../types'
import { sortEntries } from '../lib/sort'
import { updateEntry } from '../lib/useEntries'
import Column from './Column'
import Tile from './Tile'
import type { TagCategories } from '../lib/useUserData'

export default function Board({
  entries,
  activeColumn,
  sorts,
  cats,
  onSortChange,
  onOpen,
  onQuickAdd,
  onTagClick
}: {
  entries: Entry[]
  activeColumn: ColumnId
  sorts: Record<ColumnId, SortMode>
  cats: TagCategories
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

  const sort = sorts[activeColumn]
  const colEntries = sortEntries(
    entries.filter((e) => e.column === activeColumn),
    sort
  )
  const label = COLUMNS.find((c) => c.id === activeColumn)?.label ?? ''
  const activeEntry = entries.find((e) => e.id === activeId) || null

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id))
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null)
    const { active, over } = e
    if (!over || active.id === over.id) return
    const moving = colEntries.find((x) => x.id === active.id)
    const overEntry = colEntries.find((x) => x.id === over.id)
    if (!moving || !overEntry) return

    const oldI = colEntries.findIndex((x) => x.id === moving.id)
    const newI = colEntries.findIndex((x) => x.id === overEntry.id)
    const reordered = arrayMove(colEntries, oldI, newI)
    const pos = reordered.findIndex((x) => x.id === moving.id)
    const before = reordered[pos - 1]
    const after = reordered[pos + 1]
    let newPos: number
    if (before && after) newPos = (before.position + after.position) / 2
    else if (before) newPos = before.position + 1
    else if (after) newPos = after.position - 1
    else newPos = Date.now()

    updateEntry(moving.id, { position: newPos })
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="mx-auto w-full max-w-xl px-3 pb-28">
        <Column
          id={activeColumn}
          label={label}
          entries={colEntries}
          sort={sort}
          cats={cats}
          onSortChange={onSortChange}
          onOpen={onOpen}
          onQuickAdd={onQuickAdd}
          onTagClick={onTagClick}
        />
      </div>

      <DragOverlay>
        {activeEntry ? (
          <div className="w-full max-w-xl rotate-1">
            <Tile entry={activeEntry} cats={cats} onOpen={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
