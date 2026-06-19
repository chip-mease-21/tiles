import type { Entry, SortMode } from '../types'

export function sortTags(tags: string[]): string[] {
  return [...new Set(tags.map((t) => t.toLowerCase().trim()).filter(Boolean))].sort()
}

// All distinct tags across entries, alphabetical.
export function allTags(entries: Entry[]): string[] {
  return sortTags(entries.flatMap((e) => e.tags))
}

export function matchesFilter(
  entry: Entry,
  selectedTags: string[],
  search: string
): boolean {
  if (selectedTags.length > 0) {
    const has = selectedTags.every((t) => entry.tags.includes(t))
    if (!has) return false
  }
  if (search.trim()) {
    const s = search.toLowerCase()
    const haystack = [
      entry.title,
      entry.body,
      entry.tags.join(' '),
      entry.dueDate ?? '',
      ...entry.tasks.map((t) => t.text)
    ]
      .join(' ')
      .toLowerCase()
    if (!haystack.includes(s)) return false
  }
  return true
}

function dueValue(e: Entry): number {
  if (!e.dueDate) return Number.POSITIVE_INFINITY // undated sinks to the bottom
  return new Date(e.dueDate).getTime()
}

// Sort entries within a column. Pinned always first; then by the chosen mode.
export function sortEntries(entries: Entry[], mode: SortMode): Entry[] {
  const arr = [...entries]
  arr.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    if (mode === 'due') {
      const d = dueValue(a) - dueValue(b)
      if (d !== 0) return d
      return a.position - b.position
    }
    if (mode === 'tag') {
      const at = a.tags[0] ?? '~'
      const bt = b.tags[0] ?? '~'
      if (at !== bt) return at.localeCompare(bt)
      return a.position - b.position
    }
    return a.position - b.position // manual
  })
  return arr
}
