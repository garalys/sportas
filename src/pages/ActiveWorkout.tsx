import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Check, Trash2, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Field';
import { Spinner } from '../components/ui/Misc';
import { useI18n } from '../i18n/I18nProvider';
import type { RoutineExercise, WorkoutSession, WorkoutSet } from '../types';

export function ActiveWorkout() {
  const { sessionId } = useParams();
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [exercises, setExercises] = useState<RoutineExercise[]>([]);
  const [currentSets, setCurrentSets] = useState<WorkoutSet[]>([]);
  const [prevSets, setPrevSets] = useState<WorkoutSet[]>([]);
  const [loading, setLoading] = useState(true);
  // per-exercise input state keyed by exercise name
  const [inputs, setInputs] = useState<Record<string, { reps: string; weight: string }>>({});

  async function load() {
    if (!user || !sessionId) return;
    const { data: s } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();
    const sess = s as WorkoutSession | null;
    setSession(sess);

    const { data: ex } = sess?.routine_id
      ? await supabase
          .from('routine_exercises')
          .select('*')
          .eq('routine_id', sess.routine_id)
          .order('order_index', { ascending: true })
      : { data: [] };
    const exList = (ex as RoutineExercise[]) ?? [];
    setExercises(exList);

    const { data: cur } = await supabase
      .from('workout_sets')
      .select('*')
      .eq('session_id', sessionId)
      .order('set_number', { ascending: true });
    setCurrentSets((cur as WorkoutSet[]) ?? []);

    const names = exList.map((e) => e.name);
    if (names.length) {
      const { data: prev } = await supabase
        .from('workout_sets')
        .select('*')
        .eq('user_id', user.id)
        .in('exercise_name', names)
        .neq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(100);
      setPrevSets((prev as WorkoutSet[]) ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, sessionId]);

  function setsFor(name: string) {
    return currentSets.filter((s) => s.exercise_name === name);
  }

  function previousFor(name: string): string | null {
    const sets = prevSets.filter((s) => s.exercise_name === name);
    if (!sets.length) return null;
    // group by the most recent session_id
    const lastSessionId = sets[0].session_id;
    const lastSets = sets.filter((s) => s.session_id === lastSessionId);
    const top = lastSets.reduce((a, b) => ((b.weight ?? 0) > (a.weight ?? 0) ? b : a));
    return t('active.prevLine', {
      sets: lastSets.length,
      reps: top.reps ?? '—',
      weight: top.weight ?? '—',
    });
  }

  async function addSet(ex: RoutineExercise) {
    if (!user || !sessionId) return;
    const input = inputs[ex.name] ?? { reps: '', weight: '' };
    const setNumber = setsFor(ex.name).length + 1;
    await supabase.from('workout_sets').insert({
      session_id: sessionId,
      user_id: user.id,
      exercise_name: ex.name,
      set_number: setNumber,
      reps: input.reps ? Number(input.reps) : ex.target_reps,
      weight: input.weight ? Number(input.weight) : ex.target_weight,
    });
    setInputs((p) => ({ ...p, [ex.name]: { reps: '', weight: '' } }));
    await load();
  }

  async function removeSet(id: string) {
    await supabase.from('workout_sets').delete().eq('id', id);
    await load();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={t('active.title')}
        subtitle={t('active.setsLogged', { count: currentSets.length })}
        back
        action={
          <Button onClick={() => navigate('/workouts')}>
            <Check size={18} /> {t('common.finish')}
          </Button>
        }
      />

      <div className="space-y-4">
        {exercises.map((ex) => {
          const sets = setsFor(ex.name);
          const prev = previousFor(ex.name);
          const input = inputs[ex.name] ?? { reps: '', weight: '' };
          return (
            <Card key={ex.id}>
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <p className="font-semibold">{ex.name}</p>
                  <p className="text-xs text-slate-500">
                    {t('active.target')}:{' '}
                    {t('active.targetLine', {
                      sets: ex.target_sets ?? '—',
                      reps: ex.target_reps ?? '—',
                    })}
                    {ex.target_weight ? t('routine.weightSuffix', { weight: ex.target_weight }) : ''}
                  </p>
                </div>
                {prev && (
                  <span className="flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1 text-xs text-slate-500">
                    <TrendingUp size={12} /> {prev}
                  </span>
                )}
              </div>

              {sets.length > 0 && (
                <div className="mb-2 space-y-1">
                  {sets.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-sm"
                    >
                      <span className="font-medium text-slate-600">
                        {t('active.set')} {s.set_number}
                      </span>
                      <span>
                        {t('active.setEntry', { reps: s.reps ?? '—', weight: s.weight ?? '—' })}
                      </span>
                      <button
                        onClick={() => removeSet(s.id)}
                        className="text-slate-400 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <span className="label">{t('active.reps')}</span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder={ex.target_reps?.toString() ?? '0'}
                    value={input.reps}
                    onChange={(e) =>
                      setInputs((p) => ({
                        ...p,
                        [ex.name]: { ...input, reps: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="flex-1">
                  <span className="label">{t('active.weightKg')}</span>
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder={ex.target_weight?.toString() ?? '0'}
                    value={input.weight}
                    onChange={(e) =>
                      setInputs((p) => ({
                        ...p,
                        [ex.name]: { ...input, weight: e.target.value },
                      }))
                    }
                  />
                </div>
                <Button variant="secondary" onClick={() => addSet(ex)} className="mb-0.5">
                  <Plus size={18} />
                </Button>
              </div>
            </Card>
          );
        })}

        {session && exercises.length === 0 && (
          <p className="py-8 text-center text-slate-500">
            {t('active.noRoutineExercises')}
          </p>
        )}
      </div>
    </div>
  );
}
