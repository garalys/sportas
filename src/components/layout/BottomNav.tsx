import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, Dumbbell, Utensils, User } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useI18n } from '../../i18n/I18nProvider';

const items = [
  { to: '/', labelKey: 'nav.home', icon: LayoutDashboard, end: true },
  { to: '/calendar', labelKey: 'nav.calendar', icon: CalendarDays },
  { to: '/workouts', labelKey: 'nav.workouts', icon: Dumbbell },
  { to: '/food', labelKey: 'nav.food', icon: Utensils },
  { to: '/profile', labelKey: 'nav.profile', icon: User },
];

export function BottomNav() {
  const { t } = useI18n();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur">
      <div
        className="mx-auto grid max-w-md grid-cols-5"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {items.map(({ to, labelKey, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition',
                isActive ? 'text-brand-600' : 'text-slate-400 hover:text-slate-600',
              )
            }
          >
            <Icon size={22} />
            {t(labelKey)}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
