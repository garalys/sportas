import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, Users, Check, Copy, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Field, Input } from '../components/ui/Field';
import { Badge } from '../components/ui/Misc';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { initials } from '../utils/format';
import { useI18n } from '../i18n/I18nProvider';

export function Settings() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { t } = useI18n();
  const [fullName, setFullName] = useState('');
  const [height, setHeight] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? '');
    setHeight(profile?.height_cm?.toString() ?? '');
  }, [profile]);

  async function save() {
    if (!user) return;
    setSaving(true);
    await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim() || null,
        height_cm: height ? Number(height) : null,
      })
      .eq('id', user.id);
    await refreshProfile();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function copyEmail() {
    if (!user?.email) return;
    navigator.clipboard.writeText(user.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const isTrainer = profile?.role === 'trainer' || profile?.role === 'admin';

  return (
    <div>
      <PageHeader title={t('settings.profile')} />

      <Card className="mb-4 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-xl font-bold text-brand-700">
          {initials(profile?.full_name)}
        </div>
        <div>
          <p className="text-lg font-semibold">{profile?.full_name || t('settings.yourName')}</p>
          <p className="text-sm text-slate-500">{user?.email}</p>
          <div className="mt-1">
            <Badge color="bg-brand-100 text-brand-700">{t(`role.${profile?.role ?? 'client'}`)}</Badge>
          </div>
        </div>
      </Card>

      <Card className="mb-4 space-y-4">
        <Field label={t('settings.fullName')}>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </Field>
        <Field label={t('settings.height')}>
          <Input
            type="number"
            inputMode="decimal"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
          />
        </Field>
        <Button fullWidth onClick={save} loading={saving}>
          {saved ? (
            <>
              <Check size={18} /> {t('common.saved')}
            </>
          ) : (
            t('settings.saveChanges')
          )}
        </Button>
      </Card>

      <Card className="mb-4 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-600">{t('settings.language')}</span>
        <LanguageSwitcher />
      </Card>

      {/* Share email so a trainer can add you */}
      <Card className="mb-4">
        <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-slate-600">
          <Mail size={15} /> {t('settings.connectTrainer')}
        </p>
        <p className="mb-3 text-xs text-slate-500">
          {t('settings.connectTrainerDesc')}
        </p>
        <button
          onClick={copyEmail}
          className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-sm hover:bg-slate-100"
        >
          <span className="truncate font-medium">{user?.email}</span>
          {copied ? (
            <Check size={16} className="text-emerald-600" />
          ) : (
            <Copy size={16} className="text-slate-400" />
          )}
        </button>
      </Card>

      {isTrainer && (
        <Link to="/trainer">
          <Card className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Users size={20} />
            </div>
            <span className="font-semibold">{t('settings.trainerDashboard')}</span>
          </Card>
        </Link>
      )}

      <Button variant="secondary" fullWidth onClick={signOut}>
        <LogOut size={18} /> {t('settings.signOut')}
      </Button>
    </div>
  );
}
