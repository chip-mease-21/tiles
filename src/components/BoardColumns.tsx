import { useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { COLUMNS, type ColumnId, type Entry, type SortMode } from '../types'
import { sortEntries } from '../lib/sort'
import { updateEntry } from '../lib/useEntries'
import Tile from './Tile'
import type { TagCategories } from '../lib/useUserData'

const SORTS: { id: SortMode; label: string }[] = [
  { id: 'manual', label: 'Manual' },
  { id: 'due', label: 'Due date' },
  { id: 'tag', label: 'Tag' }
]

function ColumnPanel({
  id,
  label,
  entries,
  sort,
  cats,
  onSortChange,
  onOpen,
  onQuickAdd,
  onTagClick
}: {
  id: ColumnId
  label: string
  entries: Entry[]
  sort: SortMode
  cats: TagCategories
  onSortChange: (c: ColumnId, s: SortMode) => void
  onOpen: (id: string) => void
  onQuickAdd: (c: ColumnId) => void
  onTagClick: (tag: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="flex items-baseline gap-2">
          <h2 className="text-sm font-semibold text-text">{label}</h2>
          <span className="text-xs font-medium text-muted">{entries.length}</span>
        </div>
        <select
          value={sort}
          onChange={(e) => onSortChange(id, e.target.value as SortMode)}
          className="rounded-lg border border-edge bg-panel px-1.5 py-1 text-[11px] text-muted"
          aria-label={`Sort ${label}`}
        >
          {SORTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-[65vh] flex-1 flex-col gap-2.5 rounded-2xl border p-2.5 transition-colors ${
          isOver ? 'border-accent bg-accenttint' : 'border-edge bg-column'
        }`}
      >
        <SortableContext items={entries.map((e) => e.id)} strategy={verticalListSortingStrategy}>
          {entries.map((e) => (
            <Tile key={e.id} entry={e} cats={cats} onOpen={onOpen} onTagClick={onTagClick} />
          ))}
        </SortableContext>
        <button
          onClick={() => onQuickAdd(id)}
          className="mt-1 rounded-xl border border-dashed border-edge py-2 text-xs font-medium text-muted hover:border-accent hover:text-accent"
        >
          + Add
        </button>
      </div>
    </div>
  )
}

export default function BoardColumns({
  entries,
  sorts,
  cats,
  onSortChange,
  onOpen,
  onQuickAdd,
  onTagClick
}: {
  entries: Entry[]
  sorts: Record<ColumnId, SortMode>
  cats: TagCategories
  onSortChange: (c: ColumnId, s: SortMode) => void
  onOpen: (id: string) => void
  onQuickAdd: (c: ColumnId) => void
  onTagClick: (tag: string) => void
}) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const byColumn = useMemo(() => {
    const map: Record<ColumnId, Entry[]> = {
      inbox: [],
      notes: [],
      today: [],
      this_week: [],
      this_month: [],
      next_month: [],
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

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null)
    const { active, over } = e
    if (!over) return
    const moving = entries.find((x) => x.id === active.id)
    if (!moving) return
    const overId = String(over.id)
    const overEntry = entries.find((x) => x.id === overId)
    const destColumn: ColumnId = overEntry ? overEntry.column : (overId as ColumnId)
    if (!COLUMNS.some((c) => c.id === destColumn)) return

    const dest = byColumn[destColumn].filter((x) => x.id !== moving.id)
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

    const changedColumn = destColumn !== moving.column
    if (!changedColumn && Math.abs(newPos - moving.position) < 1e-9) return
    updateEntry(moving.id, { column: destColumn, position: newPos })
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-28 pt-2">
        {COLUMNS.map((c) => (
          <ColumnPanel
            key={c.id}
            id={c.id}
            label={c.label}
            entries={byColumn[c.id]}
            sort={sorts[c.id]}
            cats={cats}
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
            <Tile entry={activeEntry} cats={cats} onOpen={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
