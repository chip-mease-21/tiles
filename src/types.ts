export type ColumnId =
  | 'inbox'
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'next_month'
  | 'someday'

export const COLUMNS: { id: ColumnId; label: string }[] = [
  { id: 'inbox', label: 'Inbox' },
  { id: 'today', label: 'Today' },
  { id: 'this_week', label: 'This Week' },
  { id: 'this_month', label: 'This Month' },
  { id: 'next_month', label: 'Next Month' },
  { id: 'someday', label: 'Someday' }
]

const COLUMN_IDS = new Set<string>(COLUMNS.map((c) => c.id))

// Retired columns leave their entries behind. Rather than let those entries
// vanish from a board that no longer has a place for them, anything pointing at
// a column that no longer exists is read as Inbox and can be re-filed by hand.
// Nothing is deleted and nothing is silently lost.
export function toColumn(value: unknown): ColumnId {
  return typeof value === 'string' && COLUMN_IDS.has(value)
    ? (value as ColumnId)
    : 'inbox'
}

export type EntryType = 'note' | 'todo'

export interface Task {
  id: string
  text: string
  done: boolean
  position: number
  dueDate?: string | null // ISO yyyy-mm-dd
}

export interface Entry {
  id: string
  userId: string
  type: EntryType
  title: string
  body: string
  column: ColumnId
  position: number
  tags: string[]
  dueDate?: string | null // ISO yyyy-mm-dd
  pinned: boolean
  archived?: boolean
  /**
   * Who the tile belongs to on a shared board. Null means nobody has picked it
   * up yet, which is deliberately visible rather than defaulted away. Ignored
   * entirely on a private board, where every tile is yours by definition.
   */
  ownerUid?: string | null
  tasks: Task[]
  createdAt?: number
  updatedAt?: number
}

export type SortMode = 'manual' | 'due' | 'tag'

// Categories are user-editable, so a category is just a string.
// 'Unsorted' is the reserved bucket for tags not yet filed.
export type TagCategory = string
export const DEFAULT_CATEGORIES = ['Roles', 'People', 'Areas', 'Personal']

// Build the display order from the user's categories plus the Unsorted bucket.
export function categoryOrder(categories: string[]): string[] {
  return [...categories, 'Unsorted']
}
