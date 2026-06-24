export type ColumnId =
  | 'inbox'
  | 'notes'
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'next_month'
  | 'someday'

export const COLUMNS: { id: ColumnId; label: string }[] = [
  { id: 'inbox', label: 'Inbox' },
  { id: 'notes', label: 'Notes' },
  { id: 'today', label: 'Today' },
  { id: 'this_week', label: 'This Week' },
  { id: 'this_month', label: 'This Month' },
  { id: 'next_month', label: 'Next Month' },
  { id: 'someday', label: 'Someday' }
]

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
