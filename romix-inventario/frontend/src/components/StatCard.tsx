import type { LucideIcon } from 'lucide-react';

export const StatCard = ({ label, value, icon: Icon, tone = 'zinc' }: { label: string; value: number; icon: LucideIcon; tone?: 'zinc' | 'pink' | 'amber' | 'emerald' }) => {
  const tones = {
    zinc: 'bg-zinc-100 text-zinc-700',
    pink: 'bg-pink-100 text-pink-700',
    amber: 'bg-amber-100 text-amber-700',
    emerald: 'bg-emerald-100 text-emerald-700'
  };
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-zinc-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight">{value.toLocaleString('es-AR')}</p>
        </div>
        <div className={`rounded-xl p-2.5 ${tones[tone]}`}><Icon size={20} /></div>
      </div>
    </div>
  );
};
