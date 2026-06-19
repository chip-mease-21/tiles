export type ColumnId = 'inbox' | 'notes' | 'today' | 'this_week' | 'someday'

export const COLUMNS: { id: ColumnId; label: string }[] = [
  { id: 'inbox', label: 'Inbox' },
  { id: 'notes', label: 'Notes' },
  { id: 'today', label: 'Today' },
  { id: 'this_week', label: 'This Week' },
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
  tasks: Task[]
  createdAt?: number
  updatedAt?: number
}

export type SortMode = 'manual' | 'due' | 'tag'
