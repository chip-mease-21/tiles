import { useState } from 'react'

// Frictionless capture: one tap opens this, type a title, enter saves it.
export default function QuickAdd({
  onCreate,
  onClose,
  onOpenAfter
}: {
  onCreate: (title: string) => Promise<string>
  onClose: () => void
  onOpenAfter: (id: string) => void
}) {
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)

  async function save(openAfter: boolean) {
    const t = title.trim()
    if (!t || busy) {
      if (!t) onClose()
      return
    }
    setBusy(true)
    const id = await onCreate(t)
    setBusy(false)
    setTitle('')
    if (openAfter) onOpenAfter(id)
    else onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh]">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-[92vw] max-w-md rounded-2xl border border-edge bg-panel p-3 shadow-xl">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save(false)
            if (e.key === 'Escape') onClose()
          }}
          placeholder="Capture an idea…"
          autoFocus
          className="w-full bg-transparent px-1 py-2 text-base text-text outline-none placeholder:text-muted"
        />
        <div className="mt-1 flex items-center justify-between px-1">
          <span className="text-[11px] text-muted">Inbox • try “#church friday” • Enter to save</span>
          <div className="flex gap-2">
            <button
              onClick={() => save(true)}
              className="rounded-lg border border-edge px-2.5 py-1 text-xs text-muted hover:text-accent"
            >
              Save & open
            </button>
            <button
              onClick={() => save(false)}
              className="rounded-lg bg-accent px-3 py-1 text-xs font-semibold text-ink"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
