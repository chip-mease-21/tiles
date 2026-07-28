/**
 * Rocks grouped by owner, draggable.
 *
 * Two moves are possible and both are real edits, not view state:
 *   reorder inside a column, which writes `order`
 *   drag to another column, which reassigns the rock and writes owner too
 *
 * Every write carries the audit stamp, so a rock that changes hands says who
 * moved it. Dragging is available to editors only; a contributor can change the
 * status of their own rock and nothing else, which is the same rule the database
 * enforces.
 *
 * Rocks marked done leave the board and collect in a separate card, because a
 * finished rock is a record, not a priority.
 */
import { useMemo, useState } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, KeyboardSensor, closestCorners,
  useSensor, useSensors, type DragEndEvent, type DragOverEvent, type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext, arrayMove, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import type { Member, Rock } from '../types/dlt';
import { updateRock } from '../lib/org';
import { Button, Card, StatusChip, fmtDate, stampLine } from './ui';

const ORG_COLUMN = 'Organization';

function RockRow({
  rock, canDrag, canSetStatus, isYou, onStatus, onEdit,
}: {
  rock: Rock; canDrag: boolean; canSetStatus: boolean; isYou: boolean;
  onStatus: () => void; onEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: rock.id, disabled: !canDrag });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="border-b border-stone-100 px-3 py-2.5 last:border-b-0"
    >
      <div className="flex items-start gap-2">
        {canDrag && (
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Reorder ${rock.title}`}
            className="mt-0.5 cursor-grab touch-none px-1 text-stone-300 hover:text-stone-600 active:cursor-grabbing"
          >
            ⠿
          </button>
        )}
        <div className="min-w-0 flex-1">
          <span className="text-sm font-medium text-stone-900">{rock.title}</span>
          {canDrag && (
            <button
              type="button"
              className="ml-1.5 text-xs text-stone-400 hover:text-stone-700"
              onClick={onEdit}
            >
              edit
            </button>
          )}
          {rock.description && (
            <p className="mt-0.5 text-xs italic text-stone-500">{rock.description}</p>
          )}
          {rock.statusNote && <p className="mt-1 text-xs text-stone-600">{rock.statusNote}</p>}
          <p className="mt-1 text-[11px] tabular-nums text-stone-400">
            Due {fmtDate(rock.due)}
            {rock.updatedAt ? ` · ${stampLine(isYou ? 'You' : undefined, rock.updatedAt)}` : ''}
          </p>
        </div>
        {canSetStatus
          ? <StatusChip status={rock.status} onClick={onStatus} />
          : <StatusChip status={rock.status} />}
      </div>
    </li>
  );
}

function Column({
  owner, rocks, canDrag, userUid, canEdit, onStatus, onEdit,
}: {
  owner: string; rocks: Rock[]; canDrag: boolean; userUid: string | undefined;
  canEdit: boolean; onStatus: (r: Rock) => void; onEdit: (r: Rock) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${owner}` });
  return (
    <div ref={setNodeRef} className={isOver && canDrag ? 'rounded-xl ring-2 ring-blue-500' : ''}>
      <Card title={owner} right={<span className="text-xs text-stone-500">{rocks.length}</span>}>
        <SortableContext items={rocks.map((r) => r.id)} strategy={verticalListSortingStrategy}>
          <ul className="min-h-[56px]">
            {rocks.map((r) => (
              <RockRow
                key={r.id}
                rock={r}
                canDrag={canDrag}
                canSetStatus={canEdit || (!!userUid && r.ownerUid === userUid)}
                isYou={r.updatedBy === userUid}
                onStatus={() => onStatus(r)}
                onEdit={() => onEdit(r)}
              />
            ))}
            {rocks.length === 0 && (
              <li className="px-3 py-4 text-center text-xs text-stone-400">
                {canDrag ? 'Drop a rock here to hand it over' : 'No rocks'}
              </li>
            )}
          </ul>
        </SortableContext>
      </Card>
    </div>
  );
}

