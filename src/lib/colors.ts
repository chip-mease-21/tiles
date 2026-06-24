import type { TagCategory } from '../types'
import type { TagCategories } from './useUserData'

export interface Swatch {
  bg: string // light tint background
  fg: string // readable text on the tint
  solid: string // strong fill for selected / accents
}

const FIXED: Record<string, Swatch> = {
  Roles: { bg: '#f1e9fe', fg: '#6d28d9', solid: '#7c3aed' }, // violet
  People: { bg: '#e2edff', fg: '#1d4ed8', solid: '#2563eb' }, // blue
  Areas: { bg: '#d4f3ec', fg: '#0f766e', solid: '#0d9488' }, // teal
  Personal: { bg: '#ffe7d4', fg: '#c2410c', solid: '#ea580c' } // orange
}

// Palette for user-added categories, picked deterministically from the name.
const PALETTE: Swatch[] = [
  { bg: '#fde7f0', fg: '#9d174d', solid: '#db2777' }, // pink
  { bg: '#e7f6d9', fg: '#3f6212', solid: '#65a30d' }, // green
  { bg: '#fdecc8', fg: '#92400e', solid: '#d97706' }, // amber
  { bg: '#e0f2fe', fg: '#075985', solid: '#0284c7' }, // sky
  { bg: '#fae8e8', fg: '#991b1b', solid: '#dc2626' }, // red
  { bg: '#e0fbf2', fg: '#115e59', solid: '#0d9488' } // emerald
]

const GRAY: Swatch = { bg: '#e9ebf4', fg: '#475569', solid: '#64748b' }

// Bold, category-driven palette: every tag in a category shares one color family.
export function categoryColor(cat: TagCategory): Swatch {
  if (cat in FIXED) return FIXED[cat]
  if (!cat || cat === 'Unsorted') return GRAY
  let h = 0
  for (let i = 0; i < cat.length; i++) h = (h * 31 + cat.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}

// Color for a specific tag, based on the category it's filed under.
export function tagColor(tag: string, cats: TagCategories): Swatch {
  return categoryColor(cats[tag] ?? 'Unsorted')
}
