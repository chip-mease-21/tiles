/**
 * Roles and Expectations, recreated as the document it came from.
 *
 * Red header bars, one card per role, expectations behind the header, and the
 * rocks and priorities underneath. Drag a card to rank it for the week; the top
 * three are this week's focus and everything below is maintenance.
 *
 * You cannot make twelve things a priority. That constraint is the whole point
 * of the ranking, so the focus band is fixed at three.
 */
import { useMemo, useState } from 'react';
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCenter,
  useSensor, useSensors, type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ITEM_SOFT_CAP, QUIET_AFTER, daysQuiet, isQuiet, type Role, type RoleItem } from '../types/me';
import { setRoleOrder } from '../lib/me';
import { StatusChip, fmtDate, daysSince } from '../dlt/ui';

function Item({ item, onClick }: { item: RoleItem; onClick: () => void }) {
  const late = item.due ? (daysSince(item.due) ?? -1) > 0 : false;
  const soon = item.due ? !late && (daysSince(item.due) ?? -99) > -14 : false;
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg border border-transparent px-2.5 py-2 text-left hover:border-stone-200 hover:bg-stone-50"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="flex-1 text-[13px] font-medium text-stone-900">
          {item.title}
          {item.tileId && (
            <span className="ml-1.5 rounded bg-stone-100 px-1 text-[9px] font-bold uppercase tracking-wider text-stone-500">
              In Tiles
            </span>
          )}
        </span>
        <span className={`rounded border px-1.5 text-[9.5px] font-bold uppercase tracking-wider ${
          item.kind === 'Rock' ? 'border-[#c0202e] text-[#c0202e]' : 'border-stone-300 text-stone-500'
        }`}>
          {item.kind}
        </span>
        <StatusChip status={item.status} />
      </div>
      {item.next && <p className="mt-1 text-xs text-stone-600">{item.next}</p>}
      {item.due && (
        <p className={`mt-1 text-[11px] tabular-nums ${
          late ? 'font-semibold text-red-700' : soon ? 'font-medium text-stone-800' : 'text-stone-400'
        }`}>
          {late ? `Past due ${fmtDate(item.due)}` : `Due ${fmtDate(item.due)}`}
        </p>
      )}
    </button>
  );
}

function RoleCard({
  role, rank, canDrag, onExpectations, onItem, onEditRole,
}: {
  role: Role; rank: number; canDrag: boolean;
  onExpectations: () => void; onItem: (i: RoleItem) => void; onEditRole: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: role.id, disabled: !canDrag });
  const focus = rank <= 3;
  const quiet = isQuiet(role);
  const days = daysQuiet(role);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className={`overflow-hidden rounded-xl border bg-white shadow-sm ${
        focus ? 'border-blue-500 ring-1 ring-blue-500'
          : quiet ? 'border-stone-400 border-dashed' : 'border-stone-200'
      }`}
    >
      <div className="flex items-center gap-2 bg-[#c0202e] px-3 py-2 text-white">
        <span className={`min-w-[22px] rounded px-1.5 text-center text-[11px] font-bold tabular-nums ${
          focus ? 'bg-white text-[#c0202e]' : 'bg-white/20'
        }`}>
          {rank}
        </span>
        {focus && (
          <span className="rounded bg-white px-1.5 text-[9px] font-extrabold uppercase tracking-wider text-[#c0202e]">
            Focus
          </span>
        )}
        <button
          type="button"
          onClick={onExpectations}
          className="flex-1 text-left text-[13.5px] font-semibold leading-tight hover:underline"
        >
          {role.name}
        </button>
        {role.group === 'oversight' && (
          <span className="text-[9px] font-bold uppercase tracking-wider opacity-80">Oversight</span>
        )}
        {canDrag && (
          <button
            type="button" {...attributes} {...listeners}
            aria-label={`Rank ${role.name}`}
            className="cursor-grab touch-none px-1 text-white/70 hover:text-white active:cursor-grabbing"
          >
            ⠿
          </button>
        )}
      </div>

      <div className="p-1.5">
        {role.items.map((it) => <Item key={it.id} item={it} onClick={() => onItem(it)} />)}
        {role.items.length === 0 && (
          <p className="px-2.5 py-3 text-center text-xs text-stone-400">
            Nothing active here. Decide whether that is right.
          </p>
        )}
        {role.items.length > ITEM_SOFT_CAP && (
          <p className="px-2.5 pb-1 pt-1.5 text-[11px] italic text-stone-400">
            {role.items.length} items. This card is for what you are accountable for, not what you are
            doing. The rest probably belongs in Tiles.
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-stone-100 px-2.5 py-1.5">
        <button type="button" onClick={onExpectations} className="text-xs text-stone-500 hover:text-stone-800">
          Expectations
        </button>
        {role.draft && (
          <span className="rounded border border-amber-400 bg-amber-50 px-1.5 text-[9.5px] font-bold uppercase tracking-wider text-stone-700">
            Draft
          </span>
        )}
        <span className="flex-1" />
        {quiet
          ? <span
              title={`Nothing here has moved in over ${QUIET_AFTER[role.group]} days.`}
              className="rounded border border-stone-400 bg-stone-100 px-1.5 text-[9.5px] font-bold uppercase tracking-wider text-stone-700"
            >
              {days === null ? 'Never touched' : `Quiet ${days}d`}
            </span>
          : days !== null && (
              <span className="text-[10.5px] tabular-nums text-stone-400">Moved {days}d ago</span>
            )}
        <button type="button" onClick={onEditRole} className="text-xs text-stone-400 hover:text-stone-700">
          Edit
        </button>
      </div>
    </div>
  );
}

