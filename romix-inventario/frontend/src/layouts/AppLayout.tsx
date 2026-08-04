import { Boxes, History, LayoutDashboard, LogOut, Menu, ScanBarcode, X } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { RealtimeProvider } from '../contexts/RealtimeContext';

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/scanner', label: 'Escaner', icon: ScanBarcode },
  { to: '/inventory', label: 'Inventario', icon: Boxes },
  { to: '/movements', label: 'Movimientos', icon: History }
];

export const AppLayout = () => {
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const sidebar = (
    <>
      <div className="flex h-20 items-center justify-between border-b border-zinc-800 px-6">
        <div>
          <p className="text-2xl font-black tracking-[0.2em] text-white">ROMIX</p>
          <p className="text-[11px] uppercase tracking-widest text-zinc-400">Inventario</p>
        </div>
        <button className="text-zinc-400 lg:hidden" onClick={() => setMenuOpen(false)} aria-label="Cerrar menu"><X /></button>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'} onClick={() => setMenuOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${isActive ? 'bg-white text-zinc-950' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>
            <Icon size={20} />{label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-zinc-800 p-4">
        <p className="truncate px-2 text-xs text-zinc-400">{user?.email}</p>
        <button className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white" onClick={() => void signOut()}>
          <LogOut size={18} /> Cerrar sesion
        </button>
      </div>
    </>
  );

  return (
    <RealtimeProvider>
      <div className="min-h-screen bg-zinc-50 lg:pl-64">
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-zinc-950 lg:flex">{sidebar}</aside>
        {menuOpen && <div className="fixed inset-0 z-50 bg-zinc-950/50 lg:hidden" onClick={() => setMenuOpen(false)}><aside className="flex h-full w-72 flex-col bg-zinc-950" onClick={(event) => event.stopPropagation()}>{sidebar}</aside></div>}
        <header className="sticky top-0 z-30 flex h-16 items-center border-b border-zinc-200 bg-white/90 px-4 backdrop-blur lg:hidden">
          <button className="rounded-lg p-2 hover:bg-zinc-100" onClick={() => setMenuOpen(true)} aria-label="Abrir menu"><Menu /></button>
          <p className="ml-3 font-black tracking-[0.15em]">ROMIX</p>
        </header>
        <main className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8"><Outlet /></main>
      </div>
    </RealtimeProvider>
  );
};
