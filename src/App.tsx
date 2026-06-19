import { useMemo, useState } from 'react'
import { useAuth, signOut } from './lib/useAuth'
import { useEntries, createEntry } from './lib/useEntries'
import { allTags, matchesFilter } from './lib/sort'
import { parseCapture } from './lib/parse'
import { COLUMNS, type ColumnId, type SortMode } from './types'
import Board from './components/Board'
import TileEditor from './components/TileEditor'
import QuickAdd from './components/QuickAdd'
import TagBar from './components/TagBar'
import Login from './components/Login'

const DEFAULT_SORTS: Record<ColumnId, SortMode> = {
  inbox: 'manual',
  notes: 'manual',
  today: 'due',
  this_week: 'due',
  someday: 'manual'
}

export default function App() {
  const { user, loading } = useAuth()
  const { entries } = useEntries(user?.uid)

  const [openId, setOpenId] = useState<string | null>(null)
  const [quickAdd, setQuickAdd] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [sorts, setSorts] = useState<Record<ColumnId, SortMode>>(DEFAULT_SORTS)

  const tags = useMemo(() => allTags(entries.filter((e) => !e.archived)), [entries])
  const filtered = useMemo(
    () =>
      entries.filter(
        (e) =>
          matchesFilter(e, selectedTags, search) &&
          (showArchived ? e.archived === true : !e.archived)
      ),
    [entries, selectedTags, search, showArchived]
  )
  const openEntry = entries.find((e) => e.id === openId) || null

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">…</div>
    )
  }
  if (!user) return <Login />

  async function quickCreate(text: string) {
    const { title, tags, dueDate } = parseCapture(text)
    return createEntry(user!.uid, { title, tags, dueDate, type: 'note', column: 'inbox' })
  }

  async function addToColumn(column: ColumnId) {
    const id = await createEntry(user!.uid, { type: 'note', column })
    setOpenId(id)
  }

  function toggleTag(t: string) {
    setSelectedTags((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]))
  }

  function setColumnSort(c: ColumnId, s: SortMode) {
    setSorts((p) => ({ ...p, [c]: s }))
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="flex items-center justify-between px-4 pt-3">
        <h1 className="text-xl font-bold tracking-tight">
          {showArchived ? 'Archived' : 'Tiles'}
        </h1>
        <div className="flex items-center gap-3 text-xs text-muted">
          <button
            onClick={() => setShowArchived((v) => !v)}
            className={showArchived ? 'font-semibold text-accent' : 'hover:text-text'}
          >
            {showArchived ? '← Board' : 'Archived'}
          </button>
          <button onClick={() => signOut()} className="hover:text-text">
            Sign out
          </button>
        </div>
      </header>

      <TagBar
        tags={tags}
        selected={selectedTags}
        onToggle={toggleTag}
        onClear={() => {
          setSelectedTags([])
          setSearch('')
        }}
        search={search}
        onSearch={setSearch}
      />

      <Board
        entries={filtered}
        sorts={sorts}
        onSortChange={setColumnSort}
        onOpen={setOpenId}
        onQuickAdd={addToColumn}
        onTagClick={(t) => setSelectedTags([t])}
      />

      {/* Frictionless capture button */}
      <button
        onClick={() => setQuickAdd(true)}
        className="fixed bottom-6 left-1/2 z-30 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-accent text-3xl font-light text-ink shadow-xl"
        aria-label="Capture"
        style={{ paddingBottom: '2px' }}
      >
        +
      </button>

      {quickAdd && (
        <QuickAdd
          onCreate={quickCreate}
          onClose={() => setQuickAdd(false)}
          onOpenAfter={(id) => {
            setQuickAdd(false)
            setOpenId(id)
          }}
        />
      )}

      {openEntry && (
        <TileEditor entry={openEntry} knownTags={tags} onClose={() => setOpenId(null)} />
      )}

      {/* column legend for first-time emptiness */}
      {entries.length === 0 && (
        <div className="pointer-events-none fixed inset-x-0 top-1/2 text-center text-sm text-muted">
          Tap + to capture your first idea.
          <div className="mt-1 text-xs">
            {COLUMNS.map((c) => c.label).join(' · ')}
          </div>
        </div>
      )}
    </div>
  )
}
