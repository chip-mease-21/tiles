import { useEffect, useMemo, useState } from 'react'
import { useAuth, signOut } from './lib/useAuth'
import { useEntries, createEntry } from './lib/useEntries'
import { useUserData, registerTags } from './lib/useUserData'
import { matchesFilter } from './lib/sort'
import { parseCapture } from './lib/parse'
import { COLUMNS, type ColumnId, type SortMode } from './types'
import Board from './components/Board'
import BoardColumns from './components/BoardColumns'
import TileEditor from './components/TileEditor'
import QuickAdd from './components/QuickAdd'
import TagBar from './components/TagBar'
import TagManager from './components/TagManager'
import Login from './components/Login'

const DEFAULT_SORTS: Record<ColumnId, SortMode> = {
  inbox: 'manual',
  notes: 'manual',
  today: 'due',
  this_week: 'due',
  this_month: 'due',
  next_month: 'due',
  someday: 'manual'
}

// On wide screens show all columns at once; on phones use the tab view.
function useIsDesktop() {
  const [d, setD] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 1024
  )
  useEffect(() => {
    const onResize = () => setD(window.innerWidth >= 1024)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return d
}

export default function App() {
  const { user, loading } = useAuth()
  const { entries } = useEntries(user?.uid)
  const { tagCategories, categories, loaded: tagsLoaded } = useUserData(user?.uid)
  const isDesktop = useIsDesktop()

  const [openId, setOpenId] = useState<string | null>(null)
  const [quickAdd, setQuickAdd] = useState(false)
  const [showTags, setShowTags] = useState(false)
  const [activeColumn, setActiveColumn] = useState<ColumnId>('today')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [sorts, setSorts] = useState<Record<ColumnId, SortMode>>(DEFAULT_SORTS)

  // Tags used in entries -> usage counts; also keep the persistent tag list in sync.
  const usage = useMemo(() => {
    const m: Record<string, number> = {}
    for (const e of entries) {
      if (e.archived) continue
      for (const t of e.tags) m[t] = (m[t] || 0) + 1
    }
    return m
  }, [entries])

  useEffect(() => {
    // Wait until the saved tag categories have loaded, otherwise we'd register
    // already-categorized tags back to "Unsorted" and wipe the user's filing.
    if (!user || !tagsLoaded) return
    const used = new Set<string>()
    for (const e of entries) for (const t of e.tags) used.add(t)
    registerTags(user.uid, [...used], tagCategories)
  }, [entries, tagCategories, tagsLoaded, user])

  const knownTags = useMemo(() => Object.keys(tagCategories).sort(), [tagCategories])

  const filtered = useMemo(
    () =>
      entries.filter(
        (e) =>
          matchesFilter(e, selectedTags, search) &&
          (showArchived ? e.archived === true : !e.archived)
      ),
    [entries, selectedTags, search, showArchived]
  )
  const counts = useMemo(() => {
    const m = {
      inbox: 0,
      notes: 0,
      today: 0,
      this_week: 0,
      this_month: 0,
      next_month: 0,
      someday: 0
    } as Record<ColumnId, number>
    for (const e of filtered) m[e.column] = (m[e.column] || 0) + 1
    return m
  }, [filtered])
  const openEntry = entries.find((e) => e.id === openId) || null

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">…</div>
    )
  }
  if (!user) return <Login />

  async function quickCreate(text: string) {
    const { title, tags, dueDate } = parseCapture(text)
    setActiveColumn('inbox')
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
        tagCategories={tagCategories}
        categories={categories}
        selected={selectedTags}
        onToggle={toggleTag}
        onClear={() => {
          setSelectedTags([])
          setSearch('')
        }}
        onManage={() => setShowTags(true)}
        search={search}
        onSearch={setSearch}
      />

      {/* Phone: column tabs (one column at a time). Desktop: all columns. */}
      {!isDesktop && (
        <div className="no-scrollbar mt-1 flex gap-1.5 overflow-x-auto px-3 py-2">
          {COLUMNS.map((c) => {
            const active = c.id === activeColumn
            return (
              <button
                key={c.id}
                onClick={() => setActiveColumn(c.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm transition-colors ${
                  active
                    ? 'bg-accent font-semibold text-white'
                    : 'bg-panel text-muted hover:text-text'
                }`}
              >
                {c.label}
                {counts[c.id] > 0 && (
                  <span
                    className={`rounded-full px-1.5 text-[11px] ${
                      active ? 'bg-white/25 text-white' : 'bg-column text-muted'
                    }`}
                  >
                    {counts[c.id]}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {isDesktop ? (
        <BoardColumns
          entries={filtered}
          sorts={sorts}
          cats={tagCategories}
          onSortChange={setColumnSort}
          onOpen={setOpenId}
          onQuickAdd={addToColumn}
          onTagClick={(t) => setSelectedTags([t])}
        />
      ) : (
        <Board
          entries={filtered}
          activeColumn={activeColumn}
          sorts={sorts}
          cats={tagCategories}
          onSortChange={setColumnSort}
          onOpen={setOpenId}
          onQuickAdd={addToColumn}
          onTagClick={(t) => setSelectedTags([t])}
        />
      )}

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
        <TileEditor
          entry={openEntry}
          knownTags={knownTags}
          cats={tagCategories}
          onClose={() => setOpenId(null)}
        />
      )}

      {showTags && (
        <TagManager
          userId={user.uid}
          tagCategories={tagCategories}
          categories={categories}
          usage={usage}
          onClose={() => setShowTags(false)}
        />
      )}

      {/* column legend for first-time emptiness */}
      {entries.length === 0 && (
        <div className="pointer-events-none fixed inset-x-0 top-1/2 text-center text-sm text-muted">
          Tap + to capture your first idea.
          <div className="mt-1 text-xs">{COLUMNS.map((c) => c.label).join(' · ')}</div>
        </div>
      )}
    </div>
  )
}
