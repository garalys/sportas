import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Play, Trash2, Pencil, Dumbbell } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Sheet } from '../components/ui/Sheet';
import { Field, Input, Textarea } from '../components/ui/Field';
import { EmptyState, Spinner } from '../components/ui/Misc';
import { todayKey } from '../utils/date';
import { useI18n } from '../i18n/I18nProvider';
import type { WorkoutRoutine, RoutineExercise } from '../types';

export function RoutineDetail() {
  const { routineId } = useParams();
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [routine, setRoutine] = useState<WorkoutRoutine | null>(null);
  const [exercises, setExercises] = useState<RoutineExercise[] | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RoutineExercise | null>(null);
  const [starting, setStarting] = useState(false);

  const [form, setForm] = useState({
    name: '',
    target_sets: '',
    target_reps: '',
    target_weight: '',
    notes: '',
  });

  async function load() {
    if (!user || !routineId) return;
    const [{ data: r }, { data: ex }] = await Promise.all([
      supabase.from('workout_routines').select('*').eq('id', routineId).maybeSingle(),
      supabase
        .from('routine_exercises')
        .select('*')
        .eq('routine_id', routineId)
        .order('order_index', { ascending: true }),
    ]);
    setRoutine(r as WorkoutRoutine | null);
    setExercises((ex as RoutineExercise[]) ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, routineId]);

  function openNew() {
    setEditing(null);
    setForm({ name: '', target_sets: '', target_reps: '', target_weight: '', notes: '' });
    setOpen(true);
  }

  function openEdit(ex: RoutineExercise) {
    setEditing(ex);
    setForm({
      name: ex.name,
      target_sets: ex.target_sets?.toString() ?? '',
      target_reps: ex.target_reps?.toString() ?? '',
      target_weight: ex.target_weight?.toString() ?? '',
      notes: ex.notes ?? '',
    });
    setOpen(true);
  }

  async function saveExercise() {
    if (!user || !routineId || !form.name.trim()) return;
    const payload = {
      name: form.name.trim(),
      target_sets: form.target_sets ? Number(form.target_sets) : null,
      target_reps: form.target_reps ? Number(form.target_reps) : null,
      target_weight: form.target_weight ? Number(form.target_weight) : null,
      notes: form.notes.trim() || null,
    };
    if (editing) {
      await supabase.from('routine_exercises').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('routine_exercises').insert({
        ...payload,
        routine_id: routineId,
        user_id: user.id,
        order_index: exercises?.length ?? 0,
      });
    }
    setOpen(false);
    await load();
  }

  async function deleteExercise(id: string) {
    await supabase.from('routine_exercises').delete().eq('id', id);
    await load();
  }

  async function startWorkout() {
    if (!user || !routineId) return;
    setStarting(true);
    const { data } = await supabase
      .from('workout_sessions')
      .insert({ user_id: user.id, routine_id: routineId, date: todayKey(), type: 'gym' })
      .select('id')
      .single();
    setStarting(false);
    if (data?.id) navigate(`/workout/${data.id}`);
  }

  if (!routine && exercises === null) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={routine?.name ?? t('routine.title')} subtitle={routine?.description ?? undefined} back />

      <Button
        fullWidth
        onClick={startWorkout}
        loading={starting}
        disabled={(exercises?.length ?? 0) === 0}
        className="mb-4"
      >
        <Play size={18} /> {t('routine.start')}
      </Button>

      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-600">{t('routine.exercises')}</h2>
        <Button variant="secondary" onClick={openNew}>
          <Plus size={16} /> {t('common.add')}
        </Button>
      </div>

      {exercises && exercises.length === 0 ? (
        <EmptyState
          icon={<Dumbbell size={36} />}
          title={t('routine.noExercises')}
          description={t('routine.noExercisesDesc')}
          action={<Button onClick={openNew}>{t('routine.addExercise')}</Button>}
        />
      ) : (
        <div className="space-y-2">
          {exercises?.map((ex) => (
            <Card key={ex.id} className="flex items-start justify-between">
              <div>
                <p className="font-semibold">{ex.name}</p>
                <p className="text-sm text-slate-500">
                  {t('routine.setsRepsLine', {
                    sets: ex.target_sets ?? '—',
                    reps: ex.target_reps ?? '—',
                  })}
                  {ex.target_weight ? t('routine.weightSuffix', { weight: ex.target_weight }) : ''}
                </p>
                {ex.notes && <p className="mt-0.5 text-xs text-slate-400">{ex.notes}</p>}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => openEdit(ex)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => deleteExercise(ex.id)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title={editing ? t('routine.editExercise') : t('routine.addExercise')}>
        <div className="space-y-4">
          <Field label={t('routine.exerciseName')}>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t('routine.exerciseNamePlaceholder')}
            />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label={t('routine.sets')}>
              <Input
                type="number"
                inputMode="numeric"
                value={form.target_sets}
                onChange={(e) => setForm({ ...form, target_sets: e.target.value })}
              />
            </Field>
            <Field label={t('routine.reps')}>
              <Input
                type="number"
                inputMode="numeric"
                value={form.target_reps}
                onChange={(e) => setForm({ ...form, target_reps: e.target.value })}
              />
            </Field>
            <Field label={t('routine.weight')}>
              <Input
                type="number"
                inputMode="decimal"
                value={form.target_weight}
                onChange={(e) => setForm({ ...form, target_weight: e.target.value })}
              />
            </Field>
          </div>
          <Field label={t('common.notesOptional')}>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Field>
          <Button fullWidth onClick={saveExercise} disabled={!form.name.trim()}>
            {editing ? t('routine.saveChanges') : t('routine.addExercise')}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
