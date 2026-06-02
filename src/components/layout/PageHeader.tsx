import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useI18n } from '../../i18n/I18nProvider';

export function PageHeader({
  title,
  subtitle,
  action,
  back = false,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  back?: boolean;
}) {
  const navigate = useNavigate();
  const { t } = useI18n();
  return (
    <div className="mb-4 flex items-center gap-2">
      {back && (
        <button
          onClick={() => navigate(-1)}
          className="-ml-2 rounded-full p-1.5 text-slate-500 hover:bg-slate-100"
          aria-label={t('common.back')}
        >
          <ChevronLeft size={24} />
        </button>
      )}
      <div className="flex-1">
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
