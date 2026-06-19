import { useEffect, useState } from 'react'
import RichText from './RichText'
import TaskList from './TaskList'
import type { Entry, EntryType } from '../types'
import { sortTags } from '../lib/sort'
import { updateEntry, deleteEntry } from '../lib/useEntries'

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

  // Flush the current edits immediately (debounced autosave may not have fired).
  function closeAndSave() {
    const { id, ...patch } = local
    void id
    updateEntry(entry.id, patch)
    onClose()
  }

  function archiveAndClose(value: boolean) {
    const { id, ...patch } = local
    void id
    updateEntry(entry.id, { ...patch, archived: value })
    onClose()
  }

  const suggestions = knownTags
    .filter((t) => !local.tags.includes(t) && t.includes(tagInput.toLowerCase()))
    .slice(0, 6)

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center sm:justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={closeAndSave} />
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
            <button onClick={closeAndSave} className="text-muted hover:text-text">
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
          <div className="mb-3">
            <TaskList tasks={local.tasks} onChange={(tasks) => set('tasks', tasks)} />
          </div>
        )}

        <div className="mt-2 flex items-center justify-between">
          <button
            onClick={() => archiveAndClose(!local.archived)}
            className="text-xs text-muted hover:text-text"
          >
            {local.archived ? 'Unarchive' : 'Archive'}
          </button>
          <button
            onClick={() => {
              deleteEntry(entry.id)
              onClose()
            }}
            className="text-xs text-red-400/90 hover:text-red-500"
          >
            Delete tile
          </button>
        </div>
      </div>
    </div>
  )
}
