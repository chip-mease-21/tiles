/**
 * Changing a rock status requires saying why. That is enforced in the security
 * rules, so this dialog is not the control, it is the courtesy: it stops the
 * user from discovering the requirement as a permission error.
 */
import { useState } from 'react';
import { MIN_NOTE, ROCK_STATUSES, STATUS_GLYPH, STATUS_LABEL, type Rock, type RockStatus } from '../types/dlt';
import { setRockStatus } from '../lib/org';
import { Button, Modal } from './ui';

export function StatusEditor({ rock, onClose }: { rock: Rock; onClose: () => void }) {
  const [status, setStatus] = useState<RockStatus>(rock.status);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const moved = status !== rock.status;
  const noteOk = note.trim().length >= MIN_NOTE;
  const canSave = moved ? noteOk : note.trim().length > 0;

  async function save() {
    setSaving(true);
    setError('');
    try {
      await setRockStatus(rock.id, status, note.trim());
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  }

  return (
    <Modal
      title={rock.title}
      onClose={onClose}
      footer={
        <>
          <Button variant="brand" onClick={save} disabled={!canSave || saving}>
            {saving ? 'Saving' : 'Save'}
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </>
      }
    >
      <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-stone-500">Where does it stand</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {ROCK_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            aria-pressed={status === s}
            className={`flex min-h-[48px] items-center gap-2 rounded-xl border px-3 text-left text-sm font-medium ${
              status === s ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 bg-white text-stone-800'
            }`}
          >
            <span aria-hidden="true" className="text-xs">{STATUS_GLYPH[s]}</span>
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      <p className="mt-4 mb-1.5 text-[11px] font-bold uppercase tracking-widest text-stone-500">
        {moved ? 'What changed, required' : 'What changed, optional'}
      </p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        placeholder={moved ? 'One line. Why did this move?' : 'Add a note if there is one.'}
        className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {moved && !noteOk && (
        <p className="mt-1.5 text-xs text-stone-500">
          A status cannot move without a note. Over a semester these notes are the record of why things slipped.
        </p>
      )}
      {rock.statusNote && (
        <p className="mt-3 rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-600">
          <span className="font-semibold">Last note: </span>{rock.statusNote}
        </p>
      )}
      {error && <p className="mt-3 text-xs font-medium text-red-700">{error}</p>}
    </Modal>
  );
}
