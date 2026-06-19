import { useEffect, useState } from 'react'
import RichText from './RichText'
import type { Entry, EntryType, Task } from '../types'
import { sortTags } from '../lib/sort'
import { updateEntry, deleteEntry } from '../lib/useEntries'

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

export default function TileEditor({
  entry,
  knownTags,
  onClose
}: {
  entry: Entry
  knownTags: string[]
  onClose: () => void
}) {
  const [local, setLocal] = useState<Entry>(entry)
  const [tagInput, setTagInput] = useState('')

  // Keep local state in sync if the doc changes elsewhere (another device).
  useEffect(() => {
    setLocal(entry)
  }, [entry.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced autosave on any local change.
  useEffect(() => {
    const t = setTimeout(() => {
      const { id, ...patch } = local
      void id
      updateEntry(entry.id, patch)
    }, 400)
    return () => clearTimeout(t)
  }, [local]) // eslint-disable-line react-hooks/exhaustive-deps

  function set<K extends keyof Entry>(key: K, value: Entry[K]) {
    setLocal((p) => ({ ...p, [key]: value }))
  }

  function addTag(raw: string) {
    const t = raw.toLowerCase().replace(/^#/, '').trim()
    if (!t) return
    set('tags', sortTags([...local.tags, t]))
    setTagInput('')
  }

  function removeTag(t: string) {
    set(
      'tags',
      local.tags.filter((x) => x !== t)
    )
  }

  function setType(type: EntryType) {
    set('type', type)
  }

  // ---- tasks (for to-do tiles) ----
  function addTask() {
    const next: Task = {
      id: uid(),
      text: '',
      done: false,
      position: (local.tasks.at(-1)?.position ?? 0) + 1
    }
    set('tasks', [...local.tasks, next])
  }
  function updateTask(id: string, patch: Partial<Task>) {
    set(
      'tasks',
      local.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t))
    )
  }
  function removeTask(id: string) {
    set(
      'tasks',
      local.tasks.filter((t) => t.id !== id)
    )
  }

  const suggestions = knownTags
    .filter((t) => !local.tags.includes(t) && t.includes(tagInput.toLowerCase()))
    .slice(0, 6)

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center sm:justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 flex max-h-[92vh] w-full flex-col overflow-y-auto rounded-t-2xl border border-edge bg-panel p-4 sm:max-w-lg sm:rounded-2xl">
        <div className="mb-3 flex items-center justify-between">
          <div className="inline-flex rounded-lg border border-edge bg-ink p-0.5 text-xs">
            <button
              onClick={() => setType('note')}
              className={`rounded-md px-3 py-1 ${local.type === 'note' ? 'bg-panel2 text-accent' : 'text-muted'}`}
            >
              Note
            </button>
            <button
              onClick={() => setType('todo')}
              className={`rounded-md px-3 py-1 ${local.type === 'todo' ? 'bg-panel2 text-accent' : 'text-muted'}`}
            >
              To-Do
            </button>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <button
              onClick={() => set('pinned', !local.pinned)}
              className={local.pinned ? 'text-amber-300' : 'text-muted'}
              title="Pin"
            >
              📌
            </button>
            <button onClick={onClose} className="text-muted hover:text-text">
              Done
            </button>
          </div>
        </div>

        <input
          value={local.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="Title"
          className="mb-3 w-full bg-transparent text-lg font-semibold text-text outline-none placeholder:text-muted"
          autoFocus={!local.title}
        />

        {/* tags */}
        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-muted">Tags</label>
          <div className="mb-1 flex flex-wrap gap-1">
            {local.tags.map((t) => (
              <span
                key={t}
                className="flex items-center gap-1 rounded-full bg-panel2 px-2 py-0.5 text-xs text-accent"
              >
                #{t}
                <button onClick={() => removeTag(t)} className="text-muted">
                  ×
                </button>
              </span>
            ))}
          </div>
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault()
                addTag(tagInput)
              }
            }}
            placeholder="Add tag, press enter"
            className="w-full rounded-lg border border-edge bg-ink px-2 py-1.5 text-sm outline-none placeholder:text-muted"
          />
          {tagInput && suggestions.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => addTag(s)}
                  className="rounded-full bg-panel2 px-2 py-0.5 text-xs text-muted hover:text-accent"
                >
                  #{s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* due date */}
        <label className="mb-3 flex items-center gap-2 text-sm text-muted">
          Due
          <input
            type="date"
            value={local.dueDate ?? ''}
            onChange={(e) => set('dueDate', e.target.value || null)}
            className="rounded-lg border border-edge bg-ink px-2 py-1 text-sm text-text"
          />
          {local.dueDate && (
            <button onClick={() => set('dueDate', null)} className="text-xs text-muted">
              clear
            </button>
          )}
        </label>

        {/* body / tasks */}
        {local.type === 'note' ? (
          <div className="mb-3">
            <RichText
              value={local.body}
              onChange={(html) => set('body', html)}
              placeholder="Write a note…  (Cmd+B to bold, “- ” for bullets)"
            />
          </div>
        ) : (
          <div className="mb-3 space-y-1.5">
            {local.tasks.map((t) => (
              <div key={t.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={t.done}
                  onChange={(e) => updateTask(t.id, { done: e.target.checked })}
                  className="h-4 w-4 accent-teal-400"
                />
                <input
                  value={t.text}
                  onChange={(e) => updateTask(t.id, { text: e.target.value })}
                  placeholder="Task..."
                  className={`flex-1 bg-transparent text-sm outline-none ${
                    t.done ? 'text-muted line-through' : 'text-text'
                  }`}
                />
                <button onClick={() => removeTask(t.id)} className="text-muted">
                  ×
                </button>
              </div>
            ))}
            <button
              onClick={addTask}
              className="text-xs text-accent hover:underline"
            >
              + Add task
            </button>
          </div>
        )}

        <button
          onClick={() => {
            deleteEntry(entry.id)
            onClose()
          }}
          className="mt-2 self-start text-xs text-red-300/80 hover:text-red-300"
        >
          Delete tile
        </button>
      </div>
    </div>
  )
}
