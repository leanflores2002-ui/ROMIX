export const StatusBadge = ({ low, inactive }: { low: boolean; inactive?: boolean }) => (
  <span
    className={[
      'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
      inactive && 'bg-slate-200 text-slate-700',
      !inactive && low && 'bg-yellow-100 text-yellow-900',
      !inactive && !low && 'bg-emerald-100 text-emerald-800'
    ].filter(Boolean).join(' ')}
  >
    {inactive ? 'Inactivo' : low ? 'Stock bajo' : 'Disponible'}
  </span>
);
