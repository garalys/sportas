import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';

export function AppLayout() {
  return (
    <div className="mx-auto min-h-screen max-w-md bg-slate-50">
      <main className="px-4 pb-24 pt-5">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
