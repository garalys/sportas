import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Dumbbell, ChevronRight, History } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Sheet } from '../components/ui/Sheet';
import { Field, Input, Textarea } from '../components/ui/Field';
import { EmptyState, Spinner } from '../components/ui/Misc';
import { prettyDate } from '../utils/date';
import { type WorkoutRoutine, type WorkoutSession } from '../types';
import { useI18n } from '../i18n/I18nProvider';

type RoutineWithCount = WorkoutRoutine & { count: number };

export function Workouts() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [routines, setRoutines] = useState<RoutineWithCount[] | null>(null);
  const [history, setHistory] = useState<WorkoutSession[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!user) return;
    const [{ data: r }, { data: ex }, { data: sess }] = await Promise.all([
      supabase
        .from('workout_routines')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase.from('routine_exercises').select('routine_id').eq('user_id', user.id),
      supabase
        .from('workout_sessions')
        .select('*')
        .eq('user_id', user.id)
        .not('routine_id', 'is', null)
        .order('date', { ascending: false })
        .limit(5),
    ]);

    const counts = new Map<string, number>();
    for (const e of (ex as { routine_id: string }[]) ?? []) {
      counts.set(e.routine_id, (counts.get(e.routine_id) ?? 0) + 1);
    }
    setRoutines(
      ((r as WorkoutRoutine[]) ?? []).map((x) => ({ ...x, count: counts.get(x.id) ?? 0 })),
    );
    setHistory((sess as WorkoutSession[]) ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function createRoutine() {
    if (!user || !name.trim()) return;
    setSaving(true);
    await supabase.from('workout_routines').insert({
      user_id: user.id,
      name: name.trim(),
      description: description.trim() || null,
    });
    setName('');
    setDescription('');
    setSaving(false);
    setOpen(false);
    await load();
  }

  return (
    <div>
      <PageHeader
        title={t('workouts.title')}
        subtitle={t('workouts.subtitle')}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus size={18} /> {t('workouts.new')}
          </Button>
        }
      />

      {!routines ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : routines.length === 0 ? (
        <EmptyState
          icon={<Dumbbell size={40} />}
          title={t('workouts.noRoutines')}
          description={t('workouts.noRoutinesDesc')}
          action={<Button onClick={() => setOpen(true)}>{t('workouts.createRoutine')}</Button>}
        />
      ) : (
        <div className="space-y-3">
          {routines.map((r) => (
            <Link key={r.id} to={`/workouts/${r.id}`}>
              <Card className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Dumbbell size={20} />
                  </div>
                  <div>
                    <p className="font-semibold">{r.name}</p>
                    <p className="text-sm text-slate-500">
                      {t(r.count === 1 ? 'workouts.exerciseOne' : 'workouts.exerciseMany', {
                        count: r.count,
                      })}
                    </p>
                  </div>
                </div>
                <ChevronRight className="text-slate-400" size={20} />
              </Card>
            </Link>
          ))}
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-600">
            <History size={16} /> {t('workouts.recentSessions')}
          </h2>
          <div className="space-y-2">
            {history.map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between rounded-xl bg-white px-4 py-3 ring-1 ring-slate-100"
              >
                <span className="text-sm font-medium">{t(`sessionType.${h.type}`)}</span>
                <span className="text-sm text-slate-500">{prettyDate(h.date)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title={t('workouts.newRoutine')}>
        <div className="space-y-4">
          <Field label={t('workouts.name')}>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('workouts.namePlaceholder')}
            />
          </Field>
          <Field label={t('common.description')}>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('workouts.descriptionPlaceholder')}
            />
          </Field>
          <Button fullWidth loading={saving} onClick={createRoutine} disabled={!name.trim()}>
            {t('workouts.createRoutine')}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
