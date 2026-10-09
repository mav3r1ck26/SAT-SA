import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';

export function Layout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 lg:pl-64">
      <Sidebar open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex min-h-screen min-w-0 flex-col">
        <TopNav onMenuClick={() => setMobileNavOpen(true)} />
        <main className="w-full min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
