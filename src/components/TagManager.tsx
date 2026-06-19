import { useState } from 'react'
import { TAG_CATEGORIES, TAG_CATEGORY_ORDER, type TagCategory } from '../types'
import { categoryColor } from '../lib/colors'
import { setTagCategory, deleteTag, type TagCategories } from '../lib/useUserData'

export default function TagManager({
  userId,
  tagCategories,
  usage,
  onClose
}: {
  userId: string
  tagCategories: TagCategories
  usage: Record<string, number>
  onClose: () => void
}) {
  const [newTag, setNewTag] = useState('')
  const [newCat, setNewCat] = useState<TagCategory>('Roles')

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

  function addTag() {
    const t = newTag.toLowerCase().replace(/^#/, '').trim()
    if (!t) return
    setTagCategory(userId, t, newCat)
    setNewTag('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 flex max-h-[92vh] w-full flex-col overflow-y-auto rounded-t-2xl border border-edge bg-panel p-4 sm:max-w-lg sm:rounded-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-text">Manage tags</h2>
          <button onClick={onClose} className="text-sm text-muted hover:text-text">
            Done
          </button>
        </div>

        {/* add a new tag */}
        <div className="mb-4 flex items-center gap-2">
          <input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addTag()
              }
            }}
            placeholder="New tag…"
            className="flex-1 rounded-lg border border-edge bg-ink px-2 py-1.5 text-sm outline-none placeholder:text-muted"
          />
          <select
            value={newCat}
            onChange={(e) => setNewCat(e.target.value as TagCategory)}
            className="rounded-lg border border-edge bg-ink px-2 py-1.5 text-sm text-text"
          >
            {TAG_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            onClick={addTag}
            className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-ink"
          >
            Add
          </button>
        </div>

        {/* grouped tags */}
        {TAG_CATEGORY_ORDER.map((cat) => (
          <div key={cat} className="mb-3">
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
              {cat}
            </h3>
            {groups[cat].length === 0 ? (
              <p className="text-xs text-muted/70">— none —</p>
            ) : (
              <div className="space-y-1">
                {groups[cat].map((tag) => {
                  const c = categoryColor(cat)
                  return (
                    <div key={tag} className="flex items-center gap-2">
                      <span
                        style={{ backgroundColor: c.bg, color: c.fg }}
                        className="rounded-full px-2 py-0.5 text-xs font-medium"
                      >
                        #{tag}
                      </span>
                      <span className="text-[11px] text-muted">{usage[tag] || 0} used</span>
                      <select
                        value={cat}
                        onChange={(e) =>
                          setTagCategory(userId, tag, e.target.value as TagCategory)
                        }
                        className="ml-auto rounded-md border border-edge bg-ink px-1.5 py-1 text-xs text-text"
                      >
                        {TAG_CATEGORY_ORDER.map((c2) => (
                          <option key={c2} value={c2}>
                            {c2}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => deleteTag(userId, tag)}
                        className="px-1 text-muted hover:text-red-500"
                        aria-label="Delete tag"
                      >
                        ×
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