export function RolesCard({
  roles, canDrag, onExpectations, onItem, onEditRole,
}: {
  roles: Role[]; canDrag: boolean;
  onExpectations: (r: Role) => void; onItem: (r: Role, i: RoleItem) => void; onEditRole: (r: Role) => void;
}) {
  const [dragging, setDragging] = useState<Role | null>(null);
  const [draft, setDraft] = useState<string[] | null>(null);

  const byId = useMemo(() => new Map(roles.map((r) => [r.id, r])), [roles]);
  const order = useMemo(
    () => draft ?? [...roles].sort((a, b) => a.order - b.order).map((r) => r.id),
    [draft, roles],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragStart(e: DragStartEvent) {
    setDragging(byId.get(String(e.active.id)) ?? null);
    setDraft(order);
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
    try { await setRoleOrder(next); } finally { setDraft(null); }
  }

  const focusNames = order.slice(0, 3).map((id) => byId.get(id)?.name).filter(Boolean);
  /**
   * The coverage signal. This is the thing a task list cannot give you: an area
   * generates no tasks precisely when nobody is thinking about it, so silence is
   * invisible in Tiles and obvious here.
   */
  const quietNames = roles.filter(isQuiet).map((r) => r.name);

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
        <span>
          Focus this week: <span className="font-semibold text-stone-700">{focusNames.join(' · ') || 'not ranked'}</span>
        </span>
        {quietNames.length > 0 && (
          <span className="rounded-lg border border-stone-300 bg-white px-2 py-1">
            <span className="font-semibold text-stone-800">{quietNames.length} gone quiet:</span>{' '}
            {quietNames.join(', ')}
          </span>
        )}
        {canDrag && <span className="text-stone-400">Drag a card by the handle to rank it.</span>}
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => { setDragging(null); setDraft(null); }}
      >
        <SortableContext items={order} strategy={rectSortingStrategy}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {order.map((id, i) => {
              const role = byId.get(id);
              if (!role) return null;
              return (
                <RoleCard
                  key={id}
                  role={role}
                  rank={i + 1}
                  canDrag={canDrag}
                  onExpectations={() => onExpectations(role)}
                  onItem={(it) => onItem(role, it)}
                  onEditRole={() => onEditRole(role)}
                />
              );
            })}
          </div>
        </SortableContext>
        <DragOverlay>
          {dragging && (
            <div className="rounded-xl bg-[#c0202e] px-3 py-2 text-sm font-semibold text-white shadow-lg">
              {dragging.name}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </>
  );
}
