import { tagColor } from '../lib/colors'

export default function TagBar({
  tags,
  selected,
  onToggle,
  onClear,
  search,
  onSearch
}: {
  tags: string[]
  selected: string[]
  onToggle: (t: string) => void
  onClear: () => void
  search: string
  onSearch: (s: string) => void
}) {
  return (
    <div className="px-3 pt-2">
      <input
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder="Search by text or date…"
        className="mb-2 w-full rounded-xl border border-edge bg-panel px-3 py-2 text-sm outline-none placeholder:text-muted"
      />
      {(tags.length > 0 || selected.length > 0) && (
        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1">
          {tags.map((t) => {
            const on = selected.includes(t)
            const c = tagColor(t)
            return (
              <button
                key={t}
                onClick={() => onToggle(t)}
                style={
                  on
                    ? { backgroundColor: c.solid, color: 'white' }
                    : { backgroundColor: c.bg, color: c.fg }
                }
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${on ? 'font-semibold' : ''}`}
              >
                #{t}
              </button>
            )
          })}
          {(selected.length > 0 || search) && (
            <button
              onClick={onClear}
              className="shrink-0 rounded-full px-2.5 py-1 text-xs text-muted underline"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  )
}
