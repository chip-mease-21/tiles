import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Entry } from '../types'
import { updateEntry } from '../lib/useEntries'
import { tagColor } from '../lib/colors'

function dueLabel(due?: string | null): { text: string; tone: string } | null {
  if (!due) return null
  const d = new Date(due + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
  const text =
    diff === 0 ? 'Due today' : diff === 1 ? 'Due tomorrow' : diff === -1 ? 'Due yesterday'
      : 'Due ' + d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const tone = diff < 0 ? 'text-red-500' : diff <= 1 ? 'text-amber-600' : 'text-muted'
  return { text, tone }
}

function createdLabel(ms?: number): string | null {
  if (!ms) return null
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// Stop drag + open-editor when interacting with a control inside the tile.
function stop(e: React.SyntheticEvent) {
  e.stopPropagation()
}

export default function Tile({
  entry,
  onOpen,
  onTagClick
}: {
  entry: Entry
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
      className="cursor-grab touch-none select-none rounded-xl border border-edge bg-panel2 p-3 shadow-sm active:cursor-grabbing"
    >
      <div className="flex items-start gap-2">
        {entry.pinned && <span className="mt-0.5 text-xs text-amber-500">📌</span>}
        <h3 className="flex-1 break-words text-sm font-semibold leading-snug text-text">
          {entry.title || <span className="italic text-muted">Untitled</span>}
        </h3>
        {isTodo && total > 0 && (
          <span className="shrink-0 rounded-md bg-column px-1.5 py-0.5 text-[11px] text-muted">
            {done}/{total}
          </span>
        )}
      </div>

      {/* Note: show a few lines of content */}
      {!isTodo && entry.body && (
        <div
          className="note-body mt-1 text-xs text-muted"
          dangerouslySetInnerHTML={{ __html: entry.body }}
        />
      )}

      {/* To-Do: show the tasks and let them be checked from the board */}
      {isTodo && total > 0 && (
        <div className="mt-2 space-y-1.5">
          {entry.tasks.map((t) => (
            <label
              key={t.id}
              onPointerDown={stop}
              onClick={stop}
              className="flex cursor-pointer items-start gap-2"
            >
              <input
                type="checkbox"
                checked={t.done}
                onChange={() => toggleTask(t.id)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-teal-600"
              />
              <span
                className={`text-xs leading-snug ${t.done ? 'text-muted line-through' : 'text-text'}`}
              >
                {t.text || <span className="italic text-muted">New task</span>}
              </span>
            </label>
          ))}
        </div>
      )}

      {(entry.tags.length > 0 || due || created) && (
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {isTodo && due && <span className={`text-[11px] ${due.tone}`}>{due.text}</span>}
          {!isTodo && created && <span className="text-[11px] text-muted">{created}</span>}
          {entry.tags.map((t) => {
            const c = tagColor(t)
            return (
              <button
                key={t}
                onPointerDown={stop}
                onClick={(e) => {
                  e.stopPropagation()
                  onTagClick?.(t)
                }}
                style={{ backgroundColor: c.bg, color: c.fg }}
                className="rounded-full px-1.5 py-0.5 text-[10px] font-medium hover:brightness-95"
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
