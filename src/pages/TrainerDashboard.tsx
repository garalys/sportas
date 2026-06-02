import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Users, ChevronRight, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Sheet } from '../components/ui/Sheet';
import { Field, Input } from '../components/ui/Field';
import { EmptyState, Spinner } from '../components/ui/Misc';
import { initials } from '../utils/format';
import { useI18n } from '../i18n/I18nProvider';
import type { Profile, TrainerClient } from '../types';

export function TrainerDashboard() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [clients, setClients] = useState<Profile[] | null>(null);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!user) return;
    const { data: links } = await supabase
      .from('trainer_clients')
      .select('client_id')
      .eq('trainer_id', user.id);
    const ids = ((links as Pick<TrainerClient, 'client_id'>[]) ?? []).map((l) => l.client_id);
    if (ids.length === 0) {
      setClients([]);
      return;
    }
    const { data: profiles } = await supabase.from('profiles').select('*').in('id', ids);
    setClients((profiles as Profile[]) ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function addClient() {
    if (!email.trim()) return;
    setSaving(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc('add_client_by_email', {
      p_email: email.trim(),
    });
    setSaving(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setEmail('');
    setOpen(false);
    await load();
  }

  return (
    <div>
      <PageHeader
        title={t('trainer.myClients')}
        subtitle={t('trainer.subtitle')}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus size={18} /> {t('trainer.add')}
          </Button>
        }
      />

      {!clients ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : clients.length === 0 ? (
        <EmptyState
          icon={<Users size={40} />}
          title={t('trainer.noClients')}
          description={t('trainer.noClientsDesc')}
          action={
            <Button onClick={() => setOpen(true)}>
              <UserPlus size={16} /> {t('trainer.addClient')}
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {clients.map((c) => (
            <Link key={c.id} to={`/trainer/client/${c.id}`}>
              <Card className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700">
                    {initials(c.full_name)}
                  </div>
                  <div>
                    <p className="font-semibold">{c.full_name || t('trainer.unnamedClient')}</p>
                    <p className="text-sm capitalize text-slate-500">{t(`role.${c.role}`)}</p>
                  </div>
                </div>
                <ChevronRight className="text-slate-400" size={20} />
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title={t('trainer.addClient')}>
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            {t('trainer.addClientDesc')}
          </p>
          <Field label={t('trainer.clientEmail')}>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@example.com"
            />
          </Field>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button fullWidth loading={saving} onClick={addClient} disabled={!email.trim()}>
            {t('trainer.addClient')}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
