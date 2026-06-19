import { useEffect, useRef } from 'react'

// Lightweight rich text: Cmd/Ctrl+B for bold, "- " at line start for bullets.
// Stores simple HTML in `value`. No markdown.
export default function RichText({
  value,
  onChange,
  placeholder
}: {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  // Seed the content once on mount (and when switching to a different entry).
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function emit() {
    onChange(ref.current?.innerHTML || '')
  }

  function exec(cmd: string) {
    document.execCommand(cmd, false)
    ref.current?.focus()
    emit()
  }

  function onKeyDown(e: React.KeyboardEvent) {
    // Bold
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault()
      exec('bold')
      return
    }
    // "- " turns the line into a bullet
    if (e.key === ' ') {
      const sel = window.getSelection()
      if (sel && sel.isCollapsed && sel.anchorNode) {
        const node = sel.anchorNode
        const txt = node.textContent || ''
        if (sel.anchorOffset === 1 && txt.charAt(0) === '-') {
          e.preventDefault()
          node.textContent = txt.slice(1)
          document.execCommand('insertUnorderedList', false)
          emit()
        }
      }
    }
  }

  return (
    <div>
      <div className="mb-1 flex gap-1">
        <button
          type="button"
          onClick={() => exec('bold')}
          className="h-7 w-7 rounded-md border border-edge bg-panel text-sm font-bold text-text hover:bg-column"
          title="Bold (Cmd+B)"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => exec('insertUnorderedList')}
          className="h-7 w-7 rounded-md border border-edge bg-panel text-base text-text hover:bg-column"
          title="Bullet list"
        >
          •
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onKeyDown={onKeyDown}
        data-placeholder={placeholder || 'Write…'}
        className="note-edit min-h-[9rem] w-full rounded-lg border border-edge bg-panel p-3 text-sm text-text outline-none"
      />
    </div>
  )
}
