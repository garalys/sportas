import { useEffect, useMemo, useState } from 'react';
import { Plus, Ruler, Trash2, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { startOfWeek, parseISO } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Sheet } from '../components/ui/Sheet';
import { Field, Input } from '../components/ui/Field';
import { EmptyState, Spinner } from '../components/ui/Misc';
import { MetricChart, type MetricPoint } from '../components/charts/MetricChart';
import { cn } from '../utils/cn';
import { prettyDateShort, todayKey, toDateKey } from '../utils/date';
import { useI18n } from '../i18n/I18nProvider';
import type { BodyMeasurement } from '../types';

type MetricKey = 'weight_kg' | 'waist_cm' | 'chest_cm' | 'arm_cm' | 'shoulders_cm' | 'hips_cm';

const METRICS: { key: MetricKey; labelKey: string; unit: string; color: string }[] = [
  { key: 'weight_kg', labelKey: 'meas.weight', unit: 'kg', color: '#4f46e5' },
  { key: 'waist_cm', labelKey: 'meas.waist', unit: 'cm', color: '#0ea5e9' },
  { key: 'chest_cm', labelKey: 'meas.chest', unit: 'cm', color: '#10b981' },
  { key: 'arm_cm', labelKey: 'meas.arm', unit: 'cm', color: '#f59e0b' },
  { key: 'shoulders_cm', labelKey: 'meas.shoulders', unit: 'cm', color: '#ec4899' },
  { key: 'hips_cm', labelKey: 'meas.hips', unit: 'cm', color: '#8b5cf6' },
];

const FORM_FIELDS: { key: keyof BodyMeasurement; labelKey: string; unit: string }[] = [
  { key: 'weight_kg', labelKey: 'meas.weight', unit: 'kg' },
  { key: 'height_cm', labelKey: 'meas.height', unit: 'cm' },
  { key: 'waist_cm', labelKey: 'meas.waist', unit: 'cm' },
  { key: 'shoulders_cm', labelKey: 'meas.shoulders', unit: 'cm' },
  { key: 'chest_cm', labelKey: 'meas.chest', unit: 'cm' },
  { key: 'arm_cm', labelKey: 'meas.arm', unit: 'cm' },
  { key: 'wrist_cm', labelKey: 'meas.wrist', unit: 'cm' },
  { key: 'hips_cm', labelKey: 'meas.hips', unit: 'cm' },
];

const emptyForm = (): Record<string, string> => ({ date: todayKey() });

