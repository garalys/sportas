import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Dumbbell, Check, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Field, Input, Select } from '../components/ui/Field';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { useI18n } from '../i18n/I18nProvider';
import { cn } from '../utils/cn';
import type { UserRole } from '../types';

const PASSWORD_RULES: { key: string; labelKey: string; test: (pw: string) => boolean }[] = [
  { key: 'length', labelKey: 'auth.register.pwLength', test: (pw) => pw.length >= 8 },
  { key: 'upper', labelKey: 'auth.register.pwUpper', test: (pw) => /[A-Z]/.test(pw) },
  { key: 'lower', labelKey: 'auth.register.pwLower', test: (pw) => /[a-z]/.test(pw) },
  { key: 'number', labelKey: 'auth.register.pwNumber', test: (pw) => /[0-9]/.test(pw) },
  { key: 'symbol', labelKey: 'auth.register.pwSymbol', test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

export function Register() {
  const { signUp } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('client');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const checks = PASSWORD_RULES.map((r) => ({ ...r, met: r.test(password) }));
  const passwordValid = checks.every((c) => c.met);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!passwordValid) {
      setError(t('auth.register.pwWeak'));
      return;
    }
    setLoading(true);
    try {
      const { needsConfirmation } = await signUp({ email, password, fullName, role });
      if (needsConfirmation) {
        setInfo(t('auth.register.confirm'));
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.register.failed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
      <div className="mb-6 flex justify-center">
        <LanguageSwitcher />
      </div>
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white">
          <Dumbbell size={28} />
        </div>
        <h1 className="text-2xl font-bold">{t('auth.register.title')}</h1>
        <p className="text-slate-500">{t('auth.register.subtitle')}</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <Field label={t('auth.fullName')}>
          <Input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder={t('auth.register.fullNamePlaceholder')}
          />
        </Field>
        <Field label={t('auth.email')}>
          <Input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </Field>
        <Field label={t('auth.password')}>
          <Input
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('auth.register.passwordHint')}
          />
        </Field>

        <ul className="-mt-1 space-y-1.5">
          {checks.map((c) => (
            <li
              key={c.key}
              className={cn(
                'flex items-center gap-2 text-sm transition-colors',
                c.met ? 'text-emerald-600' : 'text-slate-400',
              )}
            >
              <span
                className={cn(
                  'flex h-4 w-4 items-center justify-center rounded-full',
                  c.met ? 'bg-emerald-100' : 'bg-slate-100',
                )}
              >
                {c.met ? <Check size={12} /> : <X size={12} />}
              </span>
              {t(c.labelKey)}
            </li>
          ))}
        </ul>
        <Field label={t('auth.register.iAmA')}>
          <Select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
            <option value="client">{t('auth.register.client')}</option>
            <option value="trainer">{t('auth.register.trainer')}</option>
          </Select>
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {info && <p className="text-sm text-emerald-600">{info}</p>}

        <Button type="submit" fullWidth loading={loading} disabled={!passwordValid}>
          {t('auth.register.create')}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        {t('auth.register.haveAccount')}{' '}
        <Link to="/login" className="font-semibold text-brand-600">
          {t('auth.register.signIn')}
        </Link>
      </p>
    </div>
  );
}
