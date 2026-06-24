import { useState } from 'react'
import { categoryOrder, DEFAULT_CATEGORIES } from '../types'
import { categoryColor } from '../lib/colors'
import {
  setTagCategory,
  deleteTag,
  addCategory,
  removeCategory,
  type TagCategories
} from '../lib/useUserData'

export default function TagManager({
  userId,
  tagCategories,
  categories,
  usage,
  onClose
}: {
  userId: string
  tagCategories: TagCategories
  categories: string[]
  usage: Record<string, number>
  onClose: () => void
}) {
  const [newTag, setNewTag] = useState('')
  const [newCat, setNewCat] = useState(categories[0] ?? 'Roles')
  const [newCategory, setNewCategory] = useState('')

  const order = categoryOrder(categories)
  const groups: Record<string, string[]> = {}
  for (const cat of order) groups[cat] = []
  for (const [tag, cat] of Object.entries(tagCategories)) {
    const key = groups[cat] !== undefined ? cat : 'Unsorted'
    groups[key].push(tag)
  }
  for (const cat of Object.keys(groups)) groups[cat].sort()

  function addTagToCat() {
    const t = newTag.toLowerCase().replace(/^#/, '').trim()
    if (!t) return
    setTagCategory(userId, t, newCat)
    setNewTag('')
  }

  function addNewCategory() {
    const n = newCategory.trim()
    if (!n) return
    addCategory(userId, n, categories)
    setNewCategory('')
  }

  function deleteCategory(cat: string) {
    // Move its tags to Unsorted, then remove the category.
    for (const tag of groups[cat] ?? []) setTagCategory(userId, tag, 'Unsorted')
    removeCategory(userId, cat, categories)
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
        <div className="mb-3 flex items-center gap-2">
          <input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addTagToCat()
              }
            }}
            placeholder="New tag…"
            className="flex-1 rounded-lg border border-edge bg-ink px-2 py-1.5 text-sm outline-none placeholder:text-muted"
          />
          <select
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            className="rounded-lg border border-edge bg-ink px-2 py-1.5 text-sm text-text"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            onClick={addTagToCat}
            className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white"
          >
            Add
          </button>
        </div>

        {/* add a new category */}
        <div className="mb-4 flex items-center gap-2">
          <input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addNewCategory()
              }
            }}
            placeholder="New category…"
            className="flex-1 rounded-lg border border-edge bg-ink px-2 py-1.5 text-sm outline-none placeholder:text-muted"
          />
          <button
            onClick={addNewCategory}
            className="rounded-lg border border-edge bg-panel px-3 py-1.5 text-sm font-medium text-muted hover:text-accent"
          >
            + Category
          </button>
        </div>

        {/* grouped tags */}
        {order.map((cat) => {
          const removable = cat !== 'Unsorted' && !DEFAULT_CATEGORIES.includes(cat)
          return (
            <div key={cat} className="mb-3">
              <div className="mb-1 flex items-center gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {cat}
                </h3>
                {removable && (
                  <button
                    onClick={() => deleteCategory(cat)}
                    className="text-[11px] text-muted hover:text-red-500"
                  >
                    remove
                  </button>
                )}
              </div>
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
                          onChange={(e) => setTagCategory(userId, tag, e.target.value)}
                          className="ml-auto rounded-md border border-edge bg-ink px-1.5 py-1 text-xs text-text"
                        >
                          {order.map((c2) => (
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
          )
        })}
      </div>
    </div>
  )
}
