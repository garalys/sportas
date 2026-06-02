import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, Pencil, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { PageHeader } from '../components/layout/PageHeader';
import { Sheet } from '../components/ui/Sheet';
import { Button } from '../components/ui/Button';
import { Field, Select, Textarea } from '../components/ui/Field';
import { cn } from '../utils/cn';
import {
  monthGridDays,
  toDateKey,
  isSameDay,
  fromDateKey,
  format,
  startOfMonth,
  endOfMonth,
  prettyDate,
} from '../utils/date';
import {
  SESSION_TYPES,
  SESSION_TYPE_COLORS,
  type SessionType,
  type WorkoutSession,
} from '../types';
import { useI18n } from '../i18n/I18nProvider';

export function Calendar() {
  const { user } = useAuth();
  const { t } = useI18n();
  const weekdays = t('cal.weekdays').split(',');
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [type, setType] = useState<SessionType>('gym');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const days = useMemo(() => monthGridDays(month), [month]);

  async function load() {
    if (!user) return;
    const { data } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', toDateKey(startOfMonth(month)))
      .lte('date', toDateKey(endOfMonth(month)))
      .order('created_at', { ascending: true });
    setSessions((data as WorkoutSession[]) ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, month]);

  const byDay = useMemo(() => {
    const map = new Map<string, WorkoutSession[]>();
    for (const s of sessions) {
      const list = map.get(s.date) ?? [];
      list.push(s);
      map.set(s.date, list);
    }
    return map;
  }, [sessions]);

  const selectedSessions = selected ? byDay.get(selected) ?? [] : [];

  function editSession(s: WorkoutSession) {
    setEditingId(s.id);
    setType(s.type);
    setNotes(s.notes ?? '');
  }

  function resetForm() {
    setEditingId(null);
    setType('gym');
    setNotes('');
  }

  async function saveSession() {
    if (!user || !selected) return;
    setSaving(true);
    if (editingId) {
      await supabase
        .from('workout_sessions')
        .update({ type, notes: notes || null })
        .eq('id', editingId);
    } else {
      await supabase.from('workout_sessions').insert({
        user_id: user.id,
        date: selected,
        type,
        notes: notes || null,
      });
    }
    resetForm();
    setSaving(false);
    await load();
  }

  async function removeSession(id: string) {
    await supabase.from('workout_sessions').delete().eq('id', id);
    await load();
  }

  return (
    <div>
      <PageHeader title={t('cal.title')} subtitle={t('cal.subtitle')} />

      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <button
            className="rounded-full p-1.5 hover:bg-slate-100"
            onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
          >
            <ChevronLeft size={20} />
          </button>
          <span className="font-semibold">{format(month, 'MMMM yyyy')}</span>
          <button
            className="rounded-full p-1.5 hover:bg-slate-100"
            onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-400">
          {weekdays.map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const key = toDateKey(day);
            const inMonth = day.getMonth() === month.getMonth();
            const list = byDay.get(key) ?? [];
            const isToday = isSameDay(day, new Date());
            return (
              <button
                key={key}
                onClick={() => {
                  setSelected(key);
                  setType('gym');
                  setNotes('');
                  setEditingId(null);
                }}
                className={cn(
                  'flex aspect-square flex-col items-center justify-start rounded-xl p-1 text-sm transition',
                  inMonth ? 'text-slate-700 hover:bg-slate-50' : 'text-slate-300',
                  isToday && 'ring-1 ring-brand-300',
                )}
              >
                <span className={cn('mt-0.5', isToday && 'font-bold text-brand-600')}>
                  {day.getDate()}
                </span>
                <span className="mt-1 flex flex-wrap justify-center gap-0.5">
                  {list.slice(0, 4).map((s) => (
                    <span
                      key={s.id}
                      className={cn('h-1.5 w-1.5 rounded-full', SESSION_TYPE_COLORS[s.type])}
                    />
                  ))}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          {SESSION_TYPES.map((k) => (
            <span key={k} className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className={cn('h-2 w-2 rounded-full', SESSION_TYPE_COLORS[k])} />
              {t(`sessionType.${k}`)}
            </span>
          ))}
        </div>
      </div>

      <Sheet
        open={selected !== null}
        onClose={() => {
          setSelected(null);
          resetForm();
        }}
        title={selected ? prettyDate(toDateKey(fromDateKey(selected))) : ''}
      >
        <div className="space-y-4">
          {selectedSessions.length > 0 && (
            <div className="space-y-2">
              {selectedSessions.map((s) => (
                <div
                  key={s.id}
                  className={cn(
                    'flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2',
                    editingId === s.id && 'ring-2 ring-brand-300',
                  )}
                >
                  <button
                    onClick={() => editSession(s)}
                    className="flex flex-1 items-center gap-2 text-left"
                  >
                    <span className={cn('h-2.5 w-2.5 rounded-full', SESSION_TYPE_COLORS[s.type])} />
                    <div>
                      <p className="text-sm font-medium">{t(`sessionType.${s.type}`)}</p>
                      {s.notes && <p className="text-xs text-slate-500">{s.notes}</p>}
                    </div>
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => editSession(s)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-700"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => removeSession(s.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
            <span className="text-sm font-semibold text-slate-600">
              {editingId ? t('cal.editSession') : t('cal.addSession')}
            </span>
            {editingId && (
              <button onClick={resetForm} className="text-xs font-medium text-brand-600">
                {t('cal.newSession')}
              </button>
            )}
          </div>

          <Field label={t('cal.trainingType')}>
            <Select value={type} onChange={(e) => setType(e.target.value as SessionType)}>
              {SESSION_TYPES.map((k) => (
                <option key={k} value={k}>
                  {t(`sessionType.${k}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('common.notesOptional')}>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('cal.howDidItGo')}
            />
          </Field>

          <Button fullWidth loading={saving} onClick={saveSession}>
            {editingId ? (
              <>
                <Check size={18} /> {t('common.saveChanges')}
              </>
            ) : (
              <>
                <Plus size={18} /> {t('cal.addSession')}
              </>
            )}
          </Button>

          {type === 'gym' && (
            <p className="text-center text-xs text-slate-400">
              {t('cal.gymTip')}
            </p>
          )}
        </div>
      </Sheet>
    </div>
  );
}
