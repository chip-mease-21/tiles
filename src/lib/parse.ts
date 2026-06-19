// Smart capture: pull #tags and a date word out of free text.
// e.g. "call pastor #church friday" -> title "call pastor", tags ["church"], dueDate Fri.

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
const WEEKDAY_ABBR = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

function iso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function nextWeekday(target: number): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  let add = (target - d.getDay() + 7) % 7
  if (add === 0) add = 7 // "monday" means the upcoming monday, not today
  d.setDate(d.getDate() + add)
  return iso(d)
}

function dateFromWord(w: string): string | null {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (w === 'today') return iso(today)
  if (w === 'tomorrow' || w === 'tmrw') {
    today.setDate(today.getDate() + 1)
    return iso(today)
  }
  let idx = WEEKDAYS.indexOf(w)
  if (idx < 0) idx = WEEKDAY_ABBR.indexOf(w)
  if (idx >= 0) return nextWeekday(idx)
  return null
}

export function parseCapture(raw: string): {
  title: string
  tags: string[]
  dueDate: string | null
} {
  const tags: string[] = []
  let dueDate: string | null = null

  const kept: string[] = []
  for (const token of raw.split(/\s+/)) {
    if (token.startsWith('#') && token.length > 1) {
      tags.push(token.slice(1).toLowerCase())
      continue
    }
    const d = dateFromWord(token.toLowerCase())
    if (d && !dueDate) {
      dueDate = d
      continue
    }
    kept.push(token)
  }

  return {
    title: kept.join(' ').trim() || raw.trim(),
    tags: [...new Set(tags)],
    dueDate
  }
}
