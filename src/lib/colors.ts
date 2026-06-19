import type { TagCategory } from '../types'
import type { TagCategories } from './useUserData'

export interface Swatch {
  bg: string // light tint background
  fg: string // readable text on the tint
  solid: string // strong fill for selected / accents
}

// Bold, category-driven palette: every tag in a category shares one color family.
export function categoryColor(cat: TagCategory): Swatch {
  switch (cat) {
    case 'Roles':
      return { bg: '#f1e9fe', fg: '#6d28d9', solid: '#7c3aed' } // violet
    case 'People':
      return { bg: '#e2edff', fg: '#1d4ed8', solid: '#2563eb' } // blue
    case 'Areas':
      return { bg: '#d4f3ec', fg: '#0f766e', solid: '#0d9488' } // teal
    case 'Personal':
      return { bg: '#ffe7d4', fg: '#c2410c', solid: '#ea580c' } // orange
    default:
      return { bg: '#e9ebf4', fg: '#475569', solid: '#64748b' } // gray (Unsorted)
  }
}

// Color for a specific tag, based on the category it's filed under.
export function tagColor(tag: string, cats: TagCategories): Swatch {
  return categoryColor(cats[tag] ?? 'Unsorted')
}