export function Measurements() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [items, setItems] = useState<BodyMeasurement[] | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [metric, setMetric] = useState<MetricKey>('weight_kg');
  const [period, setPeriod] = useState<'daily' | 'weekly'>('daily');
  const [form, setForm] = useState<Record<string, string>>(emptyForm());

  async function load() {
    if (!user) return;
    const { data } = await supabase
      .from('body_measurements')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: true });
    setItems((data as BodyMeasurement[]) ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function save() {
    if (!user) return;
    setSaving(true);
    const payload: Partial<BodyMeasurement> = {
      user_id: user.id,
      date: form.date || todayKey(),
    };
    for (const f of FORM_FIELDS) {
      const v = form[f.key as string];
      (payload as Record<string, unknown>)[f.key as string] = v ? Number(v) : null;
    }
    await supabase.from('body_measurements').insert(payload);
    setForm(emptyForm());
    setSaving(false);
    setOpen(false);
    await load();
  }

  async function remove(id: string) {
    await supabase.from('body_measurements').delete().eq('id', id);
    await load();
  }

  const dailyData: MetricPoint[] = useMemo(() => {
    return (items ?? [])
      .filter((m) => m[metric] != null)
      .map((m) => ({ date: m.date, value: Number(m[metric]) }));
  }, [items, metric]);

  // Weekly view: average each ISO week (Mon-based), keyed by the week's start.
  const chartData: MetricPoint[] = useMemo(() => {
    if (period === 'daily') return dailyData;
    const weeks = new Map<string, number[]>();
    for (const p of dailyData) {
      const wk = toDateKey(startOfWeek(parseISO(p.date), { weekStartsOn: 1 }));
      const arr = weeks.get(wk) ?? [];
      arr.push(p.value);
      weeks.set(wk, arr);
    }
    return [...weeks.entries()]
      .map(([date, vals]) => ({
        date,
        value: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [dailyData, period]);

  // Net change across the visible range (last − first).
  const trend = useMemo(() => {
    if (chartData.length < 2) return null;
    const delta = chartData[chartData.length - 1].value - chartData[0].value;
    return Math.round(delta * 10) / 10;
  }, [chartData]);

  const activeMetric = METRICS.find((m) => m.key === metric)!;
  const latest = items && items.length ? items[items.length - 1] : null;

  return (
    <div>
      <PageHeader
        title={t('meas.title')}
        back
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus size={18} /> {t('common.add')}
          </Button>
        }
      />

      {!items ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Ruler size={40} />}
          title={t('meas.noMeasurements')}
          description={t('meas.noMeasurementsDesc')}
          action={<Button onClick={() => setOpen(true)}>{t('meas.addMeasurement')}</Button>}
        />
      ) : (
        <div className="space-y-5">
          <Card>
            <CardHeader
              title={t('meas.progress')}
              subtitle={t('meas.overTime', { metric: t(activeMetric.labelKey) })}
            />
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex rounded-xl bg-slate-100 p-0.5">
                {(['daily', 'weekly'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={cn(
                      'rounded-lg px-3 py-1 text-xs font-medium transition',
                      period === p ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500',
                    )}
                  >
                    {t(p === 'daily' ? 'meas.daily' : 'meas.weekly')}
                  </button>
                ))}
              </div>
              <TrendBadge trend={trend} unit={activeMetric.unit} noChangeLabel={t('meas.noChange')} />
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              {METRICS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setMetric(m.key)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium transition',
                    metric === m.key
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                  )}
                >
                  {t(m.labelKey)}
                </button>
              ))}
            </div>
            <MetricChart
              data={chartData}
              color={activeMetric.color}
              unit={activeMetric.unit}
              emptyLabel={t('chart.noData')}
            />
          </Card>

          {latest && (
            <Card>
              <CardHeader title={t('meas.latest')} subtitle={prettyDateShort(latest.date)} />
              <div className="grid grid-cols-3 gap-3 text-center">
                {METRICS.map((m) => (
                  <div key={m.key} className="rounded-xl bg-slate-50 py-2">
                    <p className="text-xs text-slate-500">{t(m.labelKey)}</p>
                    <p className="font-semibold">
                      {latest[m.key] != null ? `${latest[m.key]}` : '—'}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <div>
            <h2 className="mb-2 text-sm font-semibold text-slate-600">{t('meas.history')}</h2>
            <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-slate-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                    <th className="p-3">{t('common.date')}</th>
                    <th className="p-3">{t('meas.weight')}</th>
                    <th className="p-3">{t('meas.waist')}</th>
                    <th className="p-3">{t('meas.chest')}</th>
                    <th className="p-3">{t('meas.arm')}</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {[...items].reverse().map((m) => (
                    <tr key={m.id} className="border-b border-slate-50 last:border-0">
                      <td className="p-3 font-medium">{prettyDateShort(m.date)}</td>
                      <td className="p-3">{m.weight_kg ?? '—'}</td>
                      <td className="p-3">{m.waist_cm ?? '—'}</td>
                      <td className="p-3">{m.chest_cm ?? '—'}</td>
                      <td className="p-3">{m.arm_cm ?? '—'}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => remove(m.id)}
                          className="text-slate-300 hover:text-red-600"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title={t('meas.addMeasurement')}>
        <div className="space-y-4">
          <Field label={t('common.date')}>
            <Input
              type="date"
              value={form.date ?? ''}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            {FORM_FIELDS.map((f) => (
              <Field key={f.key as string} label={`${t(f.labelKey)} (${f.unit})`}>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={form[f.key as string] ?? ''}
                  onChange={(e) => setForm({ ...form, [f.key as string]: e.target.value })}
                />
              </Field>
            ))}
          </div>
          <Button fullWidth loading={saving} onClick={save}>
            {t('meas.save')}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

function TrendBadge({
  trend,
  unit,
  noChangeLabel,
}: {
  trend: number | null;
  unit: string;
  noChangeLabel: string;
}) {
  if (trend === null) return null;
  if (trend === 0)
    return (
      <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
        <Minus size={13} /> {noChangeLabel}
      </span>
    );
  const down = trend < 0;
  return (
    <span
      className={cn(
        'flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
        down ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600',
      )}
    >
      {down ? <TrendingDown size={13} /> : <TrendingUp size={13} />}
      {trend > 0 ? '+' : ''}
      {trend} {unit}
    </span>
  );
}
