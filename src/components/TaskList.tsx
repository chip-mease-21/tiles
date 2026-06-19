import { useEffect, useRef } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Task } from '../types'

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

function reindex(arr: Task[]): Task[] {
  return arr.map((t, i) => ({ ...t, position: i }))
}

function SortableTaskRow({
  task,
  setInputRef,
  onToggle,
  onText,
  onRemove,
  onEnter
}: {
  task: Task
  setInputRef: (el: HTMLInputElement | null) => void
  onToggle: (done: boolean) => void
  onText: (text: string) => void
  onRemove: () => void
  onEnter: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2">
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none px-1 text-muted"
        title="Drag to reorder"
        aria-label="Drag to reorder"
        tabIndex={-1}
      >
        ⠿
      </button>
      <input
        type="checkbox"
        checked={task.done}
        onChange={(e) => onToggle(e.target.checked)}
        className="h-4 w-4 shrink-0 accent-teal-600"
      />
      <input
        ref={setInputRef}
        value={task.text}
        onChange={(e) => onText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            onEnter()
          }
        }}
        placeholder="Task…"
        className={`flex-1 bg-transparent text-sm outline-none ${
          task.done ? 'text-muted line-through' : 'text-text'
        }`}
      />
      <button onClick={onRemove} className="px-1 text-muted" aria-label="Delete task">
        ×
      </button>
    </div>
  )
}

export default function TaskList({
  tasks,
  onChange
}: {
  tasks: Task[]
  onChange: (tasks: Task[]) => void
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } })
  )
  const inputs = useRef<Record<string, HTMLInputElement | null>>({})
  const pendingFocus = useRef<string | null>(null)

  // After a new task is inserted, focus its input.
  useEffect(() => {
    if (pendingFocus.current && inputs.current[pendingFocus.current]) {
      inputs.current[pendingFocus.current]!.focus()
      pendingFocus.current = null
    }
  })

  function addAfter(id: string) {
    const idx = tasks.findIndex((t) => t.id === id)
    const nt: Task = { id: uid(), text: '', done: false, position: 0 }
    const arr = [...tasks]
    arr.splice(idx + 1, 0, nt)
    pendingFocus.current = nt.id
    onChange(reindex(arr))
  }
  function addEnd() {
    const nt: Task = { id: uid(), text: '', done: false, position: tasks.length }
    pendingFocus.current = nt.id
    onChange(reindex([...tasks, nt]))
  }
  function toggle(id: string, done: boolean) {
    onChange(tasks.map((t) => (t.id === id ? { ...t, done } : t)))
  }
  function setText(id: string, text: string) {
    onChange(tasks.map((t) => (t.id === id ? { ...t, text } : t)))
  }
  function remove(id: string) {
    onChange(reindex(tasks.filter((t) => t.id !== id)))
  }
  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (over && active.id !== over.id) {
      const oldI = tasks.findIndex((t) => t.id === active.id)
      const newI = tasks.findIndex((t) => t.id === over.id)
      onChange(reindex(arrayMove(tasks, oldI, newI)))
    }
  }

  return (
    <div className="space-y-1.5">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((t) => (
            <SortableTaskRow
              key={t.id}
              task={t}
              setInputRef={(el) => {
                inputs.current[t.id] = el
              }}
              onToggle={(d) => toggle(t.id, d)}
              onText={(v) => setText(t.id, v)}
              onRemove={() => remove(t.id)}
              onEnter={() => addAfter(t.id)}
            />
          ))}
        </SortableContext>
      </DndContext>
      <button onClick={addEnd} className="text-xs text-accent hover:underline">
        + Add task
      </button>
    </div>
  )
}
