import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Entry } from '../types'
import { updateEntry } from '../lib/useEntries'
import { tagColor } from '../lib/colors'
import type { TagCategories } from '../lib/useUserData'

function dueLabel(due?: string | null): { text: string; bg: string; fg: string } | null {
  if (!due) return null
  const d = new Date(due + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
  const text =
    diff === 0 ? 'Due today' : diff === 1 ? 'Due tomorrow' : diff === -1 ? 'Due yesterday'
      : 'Due ' + d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  if (diff < 0) return { text, bg: '#fee2e2', fg: '#b91c1c' } // overdue
  if (diff <= 1) return { text, bg: '#fef3c7', fg: '#b45309' } // soon
  return { text, bg: '#eef0f8', fg: '#5b6472' }
}

function createdLabel(ms?: number): string | null {
  if (!ms) return null
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function stop(e: React.SyntheticEvent) {
  e.stopPropagation()
}

export default function Tile({
  entry,
  cats,
  onOpen,
  onTagClick
}: {
  entry: Entry
  cats: TagCategories
  onOpen: (id: string) => void
  onTagClick?: (tag: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: entry.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1
  }

  const isTodo = entry.type === 'todo'
  const done = entry.tasks.filter((t) => t.done).length
  const total = entry.tasks.length
  const due = dueLabel(entry.dueDate)
  const created = createdLabel(entry.createdAt)
  const accent = entry.tags.length ? tagColor(entry.tags[0], cats).solid : '#cbd5e1'

  function toggleTask(id: string) {
    updateEntry(entry.id, {
      tasks: entry.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    })
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(entry.id)}
      className="relative cursor-grab touch-none select-none overflow-hidden rounded-2xl border border-edge bg-panel2 py-3 pl-4 pr-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing"
    >
      <span
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ backgroundColor: accent }}
        aria-hidden="true"
      />

      <div className="flex items-start gap-2">
        {entry.pinned && <span className="mt-0.5 text-xs text-amber-500">📌</span>}
        <h3 className="flex-1 break-words text-[15px] font-semibold leading-snug text-text">
          {entry.title || <span className="italic text-muted">Untitled</span>}
        </h3>
        {isTodo && total > 0 && (
          <span className="shrink-0 rounded-full bg-column px-2 py-0.5 text-[11px] font-medium text-muted">
            {done}/{total}
          </span>
        )}
      </div>

      {!isTodo && entry.body && (
        <div
          className="note-body mt-1.5 text-[13px] leading-relaxed text-muted"
          dangerouslySetInnerHTML={{ __html: entry.body }}
        />
      )}

      {isTodo && total > 0 && (
        <div className="mt-2.5 space-y-1.5">
          {entry.tasks.map((t) => (
            <label
              key={t.id}
              onPointerDown={stop}
              onClick={stop}
              className="flex cursor-pointer items-start gap-2.5"
            >
              <input
                type="checkbox"
                checked={t.done}
                onChange={() => toggleTask(t.id)}
                className="mt-0.5 h-[18px] w-[18px] shrink-0 rounded accent-accent"
              />
              <span
                className={`text-[13px] leading-snug ${t.done ? 'text-muted line-through' : 'text-text'}`}
              >
                {t.text || <span className="italic text-muted">New task</span>}
              </span>
            </label>
          ))}
        </div>
      )}

      {(entry.tags.length > 0 || due || created) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {isTodo && due && (
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{ backgroundColor: due.bg, color: due.fg }}
            >
              {due.text}
            </span>
          )}
          {!isTodo && created && (
            <span className="text-[11px] font-medium text-muted">{created}</span>
          )}
          {entry.tags.map((t) => {
            const c = tagColor(t, cats)
            return (
              <button
                key={t}
                onPointerDown={stop}
                onClick={(e) => {
                  e.stopPropagation()
                  onTagClick?.(t)
                }}
                style={{ backgroundColor: c.bg, color: c.fg }}
                className="rounded-full px-2 py-0.5 text-[11px] font-medium hover:brightness-95"
              >
                #{t}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