export function RockBoard({
  rocks, members, canEdit, userUid, onStatus, onEdit, onAdd,
}: {
  rocks: Rock[]; members: Member[]; canEdit: boolean; userUid: string | undefined;
  onStatus: (r: Rock) => void; onEdit: (r: Rock) => void; onAdd: () => void;
}) {
  const [dragging, setDragging] = useState<Rock | null>(null);
  // Local ordering while a drag is in flight. Firestore is the source of truth
  // the moment the drag ends.
  const [draft, setDraft] = useState<Record<string, string[]> | null>(null);

  /**
   * Resolve the column from the owner's uid where we have one, so a stale
   * ownerLabel cannot split one person into two columns. The label is only a
   * fallback for organization rocks and for people who have not signed in yet.
   */
  const labelFor = useMemo(() => {
    const names = new Map(members.map((m) => [m.uid, m.name]));
    return (r: Rock) => (r.ownerUid && names.get(r.ownerUid)) || r.ownerLabel || ORG_COLUMN;
  }, [members]);

  const live = useMemo(() => rocks.filter((r) => r.status !== 'done'), [rocks]);
  const done = useMemo(() => rocks.filter((r) => r.status === 'done'), [rocks]);
  const byId = useMemo(() => new Map(rocks.map((r) => [r.id, r])), [rocks]);

  /**
   * Organization first, then anyone actually carrying a rock. Everyone else who
   * could receive one appears only while a drag is in flight, so the board is
   * not a wall of empty columns the rest of the time.
   */
  const columns = useMemo(() => {
    const names = new Set<string>([ORG_COLUMN]);
    live.forEach((r) => names.add(labelFor(r)));
    if (dragging) {
      members.filter((m) => m.active && m.role !== 'campus').forEach((m) => names.add(m.name));
    }
    return [...names];
  }, [live, members, labelFor, dragging]);

  const grouped = useMemo<Record<string, string[]>>(() => {
    if (draft) return draft;
    const g: Record<string, string[]> = {};
    columns.forEach((c) => { g[c] = []; });
    [...live].sort((a, b) => a.order - b.order).forEach((r) => {
      (g[labelFor(r)] ??= []).push(r.id);
    });
    return g;
  }, [draft, columns, live, labelFor]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const columnOf = (state: Record<string, string[]>, id: string) =>
    Object.keys(state).find((c) => state[c]!.includes(id));

  function onDragStart(e: DragStartEvent) {
    setDragging(byId.get(String(e.active.id)) ?? null);
    setDraft(grouped);
  }

  function onDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over || !draft) return;
    const from = columnOf(draft, String(active.id));
    const overId = String(over.id);
    const to = overId.startsWith('col:') ? overId.slice(4) : columnOf(draft, overId);
    if (!from || !to || from === to) return;
    setDraft((prev) => {
      if (!prev) return prev;
      const next = { ...prev, [from]: [...prev[from]!], [to]: [...(prev[to] ?? [])] };
      next[from] = next[from]!.filter((x) => x !== String(active.id));
      const idx = overId.startsWith('col:') ? next[to]!.length : next[to]!.indexOf(overId);
      next[to]!.splice(idx < 0 ? next[to]!.length : idx, 0, String(active.id));
      return next;
    });
  }

  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    const state = draft;
    setDragging(null);
    if (!state || !over) { setDraft(null); return; }

    let next = state;
    const col = columnOf(state, String(active.id));
    const overId = String(over.id);
    if (col && !overId.startsWith('col:') && state[col]!.includes(overId)) {
      const from = state[col]!.indexOf(String(active.id));
      const to = state[col]!.indexOf(overId);
      if (from !== to) next = { ...state, [col]: arrayMove(state[col]!, from, to) };
    }

    // Persist. Only write what actually changed.
    const writes: Promise<unknown>[] = [];
    Object.entries(next).forEach(([owner, ids]) => {
      ids.forEach((id, i) => {
        const rock = byId.get(id);
        if (!rock) return;
        const ownerChanged = labelFor(rock) !== owner;
        const orderChanged = rock.order !== i + 1;
        if (!ownerChanged && !orderChanged) return;
        const member = members.find((m) => m.name === owner);
        writes.push(updateRock(id, {
          order: i + 1,
          ...(ownerChanged
            ? { ownerUid: owner === ORG_COLUMN ? null : (member?.uid ?? null), ownerLabel: owner }
            : {}),
        }));
      });
    });
    try { await Promise.all(writes); } finally { setDraft(null); }
  }

  return (
    <>
      <div className="mb-3 flex items-center gap-3">
        <p className="flex-1 text-xs text-stone-500">
          {canEdit
            ? 'Drag by the handle to reorder, or across columns to hand a rock to someone else.'
            : 'You can change the status of a rock you own.'}
        </p>
        {canEdit && <Button variant="plain" onClick={onAdd}>Add a rock</Button>}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => { setDragging(null); setDraft(null); }}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {columns.map((owner) => (
            <Column
              key={owner}
              owner={owner}
              rocks={(grouped[owner] ?? []).map((id) => byId.get(id)).filter(Boolean) as Rock[]}
              canDrag={canEdit}
              canEdit={canEdit}
              userUid={userUid}
              onStatus={onStatus}
              onEdit={onEdit}
            />
          ))}
        </div>
        <DragOverlay>
          {dragging && (
            <div className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-medium shadow-lg">
              {dragging.title}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {done.length > 0 && (
        <div className="mt-3">
          <Card title="Done this semester" right={<span className="text-xs text-stone-500">{done.length}</span>}>
            <ul className="divide-y divide-stone-100">
              {done.map((r) => (
                <li key={r.id} className="flex items-start gap-2 px-3 py-2">
                  <div className="flex-1">
                    <span className="text-sm text-stone-500 line-through">{r.title}</span>
                    <span className="ml-2 text-xs text-stone-400">{labelFor(r)}</span>
                    {r.statusNote && <p className="text-xs text-stone-500">{r.statusNote}</p>}
                  </div>
                  {canEdit && <Button variant="ghost" onClick={() => onStatus(r)}>Reopen</Button>}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </>
  );
}
