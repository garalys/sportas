import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CalendarCheck, Timer, Scale, Flame } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import { Spinner } from '../components/ui/Misc';
import { MetricChart, type MetricPoint } from '../components/charts/MetricChart';
import { currentWeekRange, todayKey, prettyDate } from '../utils/date';
import { sum } from '../utils/format';
import {
  SESSION_TYPE_COLORS,
  type Profile,
  type WorkoutSession,
  type BodyMeasurement,
  type CardioSession,
  type FoodEntry,
} from '../types';
import { cn } from '../utils/cn';
import { useI18n } from '../i18n/I18nProvider';

interface ClientData {
  profile: Profile | null;
  gymThisWeek: number;
  cardioMinutes: number;
  latestWeight: number | null;
  caloriesToday: number;
  sessions: WorkoutSession[];
  weights: MetricPoint[];
}

export function ClientProgress() {
  const { clientId } = useParams();
  const { t } = useI18n();
  const [data, setData] = useState<ClientData | null>(null);

  useEffect(() => {
    if (!clientId) return;
    const week = currentWeekRange();
    const today = todayKey();

    (async () => {
      const [prof, gym, cardio, weight, food, sessions, measures] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', clientId).maybeSingle(),
        supabase
          .from('workout_sessions')
          .select('id')
          .eq('user_id', clientId)
          .eq('type', 'gym')
          .gte('date', week.start)
          .lte('date', week.end),
        supabase
          .from('cardio_sessions')
          .select('duration_min')
          .eq('user_id', clientId)
          .gte('date', week.start)
          .lte('date', week.end),
        supabase
          .from('body_measurements')
          .select('weight_kg')
          .eq('user_id', clientId)
          .not('weight_kg', 'is', null)
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from('food_entries').select('calories').eq('user_id', clientId).eq('date', today),
        supabase
          .from('workout_sessions')
          .select('*')
          .eq('user_id', clientId)
          .order('date', { ascending: false })
          .limit(8),
        supabase
          .from('body_measurements')
          .select('date, weight_kg')
          .eq('user_id', clientId)
          .not('weight_kg', 'is', null)
          .order('date', { ascending: true }),
      ]);

      setData({
        profile: prof.data as Profile | null,
        gymThisWeek: gym.data?.length ?? 0,
        cardioMinutes: sum(
          (cardio.data as Pick<CardioSession, 'duration_min'>[] | null)?.map((c) => c.duration_min) ?? [],
        ),
        latestWeight: (weight.data as Pick<BodyMeasurement, 'weight_kg'> | null)?.weight_kg ?? null,
        caloriesToday: sum(
          (food.data as Pick<FoodEntry, 'calories'>[] | null)?.map((f) => f.calories) ?? [],
        ),
        sessions: (sessions.data as WorkoutSession[]) ?? [],
        weights: ((measures.data as Pick<BodyMeasurement, 'date' | 'weight_kg'>[]) ?? []).map(
          (m) => ({ date: m.date, value: Number(m.weight_kg) }),
        ),
      });
    })();
  }, [clientId]);

  if (!data) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={data.profile?.full_name || t('client.title')}
        subtitle={t('client.readOnly')}
        back
      />

      <div className="mb-4 grid grid-cols-2 gap-3">
        <StatCard label={t('client.gymThisWeek')} value={data.gymThisWeek} unit={t('units.sessions')} icon={<CalendarCheck size={18} />} />
        <StatCard label={t('client.cardio')} value={data.cardioMinutes} unit={t('units.min')} icon={<Timer size={18} />} accent="text-emerald-600" />
        <StatCard label={t('client.bodyWeight')} value={data.latestWeight ?? '—'} unit={data.latestWeight ? t('units.kg') : ''} icon={<Scale size={18} />} accent="text-sky-600" />
        <StatCard label={t('client.caloriesToday')} value={Math.round(data.caloriesToday)} unit={t('units.kcal')} icon={<Flame size={18} />} accent="text-amber-600" />
      </div>

      <Card className="mb-4">
        <CardHeader title={t('client.weightTrend')} />
        <MetricChart data={data.weights} unit="kg" />
      </Card>

      <h2 className="mb-2 text-sm font-semibold text-slate-600">{t('client.recentSessions')}</h2>
      {data.sessions.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">{t('client.noSessions')}</p>
      ) : (
        <div className="space-y-2">
          {data.sessions.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-xl bg-white px-4 py-3 ring-1 ring-slate-100"
            >
              <div className="flex items-center gap-2">
                <span className={cn('h-2.5 w-2.5 rounded-full', SESSION_TYPE_COLORS[s.type])} />
                <span className="text-sm font-medium">{t(`sessionType.${s.type}`)}</span>
              </div>
              <span className="text-sm text-slate-500">{prettyDate(s.date)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
