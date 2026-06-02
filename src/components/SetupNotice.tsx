import { Settings2 } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';

/** Shown when Supabase env vars are missing so the app explains itself. */
export function SetupNotice() {
  const { t } = useI18n();
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="rounded-2xl bg-brand-100 p-4 text-brand-600">
        <Settings2 size={32} />
      </div>
      <h1 className="text-xl font-bold">{t('setup.title')}</h1>
      <p className="text-slate-600">{t('setup.intro')}</p>
      <div className="card w-full text-left text-sm">
        <p className="mb-2 font-semibold">1. {t('setup.step1')}</p>
        <p className="mb-2 font-semibold">2. {t('setup.step2')}</p>
        <p className="mb-2 font-semibold">3. {t('setup.step3')}</p>
        <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
{`VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...`}
        </pre>
        <p className="mt-2 font-semibold">4. {t('setup.step4')}</p>
      </div>
    </div>
  );
}
