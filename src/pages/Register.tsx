import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Dumbbell } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Field, Input, Select } from '../components/ui/Field';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { useI18n } from '../i18n/I18nProvider';
import type { UserRole } from '../types';

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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
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
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('auth.register.passwordHint')}
          />
        </Field>
        <Field label={t('auth.register.iAmA')}>
          <Select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
            <option value="client">{t('auth.register.client')}</option>
            <option value="trainer">{t('auth.register.trainer')}</option>
          </Select>
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {info && <p className="text-sm text-emerald-600">{info}</p>}

        <Button type="submit" fullWidth loading={loading}>
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
