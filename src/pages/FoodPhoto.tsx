import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Sparkles, Trash2, Plus, Save } from 'lucide-react';
import { supabase, FOOD_PHOTOS_BUCKET } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { analyzeFoodPhoto, fileToBase64 } from '../lib/foodAnalysis';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Field, Select } from '../components/ui/Field';
import { Badge } from '../components/ui/Misc';
import { todayKey } from '../utils/date';
import { MEAL_ORDER, type MealType, type DetectedFood } from '../types';
import { useI18n } from '../i18n/I18nProvider';

export function FoodPhoto() {
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [source, setSource] = useState<'ai' | 'mock' | null>(null);
  const [items, setItems] = useState<DetectedFood[] | null>(null);
  const [photoId, setPhotoId] = useState<string | null>(null);
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [error, setError] = useState<string | null>(null);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setItems(null);
    setSource(null);
    setError(null);
  }

  async function analyze() {
    if (!user || !file) return;
    setAnalyzing(true);
    setError(null);
    try {
      const base64 = await fileToBase64(file);

      // Upload to Supabase Storage (best-effort; failure shouldn't block review)
      let storagePath = '';
      try {
        const ext = file.name.split('.').pop() || 'jpg';
        storagePath = `${user.id}/${crypto.randomUUID()}.${ext}`;
        await supabase.storage.from(FOOD_PHOTOS_BUCKET).upload(storagePath, file, {
          upsert: false,
        });
        const { data: photo } = await supabase
          .from('food_photos')
          .insert({ user_id: user.id, storage_path: storagePath, status: 'analyzing' })
          .select('id')
          .single();
        if (photo?.id) setPhotoId(photo.id);
      } catch {
        // storage not critical for the MVP review flow
      }

      const result = await analyzeFoodPhoto(base64);
      setItems(result.items);
      setSource(result.source);

      if (photoId) {
        await supabase
          .from('food_photos')
          .update({ status: 'analyzed', detected: { items: result.items } })
          .eq('id', photoId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('photo.failed'));
    } finally {
      setAnalyzing(false);
    }
  }

  function updateItem(idx: number, patch: Partial<DetectedFood>) {
    setItems((prev) => prev?.map((it, i) => (i === idx ? { ...it, ...patch } : it)) ?? null);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev?.filter((_, i) => i !== idx) ?? null);
  }

  function addItem() {
    setItems((prev) => [...(prev ?? []), { name: '', quantity: '', calories: 0 }]);
  }

  async function saveAll() {
    if (!user || !items || items.length === 0) return;
    setSaving(true);
    const rows = items
      .filter((it) => it.name.trim())
      .map((it) => ({
        user_id: user.id,
        date: todayKey(),
        meal_type: mealType,
        name: it.name.trim(),
        quantity: it.quantity || null,
        calories: it.calories ?? null,
        protein: it.protein ?? null,
        carbs: it.carbs ?? null,
        fat: it.fat ?? null,
        photo_id: photoId,
      }));
    await supabase.from('food_entries').insert(rows);
    if (photoId) {
      await supabase.from('food_photos').update({ status: 'saved' }).eq('id', photoId);
    }
    setSaving(false);
    navigate('/food');
  }

  return (
    <div>
      <PageHeader title={t('photo.title')} subtitle={t('photo.subtitle')} back />

      {!preview ? (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-white py-14 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <Camera size={28} />
          </div>
          <div>
            <p className="font-semibold">{t('photo.takePhoto')}</p>
            <p className="text-sm text-slate-500">{t('photo.takePhotoDesc')}</p>
          </div>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onPick}
          />
        </label>
      ) : (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-2xl">
            <img src={preview} alt="Food" className="h-56 w-full object-cover" />
            <button
              onClick={() => {
                setPreview(null);
                setFile(null);
                setItems(null);
              }}
              className="absolute right-2 top-2 rounded-full bg-slate-900/60 p-2 text-white"
            >
              <Trash2 size={16} />
            </button>
          </div>

          {!items && (
            <Button fullWidth loading={analyzing} onClick={analyze}>
              <Sparkles size={18} /> {t('photo.analyze')}
            </Button>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          {items && (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-600">{t('photo.detectedFoods')}</h2>
                {source === 'mock' && <Badge color="bg-amber-100 text-amber-700">{t('photo.demoData')}</Badge>}
                {source === 'ai' && <Badge color="bg-emerald-100 text-emerald-700">{t('photo.ai')}</Badge>}
              </div>
              <p className="-mt-2 text-xs text-slate-400">
                {t('photo.reviewNote')}
              </p>

              <Field label={t('photo.meal')}>
                <Select
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value as MealType)}
                >
                  {MEAL_ORDER.map((m) => (
                    <option key={m} value={m}>
                      {t(`mealType.${m}`)}
                    </option>
                  ))}
                </Select>
              </Field>

              <div className="space-y-3">
                {items.map((it, idx) => (
                  <Card key={idx} className="space-y-2 !p-3">
                    <div className="flex gap-2">
                      <input
                        className="input flex-1"
                        value={it.name}
                        placeholder={t('photo.foodNamePlaceholder')}
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
                      value={it.quantity ?? ''}
                      placeholder={t('photo.quantityPlaceholder')}
                      onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                    />
                    <div className="grid grid-cols-4 gap-2">
                      <NumberCell
                        label="kcal"
                        value={it.calories}
                        onChange={(v) => updateItem(idx, { calories: v })}
                      />
                      <NumberCell
                        label="P"
                        value={it.protein}
                        onChange={(v) => updateItem(idx, { protein: v })}
                      />
                      <NumberCell
                        label="C"
                        value={it.carbs}
                        onChange={(v) => updateItem(idx, { carbs: v })}
                      />
                      <NumberCell
                        label="F"
                        value={it.fat}
                        onChange={(v) => updateItem(idx, { fat: v })}
                      />
                    </div>
                  </Card>
                ))}
              </div>

              <Button variant="secondary" fullWidth onClick={addItem}>
                <Plus size={16} /> {t('photo.addItem')}
              </Button>
              <Button fullWidth loading={saving} onClick={saveAll}>
                <Save size={18} /> {t('photo.saveToDiary')}
              </Button>
            </>
          )}
        </div>
      )}
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
      <span className="mb-0.5 block text-center text-[10px] font-medium text-slate-400">
        {label}
      </span>
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
