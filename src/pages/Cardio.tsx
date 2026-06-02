import { useEffect, useState } from 'react';
import { Plus, HeartPulse, Trash2, Timer, Flame } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Sheet } from '../components/ui/Sheet';
import { Field, Input, Select, Textarea } from '../components/ui/Field';
import { EmptyState, Spinner } from '../components/ui/Misc';
import { StatCard } from '../components/ui/StatCard';
import { prettyDate, todayKey, currentWeekRange } from '../utils/date';
import { sum } from '../utils/format';
import { CARDIO_TYPES, type CardioType, type CardioSession } from '../types';
import { useI18n } from '../i18n/I18nProvider';

export function Cardio() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [items, setItems] = useState<CardioSession[] | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    type: 'running' as CardioType,
    duration_min: '',
    calories: '',
    distance_km: '',
    notes: '',
    date: todayKey(),
  });

  async function load() {
    if (!user) return;
    const { data } = await supabase
      .from('cardio_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(50);
    setItems((data as CardioSession[]) ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function save() {
    if (!user || !form.duration_min) return;
    setSaving(true);
    await supabase.from('cardio_sessions').insert({
      user_id: user.id,
      date: form.date,
      type: form.type,
      duration_min: Number(form.duration_min),
      calories: form.calories ? Number(form.calories) : null,
      distance_km: form.distance_km ? Number(form.distance_km) : null,
      notes: form.notes.trim() || null,
    });
    // mark attendance on the calendar too
    await supabase.from('workout_sessions').insert({
      user_id: user.id,
      date: form.date,
      type: 'cardio',
    });
    setForm({
      type: 'running',
      duration_min: '',
      calories: '',
      distance_km: '',
      notes: '',
      date: todayKey(),
    });
    setSaving(false);
    setOpen(false);
    await load();
  }

  async function remove(id: string) {
    await supabase.from('cardio_sessions').delete().eq('id', id);
    await load();
  }

  const week = currentWeekRange();
  const weekItems = (items ?? []).filter((c) => c.date >= week.start && c.date <= week.end);
  const weekMinutes = sum(weekItems.map((c) => c.duration_min));
  const weekCalories = sum(weekItems.map((c) => c.calories));

  return (
    <div>
      <PageHeader
        title={t('cardio.title')}
        back
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus size={18} /> {t('cardio.log')}
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3">
        <StatCard label={t('cardio.thisWeek')} value={weekMinutes} unit={t('units.min')} icon={<Timer size={18} />} accent="text-emerald-600" />
        <StatCard label={t('cardio.calories')} value={Math.round(weekCalories)} unit={t('units.kcal')} icon={<Flame size={18} />} accent="text-amber-600" />
      </div>

      {!items ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<HeartPulse size={40} />}
          title={t('cardio.noCardio')}
          description={t('cardio.noCardioDesc')}
          action={<Button onClick={() => setOpen(true)}>{t('cardio.logCardio')}</Button>}
        />
      ) : (
        <div className="space-y-2">
          {items.map((c) => (
            <Card key={c.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <HeartPulse size={20} />
                </div>
                <div>
                  <p className="font-semibold">{t(`cardioType.${c.type}`)}</p>
                  <p className="text-sm text-slate-500">
                    {c.duration_min} {t('units.min')}
                    {c.distance_km ? ` · ${c.distance_km} ${t('units.km')}` : ''}
                    {c.calories ? ` · ${c.calories} ${t('units.kcal')}` : ''}
                  </p>
                  <p className="text-xs text-slate-400">{prettyDate(c.date)}</p>
                </div>
              </div>
              <button
                onClick={() => remove(c.id)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600"
              >
                <Trash2 size={16} />
              </button>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title={t('cardio.logCardio')}>
        <div className="space-y-4">
          <Field label={t('cardio.type')}>
            <Select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as CardioType })}
            >
              {CARDIO_TYPES.map((k) => (
                <option key={k} value={k}>
                  {t(`cardioType.${k}`)}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('cardio.duration')}>
              <Input
                type="number"
                inputMode="numeric"
                value={form.duration_min}
                onChange={(e) => setForm({ ...form, duration_min: e.target.value })}
              />
            </Field>
            <Field label={t('cardio.calories')}>
              <Input
                type="number"
                inputMode="numeric"
                value={form.calories}
                onChange={(e) => setForm({ ...form, calories: e.target.value })}
              />
            </Field>
            <Field label={t('cardio.distance')}>
              <Input
                type="number"
                inputMode="decimal"
                value={form.distance_km}
                onChange={(e) => setForm({ ...form, distance_km: e.target.value })}
              />
            </Field>
            <Field label={t('common.date')}>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </Field>
          </div>
          <Field label={t('common.notesOptional')}>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          <Button fullWidth loading={saving} onClick={save} disabled={!form.duration_min}>
            {t('cardio.save')}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
