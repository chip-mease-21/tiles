/**
 * Open issues, draggable into priority order.
 *
 * IDS says prioritise the top three, so the order of this list is the decision
 * about what the meeting actually spends forty minutes on. Making it draggable
 * is the point: the list is a ranking, not a queue.
 */
import { useMemo, useState } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, KeyboardSensor, closestCenter,
  useSensor, useSensors, type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext, arrayMove, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Issue } from '../types/dlt';
import { updateIssue } from '../lib/org';
import { Button, Card, daysSince } from './ui';

function Row({
  issue, rank, canDrag, canClose, canEdit, onClose, onEdit,
}: {
  issue: Issue; rank: number; canDrag: boolean; canClose: boolean; canEdit: boolean;
  onClose: () => void; onEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: issue.id, disabled: !canDrag });
  const age = daysSince(issue.raised);
  const top3 = rank <= 3;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className={`flex items-start gap-2 border-b border-stone-100 px-3 py-2.5 last:border-b-0 ${
        top3 ? 'bg-blue-50/40' : ''
      }`}
    >
      {canDrag && (
        <button
          type="button" {...attributes} {...listeners}
          aria-label={`Reorder ${issue.text}`}
          className="mt-0.5 cursor-grab touch-none px-1 text-stone-300 hover:text-stone-600 active:cursor-grabbing"
        >
          ⠿
        </button>
      )}
      <span className={`w-4 shrink-0 pt-0.5 text-xs tabular-nums ${top3 ? 'font-bold text-blue-700' : 'text-stone-400'}`}>
        {rank}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-stone-900">{issue.text}</p>
        {issue.note && <p className="mt-0.5 text-xs text-stone-500">{issue.note}</p>}
        <p className={`mt-1 text-[11px] tabular-nums ${age !== null && age > 45 ? 'font-semibold text-red-700' : 'text-stone-400'}`}>
          {age} days open · raised by {issue.raisedByLabel}
        </p>
      </div>
      {canEdit && <Button variant="ghost" onClick={onEdit}>Edit</Button>}
      {canClose && <Button variant="ghost" onClick={onClose}>Close</Button>}
    </li>
  );
}

export function IssueList({
  issues, canEdit, userUid, onClose, onEdit, onAdd,
}: {
  issues: Issue[]; canEdit: boolean; userUid: string | undefined;
  onClose: (i: Issue) => void; onEdit: (i: Issue) => void; onAdd: () => void;
}) {
  const [dragging, setDragging] = useState<Issue | null>(null);
  const [draft, setDraft] = useState<string[] | null>(null);

  const byId = useMemo(() => new Map(issues.map((i) => [i.id, i])), [issues]);
  const ordered = useMemo(
    () => (draft ?? [...issues].sort((a, b) => a.order - b.order).map((i) => i.id)),
    [draft, issues],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragStart(e: DragStartEvent) {
    setDragging(byId.get(String(e.active.id)) ?? null);
    setDraft(ordered);
  }

  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setDragging(null);
    if (!over || !draft) { setDraft(null); return; }
    const from = draft.indexOf(String(active.id));
    const to = draft.indexOf(String(over.id));
    if (from < 0 || to < 0 || from === to) { setDraft(null); return; }
    const next = arrayMove(draft, from, to);
    setDraft(next);
    try {
      await Promise.all(next.map((id, i) => {
        const issue = byId.get(id);
        return issue && issue.order !== i + 1 ? updateIssue(id, { order: i + 1 }) : null;
      }).filter(Boolean) as Promise<unknown>[]);
    } finally { setDraft(null); }
  }

  return (
    <Card
      title="Open issues"
      right={<span className="text-xs text-stone-500">{issues.length} open</span>}
    >
      {canEdit && (
        <p className="border-b border-stone-100 px-3 py-1.5 text-[11px] text-stone-500">
          Drag into priority order. The top three are what IDS is for.
        </p>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => { setDragging(null); setDraft(null); }}
      >
        <SortableContext items={ordered} strategy={verticalListSortingStrategy}>
          <ul>
            {ordered.map((id, idx) => {
              const issue = byId.get(id);
              if (!issue) return null;
              return (
                <Row
                  key={id}
                  issue={issue}
                  rank={idx + 1}
                  canDrag={canEdit}
                  canEdit={canEdit}
                  canClose={canEdit || issue.raisedByUid === userUid}
                  onClose={() => onClose(issue)}
                  onEdit={() => onEdit(issue)}
                />
              );
            })}
            {ordered.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-stone-500">No open issues.</li>
            )}
          </ul>
        </SortableContext>
        <DragOverlay>
          {dragging && (
            <div className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm shadow-lg">
              {dragging.text}
            </div>
          )}
        </DragOverlay>
      </DndContext>
      <div className="border-t border-stone-100 px-3 py-2">
        <Button variant="ghost" onClick={onAdd}>Add an issue</Button>
      </div>
    </Card>
  );
}
