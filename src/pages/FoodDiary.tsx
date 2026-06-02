import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Camera, Trash2, Pencil, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Sheet } from '../components/ui/Sheet';
import { Field, Input, Select } from '../components/ui/Field';
import { Spinner } from '../components/ui/Misc';
import { toDateKey, fromDateKey, prettyDate } from '../utils/date';
import { sum } from '../utils/format';
import { MEAL_ORDER, type MealType, type FoodEntry, type FoodRecipe } from '../types';
import { useI18n } from '../i18n/I18nProvider';

const emptyForm = () => ({
  meal_type: 'breakfast' as MealType,
  name: '',
  quantity: '',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
});

export function FoodDiary() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [date, setDate] = useState(toDateKey());
  const [items, setItems] = useState<FoodEntry[] | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FoodEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm());

  // recipes ("from recipe" quick-add)
  const [recipes, setRecipes] = useState<FoodRecipe[]>([]);
  const [recipeOpen, setRecipeOpen] = useState(false);
  const [recipeMeal, setRecipeMeal] = useState<MealType>('lunch');
  const [insertingId, setInsertingId] = useState<string | null>(null);

  async function load() {
    if (!user) return;
    setItems(null);
    const { data } = await supabase
      .from('food_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', date)
      .order('created_at', { ascending: true });
    setItems((data as FoodEntry[]) ?? []);
  }

  async function loadRecipes() {
    if (!user) return;
    const { data } = await supabase
      .from('food_recipes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setRecipes((data as FoodRecipe[]) ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, date]);

  useEffect(() => {
    loadRecipes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  }

  function openEdit(f: FoodEntry) {
    setEditing(f);
    setForm({
      meal_type: f.meal_type,
      name: f.name,
      quantity: f.quantity ?? '',
      calories: f.calories?.toString() ?? '',
      protein: f.protein?.toString() ?? '',
      carbs: f.carbs?.toString() ?? '',
      fat: f.fat?.toString() ?? '',
    });
    setOpen(true);
  }

  async function save() {
    if (!user || !form.name.trim()) return;
    setSaving(true);
    const payload = {
      meal_type: form.meal_type,
      name: form.name.trim(),
      quantity: form.quantity.trim() || null,
      calories: form.calories ? Number(form.calories) : null,
      protein: form.protein ? Number(form.protein) : null,
      carbs: form.carbs ? Number(form.carbs) : null,
      fat: form.fat ? Number(form.fat) : null,
    };
    if (editing) {
      await supabase.from('food_entries').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('food_entries').insert({ ...payload, user_id: user.id, date });
    }
    setForm(emptyForm());
    setSaving(false);
    setOpen(false);
    await load();
  }

  async function remove(id: string) {
    await supabase.from('food_entries').delete().eq('id', id);
    await load();
  }

  async function insertRecipe(r: FoodRecipe) {
    if (!user || !r.items?.length) return;
    setInsertingId(r.id);
    const rows = r.items
      .filter((it) => it.name?.trim())
      .map((it) => ({
        user_id: user.id,
        date,
        meal_type: recipeMeal,
        name: it.name.trim(),
        quantity: it.quantity ?? null,
        calories: it.calories ?? null,
        protein: it.protein ?? null,
        carbs: it.carbs ?? null,
        fat: it.fat ?? null,
      }));
    await supabase.from('food_entries').insert(rows);
    setInsertingId(null);
    setRecipeOpen(false);
    await load();
  }

  const list = items ?? [];
  const totals = {
    calories: sum(list.map((f) => f.calories)),
    protein: sum(list.map((f) => f.protein)),
    carbs: sum(list.map((f) => f.carbs)),
    fat: sum(list.map((f) => f.fat)),
  };

  function shiftDay(delta: number) {
    setDate(toDateKey(addDays(fromDateKey(date), delta)));
  }

  return (
    <div>
      <PageHeader
        title={t('food.title')}
        action={
          <Link to="/food/photo" className="btn-secondary">
            <Camera size={18} /> {t('food.scan')}
          </Link>
        }
      />

      <div className="mb-4 flex items-center justify-between rounded-xl bg-white px-2 py-2 ring-1 ring-slate-100">
        <button className="rounded-lg p-1.5 hover:bg-slate-100" onClick={() => shiftDay(-1)}>
          <ChevronLeft size={20} />
        </button>
        <span className="text-sm font-semibold">{prettyDate(date)}</span>
        <button
          className="rounded-lg p-1.5 hover:bg-slate-100 disabled:opacity-30"
          onClick={() => shiftDay(1)}
          disabled={date >= toDateKey()}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <Card className="mb-4 bg-gradient-to-br from-brand-600 to-brand-700 text-white">
        <p className="text-xs font-medium uppercase tracking-wide text-brand-100">
          {t('food.totalToday')}
        </p>
        <p className="mt-1 text-3xl font-bold">{Math.round(totals.calories)} {t('units.kcal')}</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Macro label={t('food.protein')} value={totals.protein} />
          <Macro label={t('food.carbs')} value={totals.carbs} />
          <Macro label={t('food.fat')} value={totals.fat} />
        </div>
      </Card>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <Button fullWidth onClick={openAdd}>
          <Plus size={18} /> {t('food.addFood')}
        </Button>
        <Button variant="secondary" fullWidth onClick={() => setRecipeOpen(true)}>
          <BookOpen size={18} /> {t('food.fromRecipe')}
        </Button>
      </div>

      {!items ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-4">
          {MEAL_ORDER.map((meal) => {
            const meals = list.filter((f) => f.meal_type === meal);
            if (meals.length === 0) return null;
            const mealCals = sum(meals.map((f) => f.calories));
            return (
              <div key={meal}>
                <div className="mb-1.5 flex items-center justify-between px-1">
                  <h3 className="text-sm font-semibold text-slate-600">
                    {t(`mealType.${meal}`)}
                  </h3>
                  <span className="text-xs text-slate-400">{Math.round(mealCals)} {t('units.kcal')}</span>
                </div>
                <div className="space-y-2">
                  {meals.map((f) => (
                    <Card key={f.id} className="flex items-center justify-between !p-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{f.name}</p>
                        <p className="text-xs text-slate-500">
                          {f.quantity ? `${f.quantity} · ` : ''}
                          {f.calories ? `${Math.round(f.calories)} ${t('units.kcal')}` : ''}
                          {f.protein ? ` · P${f.protein}` : ''}
                          {f.carbs ? ` C${f.carbs}` : ''}
                          {f.fat ? ` F${f.fat}` : ''}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          onClick={() => openEdit(f)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => remove(f.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
          {list.length === 0 && (
            <p className="py-8 text-center text-slate-400">{t('food.noFood')}</p>
          )}
        </div>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title={editing ? t('food.editFood') : t('food.addFood')}>
        <div className="space-y-4">
          <Field label={t('food.meal')}>
            <Select
              value={form.meal_type}
              onChange={(e) => setForm({ ...form, meal_type: e.target.value as MealType })}
            >
              {MEAL_ORDER.map((m) => (
                <option key={m} value={m}>
                  {t(`mealType.${m}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('food.foodName')}>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t('food.foodNamePlaceholder')}
            />
          </Field>
          <Field label={t('food.quantity')}>
            <Input
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              placeholder={t('food.quantityPlaceholder')}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('food.calories')}>
              <Input
                type="number"
                inputMode="numeric"
                value={form.calories}
                onChange={(e) => setForm({ ...form, calories: e.target.value })}
              />
            </Field>
            <Field label={t('food.proteinG')}>
              <Input
                type="number"
                inputMode="decimal"
                value={form.protein}
                onChange={(e) => setForm({ ...form, protein: e.target.value })}
              />
            </Field>
            <Field label={t('food.carbsG')}>
              <Input
                type="number"
                inputMode="decimal"
                value={form.carbs}
                onChange={(e) => setForm({ ...form, carbs: e.target.value })}
              />
            </Field>
            <Field label={t('food.fatG')}>
              <Input
                type="number"
                inputMode="decimal"
                value={form.fat}
                onChange={(e) => setForm({ ...form, fat: e.target.value })}
              />
            </Field>
          </div>
          <Button fullWidth loading={saving} onClick={save} disabled={!form.name.trim()}>
            {editing ? t('common.saveChanges') : t('food.addToDiary')}
          </Button>
        </div>
      </Sheet>

      <Sheet open={recipeOpen} onClose={() => setRecipeOpen(false)} title={t('food.fromRecipe')}>
        <div className="space-y-4">
          <Field label={t('food.meal')}>
            <Select
              value={recipeMeal}
              onChange={(e) => setRecipeMeal(e.target.value as MealType)}
            >
              {MEAL_ORDER.map((m) => (
                <option key={m} value={m}>
                  {t(`mealType.${m}`)}
                </option>
              ))}
            </Select>
          </Field>

          {recipes.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">{t('food.noRecipesYet')}</p>
          ) : (
            <>
              <p className="text-xs text-slate-400">{t('food.chooseRecipe')}</p>
              <div className="space-y-2">
                {recipes.map((r) => {
                  const kcal = Math.round(sum(r.items?.map((i) => i.calories) ?? []));
                  const count = r.items?.length ?? 0;
                  return (
                    <button
                      key={r.id}
                      onClick={() => insertRecipe(r)}
                      disabled={insertingId !== null}
                      className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-left hover:bg-slate-100 disabled:opacity-50"
                    >
                      <div>
                        <p className="font-medium">{r.name}</p>
                        <p className="text-xs text-slate-500">
                          {t(count === 1 ? 'recipe.itemsOne' : 'recipe.itemsMany', { count, kcal })}
                        </p>
                      </div>
                      <Plus size={18} className="text-brand-600" />
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <Link to="/food/recipes" className="btn-secondary w-full">
            <BookOpen size={18} /> {t('food.manageRecipes')}
          </Link>
        </div>
      </Sheet>
    </div>
  );
}

function Macro({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white/10 py-2">
      <p className="text-xs text-brand-100">{label}</p>
      <p className="font-semibold">{Math.round(value)} g</p>
    </div>
  );
}
