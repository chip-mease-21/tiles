import { tagColor } from '../lib/colors'
import { TAG_CATEGORY_ORDER, type TagCategory } from '../types'
import type { TagCategories } from '../lib/useUserData'

export default function TagBar({
  tagCategories,
  selected,
  onToggle,
  onClear,
  onManage,
  search,
  onSearch
}: {
  tagCategories: TagCategories
  selected: string[]
  onToggle: (t: string) => void
  onClear: () => void
  onManage: () => void
  search: string
  onSearch: (s: string) => void
}) {
  // Group tags by category.
  const groups: Record<TagCategory, string[]> = {
    Roles: [],
    People: [],
    Areas: [],
    Personal: [],
    Unsorted: []
  }
  for (const [tag, cat] of Object.entries(tagCategories)) {
    ;(groups[cat] ?? groups.Unsorted).push(tag)
  }
  for (const k of TAG_CATEGORY_ORDER) groups[k].sort()

  const hasTags = Object.keys(tagCategories).length > 0

  return (
    <div className="px-3 pt-2">
      <input
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder="Search by text or date…"
        className="mb-2 w-full rounded-xl border border-edge bg-panel px-3 py-2 text-sm outline-none placeholder:text-muted"
      />

      <div className="no-scrollbar flex items-center gap-3 overflow-x-auto pb-1">
        {TAG_CATEGORY_ORDER.filter((cat) => groups[cat].length > 0).map((cat) => (
          <div key={cat} className="flex shrink-0 items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">
              {cat}
            </span>
            {groups[cat].map((tag) => {
              const on = selected.includes(tag)
              const c = tagColor(tag, tagCategories)
              return (
                <button
                  key={tag}
                  onClick={() => onToggle(tag)}
                  style={
                    on
                      ? { backgroundColor: c.solid, color: 'white' }
                      : { backgroundColor: c.bg, color: c.fg }
                  }
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${on ? 'font-semibold' : ''}`}
                >
                  #{tag}
                </button>
              )
            })}
          </div>
        ))}

        {(selected.length > 0 || search) && (
          <button
            onClick={onClear}
            className="shrink-0 rounded-full px-2 py-1 text-xs text-muted underline"
          >
            Clear
          </button>
        )}
        <button
          onClick={onManage}
          className="shrink-0 rounded-full border border-edge bg-panel px-2.5 py-1 text-xs text-muted hover:text-accent"
        >
          {hasTags ? 'Edit tags' : '+ Tags'}
        </button>
      </div>
    </div>
  )
}
