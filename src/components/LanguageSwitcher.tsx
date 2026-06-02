import { useI18n } from '../i18n/I18nProvider';
import { LANGUAGES } from '../i18n/translations';
import { cn } from '../utils/cn';

export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang } = useI18n();
  return (
    <div className={cn('inline-flex rounded-lg border border-slate-200 bg-white p-0.5', className)}>
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => setLang(l.code)}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            lang === l.code ? 'bg-brand-600 text-white' : 'text-slate-600 hover:text-slate-900',
          )}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
