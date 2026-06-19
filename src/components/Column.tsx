import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { ColumnId, Entry, SortMode } from '../types'
import Tile from './Tile'
import type { TagCategories } from '../lib/useUserData'

const SORTS: { id: SortMode; label: string }[] = [
  { id: 'manual', label: 'Manual' },
  { id: 'due', label: 'Due date' },
  { id: 'tag', label: 'Tag' }
]

export default function Column({
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
  return (
    <div>
      <div className="mb-3 mt-1 flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <h2 className="text-lg font-semibold text-text">{label}</h2>
          <span className="text-sm font-medium text-muted">{entries.length}</span>
        </div>
        <select
          value={sort}
          onChange={(e) => onSortChange(id, e.target.value as SortMode)}
          className="rounded-lg border border-edge bg-panel px-2 py-1 text-xs text-muted"
          aria-label={`Sort ${label}`}
        >
          {SORTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2.5">
        <SortableContext items={entries.map((e) => e.id)} strategy={verticalListSortingStrategy}>
          {entries.map((e) => (
            <Tile key={e.id} entry={e} cats={cats} onOpen={onOpen} onTagClick={onTagClick} />
          ))}
        </SortableContext>

        {entries.length === 0 && (
          <p className="px-1 py-6 text-center text-sm text-muted">Nothing here yet.</p>
        )}

        <button
          onClick={() => onQuickAdd(id)}
          className="mt-1 rounded-2xl border border-dashed border-edge py-2.5 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent"
        >
          + Add to {label}
        </button>
      </div>
    </div>
  )
}
