/** Small shared pieces. Status is always glyph plus label, never colour alone. */
import React from 'react';
import { STATUS_GLYPH, STATUS_LABEL, type RockStatus } from '../types/dlt';

const TONE: Record<RockStatus, string> = {
  'not-started': 'border-stone-300 text-stone-600 bg-stone-50',
  'on-track': 'border-green-600 text-green-700 bg-green-50',
  caution: 'border-amber-500 text-stone-900 bg-amber-50',
  'off-track': 'border-red-600 text-red-700 bg-red-50',
  done: 'border-stone-400 text-stone-500 bg-stone-100',
};

export function StatusChip({ status, onClick }: { status: RockStatus; onClick?: () => void }) {
  const cls = `inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${TONE[status]}`;
  if (!onClick) {
    return (
      <span className={cls}>
        <span aria-hidden="true" className="text-[10px] leading-none">{STATUS_GLYPH[status]}</span>
        {STATUS_LABEL[status]}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${cls} min-h-[36px] hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-blue-500`}
      aria-label={`Status ${STATUS_LABEL[status]}. Change it.`}
    >
      <span aria-hidden="true" className="text-[10px] leading-none">{STATUS_GLYPH[status]}</span>
      {STATUS_LABEL[status]}
    </button>
  );
}

export function Section({
  title, hint, right, children,
}: {
  title: string; hint?: string; right?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <section className="mt-7">
      <div className="mb-2.5 flex items-baseline gap-3">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] text-stone-500">{title}</h2>
        {hint && <span className="text-xs text-stone-500">{hint}</span>}
        <span className="h-px flex-1 bg-stone-200" />
        {right}
      </div>
      {children}
    </section>
  );
}

export function Card({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-stone-200 px-4 py-2.5">
        <h3 className="flex-1 text-sm font-semibold text-stone-900">{title}</h3>
        {right}
      </div>
      {children}
    </div>
  );
}

export function Button({
  children, onClick, variant = 'plain', type = 'button', disabled, className = '',
}: {
  children: React.ReactNode; onClick?: () => void;
  variant?: 'plain' | 'primary' | 'brand' | 'ghost';
  type?: 'button' | 'submit'; disabled?: boolean; className?: string;
}) {
  const base = 'rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-blue-500';
  const tone = {
    plain: 'border border-stone-300 bg-white text-stone-900 hover:border-stone-400',
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    brand: 'bg-[#c0202e] text-white hover:brightness-110',
    ghost: 'text-stone-600 hover:bg-stone-100',
  }[variant];
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${tone} ${className}`}>
      {children}
    </button>
  );
}

/**
 * "Rachel, 2 hours ago". With several editors this line prevents mysteries.
 *
 * Firestore resolves serverTimestamp() on the server, so the local snapshot that
 * fires immediately after a write carries null here. Guard for it, or every
 * write briefly crashes the row that shows it.
 */
export function stampLine(name: string | undefined, at: unknown): string {
  const toDate = (at as { toDate?: () => Date } | null)?.toDate;
  if (typeof toDate !== 'function') return name ? `${name}, saving` : 'saving';
  const secs = Math.max(0, (Date.now() - toDate.call(at).getTime()) / 1000);
  const rel =
    secs < 90 ? 'just now'
    : secs < 5400 ? `${Math.round(secs / 60)} min ago`
    : secs < 172800 ? `${Math.round(secs / 3600)} hours ago`
    : `${Math.round(secs / 86400)} days ago`;
  return name ? `${name}, ${rel}` : rel;
}

export function daysSince(isoDate: string): number | null {
  if (!isoDate) return null;
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return null;
  return Math.round((Date.now() - new Date(y, m - 1, d).getTime()) / 86400000);
}

export function fmtDate(isoDate: string): string {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return '';
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function Modal({
  title, onClose, children, footer,
}: {
  title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center" role="dialog" aria-modal="true">
      <div className="max-h-[92vh] w-full overflow-hidden rounded-t-2xl bg-white shadow-xl sm:max-w-lg sm:rounded-2xl">
        <div className="flex items-center gap-3 bg-[#c0202e] px-4 py-3 text-white">
          <h3 className="flex-1 text-base font-semibold">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-md bg-white/20 px-2.5 py-1 text-xs">Close</button>
        </div>
        <div className="max-h-[64vh] overflow-auto px-4 py-4">{children}</div>
        {footer && <div className="flex gap-2 border-t border-stone-200 px-4 py-3">{footer}</div>}
      </div>
    </div>
  );
}
