import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { ColumnId, Entry, SortMode } from '../types'
import Tile from './Tile'

const SORTS: { id: SortMode; label: string }[] = [
  { id: 'manual', label: 'Manual' },
  { id: 'due', label: 'Due' },
  { id: 'tag', label: 'Tag' }
]

export default function Column({
  id,
  label,
  entries,
  sort,
  onSortChange,
  onOpen,
  onQuickAdd,
  onTagClick
}: {
  id: ColumnId
  label: string
  entries: Entry[]
  sort: SortMode
  onSortChange: (c: ColumnId, s: SortMode) => void
  onOpen: (id: string) => void
  onQuickAdd: (c: ColumnId) => void
  onTagClick: (tag: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div className="flex w-[86vw] max-w-[340px] shrink-0 snap-center flex-col sm:w-80">
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-text">
            {label}
          </h2>
          <span className="rounded-full bg-panel px-1.5 py-0.5 text-[11px] text-muted">
            {entries.length}
          </span>
        </div>
        <select
          value={sort}
          onChange={(e) => onSortChange(id, e.target.value as SortMode)}
          className="rounded-md border border-edge bg-panel px-1.5 py-1 text-[11px] text-muted"
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
        className={`flex min-h-[60vh] flex-1 flex-col gap-2 rounded-2xl border p-2 transition-colors ${
          isOver ? 'border-accent bg-accenttint' : 'border-edge bg-column'
        }`}
      >
        <SortableContext items={entries.map((e) => e.id)} strategy={verticalListSortingStrategy}>
          {entries.map((e) => (
            <Tile key={e.id} entry={e} onOpen={onOpen} onTagClick={onTagClick} />
          ))}
        </SortableContext>

        <button
          onClick={() => onQuickAdd(id)}
          className="mt-1 rounded-xl border border-dashed border-edge py-2 text-xs text-muted hover:border-accent hover:text-accent"
        >
          + Add
        </button>
      </div>
    </div>
  )
}
