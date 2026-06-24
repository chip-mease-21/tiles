import { useEffect, useRef } from 'react'

// Lightweight rich text: Cmd/Ctrl+B bold, "- " for bullets, Tab to indent
// (sub-bullets), and links (Cmd/Ctrl+K or the link button). Stores HTML.
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

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function emit() {
    const el = ref.current
    if (el) {
      el.querySelectorAll('a').forEach((a) => {
        a.setAttribute('target', '_blank')
        a.setAttribute('rel', 'noopener noreferrer')
      })
      onChange(el.innerHTML)
    }
  }

  function exec(cmd: string) {
    document.execCommand(cmd, false)
    ref.current?.focus()
    emit()
  }

  function insertLink() {
    const sel = window.getSelection()
    const hasSelection = !!sel && !sel.isCollapsed
    const url = window.prompt('Link URL', 'https://')
    if (!url) return
    ref.current?.focus()
    if (hasSelection) {
      document.execCommand('createLink', false, url)
    } else {
      const safe = url.replace(/"/g, '%22')
      document.execCommand('insertHTML', false, `<a href="${safe}">${url}</a> `)
    }
    emit()
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault()
      exec('bold')
      return
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault()
      insertLink()
      return
    }
    if (e.key === 'Tab') {
      e.preventDefault()
      document.execCommand(e.shiftKey ? 'outdent' : 'indent', false)
      emit()
      return
    }
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
        <button
          type="button"
          onClick={insertLink}
          className="h-7 w-7 rounded-md border border-edge bg-panel text-sm text-text hover:bg-column"
          title="Add link (Cmd+K)"
        >
          🔗
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
