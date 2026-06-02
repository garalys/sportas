import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Dumbbell,
  Flame,
  Scale,
  CalendarCheck,
  Timer,
  Camera,
  Ruler,
  HeartPulse,
  Users,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { StatCard } from '../components/ui/StatCard';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Misc';
import { currentWeekRange, todayKey, prettyDate } from '../utils/date';
import { sum } from '../utils/format';
import { useI18n } from '../i18n/I18nProvider';
import type { WorkoutSession, BodyMeasurement, FoodEntry, CardioSession } from '../types';

interface DashData {
  gymThisWeek: number;
  latestSession: WorkoutSession | null;
  latestWeight: BodyMeasurement | null;
  caloriesToday: number;
  cardioMinutes: number;
}

export function Dashboard() {
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const [data, setData] = useState<DashData | null>(null);

  useEffect(() => {
    if (!user) return;
    const week = currentWeekRange();
    const today = todayKey();

    (async () => {
      const [sessions, latest, weight, food, cardio] = await Promise.all([
        supabase
          .from('workout_sessions')
          .select('id')
          .eq('user_id', user.id)
          .eq('type', 'gym')
          .gte('date', week.start)
          .lte('date', week.end),
        supabase
          .from('workout_sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('body_measurements')
          .select('*')
          .eq('user_id', user.id)
          .not('weight_kg', 'is', null)
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('food_entries')
          .select('calories')
          .eq('user_id', user.id)
          .eq('date', today),
        supabase
          .from('cardio_sessions')
          .select('duration_min')
          .eq('user_id', user.id)
          .gte('date', week.start)
          .lte('date', week.end),
      ]);

      setData({
        gymThisWeek: sessions.data?.length ?? 0,
        latestSession: latest.data as WorkoutSession | null,
        latestWeight: weight.data as BodyMeasurement | null,
        caloriesToday: sum((food.data as Pick<FoodEntry, 'calories'>[] | null)?.map((f) => f.calories) ?? []),
        cardioMinutes: sum(
          (cardio.data as Pick<CardioSession, 'duration_min'>[] | null)?.map((c) => c.duration_min) ?? [],
        ),
      });
    })();
  }, [user]);

  const firstName = (profile?.full_name || 'there').split(' ')[0];

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-slate-500">{t('dash.welcome')}</p>
        <h1 className="text-2xl font-bold">{firstName} 👋</h1>
      </div>

      {!data ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label={t('dash.gymThisWeek')}
              value={data.gymThisWeek}
              unit={t('units.sessions')}
              icon={<CalendarCheck size={18} />}
            />
            <StatCard
              label={t('dash.cardioThisWeek')}
              value={data.cardioMinutes}
              unit={t('units.min')}
              icon={<Timer size={18} />}
              accent="text-emerald-600"
            />
            <StatCard
              label={t('dash.caloriesToday')}
              value={data.caloriesToday ? Math.round(data.caloriesToday) : 0}
              unit={t('units.kcal')}
              icon={<Flame size={18} />}
              accent="text-amber-600"
            />
            <StatCard
              label={t('dash.bodyWeight')}
              value={data.latestWeight?.weight_kg ?? '—'}
              unit={data.latestWeight ? t('units.kg') : ''}
              icon={<Scale size={18} />}
              accent="text-sky-600"
            />
          </div>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {t('dash.latestWorkout')}
                </p>
                {data.latestSession ? (
                  <>
                    <p className="mt-1 text-lg font-semibold">
                      {t(`sessionType.${data.latestSession.type}`)}
                    </p>
                    <p className="text-sm text-slate-500">
                      {prettyDate(data.latestSession.date)}
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-slate-500">{t('dash.noWorkouts')}</p>
                )}
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Dumbbell size={22} />
              </div>
            </div>
          </Card>

          <div>
            <h2 className="mb-2 text-sm font-semibold text-slate-600">{t('dash.quickAdd')}</h2>
            <div className="grid grid-cols-2 gap-3">
              <QuickLink to="/cardio" icon={<HeartPulse size={20} />} label={t('dash.logCardio')} />
              <QuickLink to="/measurements" icon={<Ruler size={20} />} label={t('dash.measurements')} />
              <QuickLink to="/food" icon={<Flame size={20} />} label={t('dash.foodDiary')} />
              <QuickLink to="/food/photo" icon={<Camera size={20} />} label={t('dash.photoScan')} />
            </div>
          </div>

          {(profile?.role === 'trainer' || profile?.role === 'admin') && (
            <Card onClick={() => undefined} className="!p-0">
              <Link to="/trainer" className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Users size={20} />
                  </div>
                  <span className="font-semibold">{t('dash.trainerDashboard')}</span>
                </div>
                <ChevronRight className="text-slate-400" size={20} />
              </Link>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function QuickLink({
  to,
  icon,
  label,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="card flex items-center gap-3 transition hover:shadow-md active:scale-[0.98]"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
        {icon}
      </span>
      <span className="text-sm font-semibold">{label}</span>
    </Link>
  );
}
