import { useEffect, useState } from 'react';
import { Plus, Trash2, Pencil, BookOpen, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Sheet } from '../components/ui/Sheet';
import { Field, Input } from '../components/ui/Field';
import { EmptyState, Spinner } from '../components/ui/Misc';
import { sum } from '../utils/format';
import { useI18n } from '../i18n/I18nProvider';
import type { FoodRecipe, RecipeItem } from '../types';

type EditItem = {
  name: string;
  quantity: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
};

const blankItem = (): EditItem => ({ name: '', quantity: '' });

export function Recipes() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [recipes, setRecipes] = useState<FoodRecipe[] | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FoodRecipe | null>(null);
  const [name, setName] = useState('');
  const [items, setItems] = useState<EditItem[]>([blankItem()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
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
  }, [user]);

  function openNew() {
    setEditing(null);
    setName('');
    setItems([blankItem()]);
    setError(null);
    setOpen(true);
  }

  function openEdit(r: FoodRecipe) {
    setEditing(r);
    setName(r.name);
    setItems(
      (r.items ?? []).map((it) => ({
        name: it.name,
        quantity: it.quantity ?? '',
        calories: it.calories ?? undefined,
        protein: it.protein ?? undefined,
        carbs: it.carbs ?? undefined,
        fat: it.fat ?? undefined,
      })),
    );
    setError(null);
    setOpen(true);
  }

  function updateItem(idx: number, patch: Partial<EditItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }
  function addItem() {
    setItems((prev) => [...prev, blankItem()]);
  }

  async function save() {
    if (!user || !name.trim()) return;
    const cleaned: RecipeItem[] = items
      .filter((it) => it.name.trim())
      .map((it) => ({
        name: it.name.trim(),
        quantity: it.quantity.trim() || null,
        calories: it.calories ?? null,
        protein: it.protein ?? null,
        carbs: it.carbs ?? null,
        fat: it.fat ?? null,
      }));
    if (cleaned.length === 0) {
      setError(t('recipe.empty'));
      return;
    }
    setSaving(true);
    if (editing) {
      await supabase
        .from('food_recipes')
        .update({ name: name.trim(), items: cleaned })
        .eq('id', editing.id);
    } else {
      await supabase
        .from('food_recipes')
        .insert({ user_id: user.id, name: name.trim(), items: cleaned });
    }
    setSaving(false);
    setOpen(false);
    await load();
  }

  async function remove(id: string) {
    await supabase.from('food_recipes').delete().eq('id', id);
    await load();
  }

  return (
    <div>
      <PageHeader
        title={t('recipe.title')}
        subtitle={t('recipe.subtitle')}
        back
        action={
          <Button onClick={openNew}>
            <Plus size={18} /> {t('recipe.new')}
          </Button>
        }
      />

      {!recipes ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : recipes.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={40} />}
          title={t('recipe.noRecipes')}
          description={t('recipe.noRecipesDesc')}
          action={<Button onClick={openNew}>{t('recipe.create')}</Button>}
        />
      ) : (
        <div className="space-y-3">
          {recipes.map((r) => {
            const kcal = Math.round(sum(r.items?.map((i) => i.calories) ?? []));
            const count = r.items?.length ?? 0;
            return (
              <Card key={r.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <p className="font-semibold">{r.name}</p>
                    <p className="text-sm text-slate-500">
                      {t(count === 1 ? 'recipe.itemsOne' : 'recipe.itemsMany', { count, kcal })}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(r)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => remove(r.id)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title={editing ? t('recipe.edit') : t('recipe.new')}>
        <div className="space-y-4">
          <Field label={t('recipe.name')}>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('recipe.namePlaceholder')}
            />
          </Field>

          <div>
            <span className="label">{t('recipe.items')}</span>
            <div className="space-y-3">
              {items.map((it, idx) => (
                <Card key={idx} className="space-y-2 !p-3">
                  <div className="flex gap-2">
                    <input
                      className="input flex-1"
                      value={it.name}
                      placeholder={t('food.foodNamePlaceholder')}
                      onChange={(e) => updateItem(idx, { name: e.target.value })}
                    />
                    <button
                      onClick={() => removeItem(idx)}
                      className="rounded-lg px-2 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <input
                    className="input"
                    value={it.quantity}
                    placeholder={t('food.quantityPlaceholder')}
                    onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                  />
                  <div className="grid grid-cols-4 gap-2">
                    <NumberCell label="kcal" value={it.calories} onChange={(v) => updateItem(idx, { calories: v })} />
                    <NumberCell label="P" value={it.protein} onChange={(v) => updateItem(idx, { protein: v })} />
                    <NumberCell label="C" value={it.carbs} onChange={(v) => updateItem(idx, { carbs: v })} />
                    <NumberCell label="F" value={it.fat} onChange={(v) => updateItem(idx, { fat: v })} />
                  </div>
                </Card>
              ))}
            </div>
            <Button variant="secondary" fullWidth onClick={addItem} className="mt-3">
              <Plus size={16} /> {t('recipe.addItem')}
            </Button>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button fullWidth loading={saving} onClick={save} disabled={!name.trim()}>
            <Save size={18} /> {editing ? t('common.saveChanges') : t('recipe.save')}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

function NumberCell({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: number;
  onChange: (v: number | undefined) => void;
}) {
  return (
    <label className="block">
      <span className="mb-0.5 block text-center text-[10px] font-medium text-slate-400">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        className="input !px-2 !py-1.5 text-center text-sm"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
      />
    </label>
  );
}
