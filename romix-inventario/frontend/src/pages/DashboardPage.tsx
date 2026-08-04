import { AlertTriangle, Boxes, PackageOpen, ScanBarcode, Shirt, Waypoints } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { useInventoryRevision } from '../contexts/RealtimeContext';
import { apiGet } from '../services/api';
import type { DashboardData } from '../types';
import { formatDateTime, movementLabel, movementTone } from '../utils/formatters';

export const DashboardPage = () => {
  const revision = useInventoryRevision();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setData(await apiGet<DashboardData>('/api/inventory/dashboard'));
      setError('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo cargar el dashboard');
    }
  }, []);

  useEffect(() => { void load(); }, [load, revision]);

  return (
    <>
      <PageHeader title="Dashboard" description="Resumen en tiempo real del inventario ROMIX" actions={<><Link to="/scanner" className="btn-primary"><ScanBarcode size={18} /> Abrir escaner</Link><Link to="/inventory" className="btn-secondary"><Boxes size={18} /> Ver inventario</Link></>} />
      {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error} <button className="ml-2 underline" onClick={() => void load()}>Reintentar</button></div>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Productos" value={data?.products ?? 0} icon={Shirt} />
        <StatCard label="Variantes" value={data?.variants ?? 0} icon={Waypoints} tone="pink" />
        <StatCard label="Unidades disponibles" value={data?.availableUnits ?? 0} icon={PackageOpen} tone="emerald" />
        <StatCard label="Stock bajo" value={data?.lowStock ?? 0} icon={AlertTriangle} tone="amber" />
        <StatCard label="Movimientos hoy" value={data?.movementsToday ?? 0} icon={ScanBarcode} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className="card overflow-hidden">
          <div className="border-b border-zinc-200 px-5 py-4"><h2 className="font-bold">Ultimos movimientos</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase text-zinc-500"><tr><th className="px-5 py-3">Fecha</th><th className="px-5 py-3">Producto</th><th className="px-5 py-3">Tipo</th><th className="px-5 py-3 text-right">Stock</th></tr></thead>
              <tbody className="divide-y divide-zinc-100">
                {data?.latestMovements.map((movement) => <tr key={movement.id}><td className="whitespace-nowrap px-5 py-3 text-zinc-500">{formatDateTime(movement.created_at)}</td><td className="px-5 py-3"><p className="font-medium">{movement.product_variants?.products?.name ?? 'Producto'}</p><p className="text-xs text-zinc-500">{movement.product_variants?.color} · Talle {movement.product_variants?.size}</p></td><td className="px-5 py-3"><span className={`badge ${movementTone[movement.movement_type]}`}>{movementLabel[movement.movement_type]}</span></td><td className="px-5 py-3 text-right font-semibold">{movement.previous_stock} → {movement.new_stock}</td></tr>)}
                {data?.latestMovements.length === 0 && <tr><td className="px-5 py-10 text-center text-zinc-500" colSpan={4}>Todavia no hay movimientos.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4"><h2 className="font-bold">Stock bajo</h2><Link className="text-sm font-semibold text-pink-600 hover:text-pink-700" to="/inventory?status=low">Ver todos</Link></div>
          <div className="divide-y divide-zinc-100">
            {data?.lowStockVariants.map((variant) => <div key={variant.id} className="flex items-center justify-between gap-4 px-5 py-4"><div><p className="text-sm font-medium">{variant.product.name}</p><p className="mt-0.5 text-xs text-zinc-500">{variant.color} · Talle {variant.size} · {variant.sku}</p></div><div className="text-right"><p className="font-bold text-amber-700">{variant.stock}</p><p className="text-xs text-zinc-400">min. {variant.minimum_stock}</p></div></div>)}
            {data?.lowStockVariants.length === 0 && <p className="px-5 py-10 text-center text-sm text-zinc-500">No hay variantes con stock bajo.</p>}
          </div>
        </section>
      </div>
    </>
  );
};
