/**
 * Closing an issue always leaves a trace.
 *
 * Either it produced a decision, which writes a decision log entry with a
 * review date ninety days out and links it back to the issue, or it did not, in
 * which case one line on why. There is no third door, in the interface or in
 * the security rules.
 *
 * This is the mechanism that keeps the decision log fed by the meeting instead
 * of by somebody remembering afterwards.
 */
import { useState } from 'react';
import { MIN_NOTE, type Issue } from '../types/dlt';
import { resolveIssueWithDecision, resolveIssueWithoutDecision } from '../lib/org';
import { Button, Modal } from './ui';

type Path = 'decision' | 'no-decision';

export function ResolveIssueDialog({ issue, onClose }: { issue: Issue; onClose: () => void }) {
  const [path, setPath] = useState<Path>('decision');
  const [notes, setNotes] = useState<string[]>(['']);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const filled = notes.filter((n) => n.trim().length > 0);
  const canSave = path === 'decision' ? filled.length > 0 : reason.trim().length >= MIN_NOTE;

  function setNote(i: number, v: string) {
    setNotes((prev) => prev.map((n, idx) => (idx === i ? v : n)));
  }

  async function save() {
    setSaving(true);
    setError('');
    try {
      if (path === 'decision') await resolveIssueWithDecision(issue, filled);
      else await resolveIssueWithoutDecision(issue.id, reason.trim());
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Close this issue"
      onClose={onClose}
      footer={
        <>
          <Button variant="brand" onClick={save} disabled={!canSave || saving}>
            {saving ? 'Saving' : path === 'decision' ? 'Log the decision and close' : 'Close without a decision'}
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </>
      }
    >
      <p className="mb-3 text-sm font-medium text-stone-900">{issue.text}</p>

      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button" onClick={() => setPath('decision')} aria-pressed={path === 'decision'}
          className={`min-h-[52px] rounded-xl border px-3 py-2 text-left text-sm font-medium ${
            path === 'decision' ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 bg-white'
          }`}
        >
          We decided something
        </button>
        <button
          type="button" onClick={() => setPath('no-decision')} aria-pressed={path === 'no-decision'}
          className={`min-h-[52px] rounded-xl border px-3 py-2 text-left text-sm font-medium ${
            path === 'no-decision' ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 bg-white'
          }`}
        >
          Closing without a decision
        </button>
      </div>

      {path === 'decision' ? (
        <>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-stone-500">What did we decide</p>
          {notes.map((n, i) => (
            <input
              key={i} value={n} onChange={(e) => setNote(i, e.target.value)}
              placeholder={i === 0 ? 'One decision per line, with the owner if there is one' : 'Another decision'}
              className="mb-2 w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ))}
          <Button variant="ghost" onClick={() => setNotes((p) => [...p, ''])}>Add another line</Button>
          <p className="mt-3 text-xs text-stone-500">
            This creates a decision log entry dated today, linked to the issue, with a closed loop review set for ninety days out.
          </p>
        </>
      ) : (
        <>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-stone-500">Why is it closing</p>
          <textarea
            value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
            placeholder="Overtaken by events, folded into another issue, no longer relevant."
            className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-2 text-xs text-stone-500">
            An issue that closes with no decision and no reason is the same as one that was never solved. One line is enough.
          </p>
        </>
      )}
      {error && <p className="mt-3 text-xs font-medium text-red-700">{error}</p>}
    </Modal>
  );
}
