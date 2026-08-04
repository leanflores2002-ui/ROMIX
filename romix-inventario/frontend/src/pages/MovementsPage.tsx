import { ChevronLeft, ChevronRight, Filter, History } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { PageHeader } from '../components/PageHeader';
import { useInventoryRevision } from '../contexts/RealtimeContext';
import { apiGet } from '../services/api';
import type { Movement, Paginated } from '../types';
import { formatDateTime, movementLabel, movementTone } from '../utils/formatters';

interface Filters { dateFrom: string; dateTo: string; movementType: string; product: string; barcode: string; user: string }
const emptyFilters: Filters = { dateFrom: '', dateTo: '', movementType: '', product: '', barcode: '', user: '' };

export const MovementsPage = () => {
  const revision = useInventoryRevision();
  const [draft, setDraft] = useState<Filters>(emptyFilters);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [data, setData] = useState<Paginated<Movement>>({ rows: [], total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const pageSize = 20;

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (filters.dateFrom) params.set('dateFrom', new Date(`${filters.dateFrom}T00:00:00`).toISOString());
    if (filters.dateTo) params.set('dateTo', new Date(`${filters.dateTo}T23:59:59.999`).toISOString());
    if (filters.movementType) params.set('movementType', filters.movementType);
    if (filters.product) params.set('product', filters.product);
    if (filters.barcode) params.set('barcode', filters.barcode);
    if (filters.user) params.set('user', filters.user);
    setLoading(true);
    try {
      setData(await apiGet<Paginated<Movement>>(`/api/inventory/movements?${params}`));
      setError('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudieron cargar los movimientos');
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { void load(); }, [load, revision]);
  const pageCount = Math.max(1, Math.ceil(data.total / pageSize));
  const update = (key: keyof Filters, value: string) => setDraft((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent) => { event.preventDefault(); setPage(1); setFilters(draft); };
  const clear = () => { setDraft(emptyFilters); setFilters(emptyFilters); setPage(1); };

  return (
    <>
      <PageHeader title="Movimientos" description="Historial auditable de entradas, salidas y ajustes" />
      <form className="card mb-5 p-4" onSubmit={submit}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label><span className="label">Fecha desde</span><input className="field" type="date" value={draft.dateFrom} onChange={(event) => update('dateFrom', event.target.value)} /></label>
          <label><span className="label">Fecha hasta</span><input className="field" type="date" value={draft.dateTo} onChange={(event) => update('dateTo', event.target.value)} /></label>
          <label><span className="label">Tipo</span><select className="field" value={draft.movementType} onChange={(event) => update('movementType', event.target.value)}><option value="">Todos</option><option value="in">Entrada</option><option value="out">Salida</option><option value="adjustment">Ajuste</option></select></label>
          <label><span className="label">Producto</span><input className="field" value={draft.product} onChange={(event) => update('product', event.target.value)} placeholder="Nombre" /></label>
          <label><span className="label">Codigo</span><input className="field font-mono" value={draft.barcode} onChange={(event) => update('barcode', event.target.value)} placeholder="ROM-…" /></label>
          <label><span className="label">Usuario (UUID)</span><input className="field" value={draft.user} onChange={(event) => update('user', event.target.value)} placeholder="UUID" /></label>
        </div>
        <div className="mt-4 flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={clear}>Limpiar</button><button className="btn-primary"><Filter size={17} /> Aplicar filtros</button></div>
      </form>
      {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error} <button className="ml-2 underline" onClick={() => void load()}>Reintentar</button></div>}
      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1250px] text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500"><tr><th className="px-4 py-3">Fecha y hora</th><th className="px-4 py-3">Usuario</th><th className="px-4 py-3">Producto</th><th className="px-4 py-3">Categoria</th><th className="px-4 py-3">Color</th><th className="px-4 py-3">Talle</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3 text-right">Cantidad</th><th className="px-4 py-3 text-right">Anterior</th><th className="px-4 py-3 text-right">Nuevo</th><th className="px-4 py-3">Nota</th></tr></thead>
            <tbody className="divide-y divide-zinc-100">
              {data.rows.map((movement) => <tr key={movement.id} className="hover:bg-zinc-50/80"><td className="whitespace-nowrap px-4 py-3 text-zinc-500">{formatDateTime(movement.created_at)}</td><td className="max-w-48 truncate px-4 py-3 text-xs" title={movement.user ?? movement.created_by ?? ''}>{movement.user ?? movement.created_by ?? '—'}</td><td className="px-4 py-3 font-medium">{movement.product_variants.products.name}</td><td className="px-4 py-3 text-zinc-500">{movement.product_variants.products.category ?? '—'}</td><td className="px-4 py-3">{movement.product_variants.color}</td><td className="px-4 py-3">{movement.product_variants.size}</td><td className="px-4 py-3"><span className={`badge ${movementTone[movement.movement_type]}`}>{movementLabel[movement.movement_type]}</span></td><td className="px-4 py-3 text-right font-semibold">{movement.quantity}</td><td className="px-4 py-3 text-right">{movement.previous_stock}</td><td className="px-4 py-3 text-right font-bold">{movement.new_stock}</td><td className="max-w-64 truncate px-4 py-3 text-zinc-500" title={movement.note ?? ''}>{movement.note ?? '—'}</td></tr>)}
              {!loading && data.rows.length === 0 && <tr><td colSpan={11} className="px-5 py-14 text-center"><History className="mx-auto text-zinc-300" size={42} /><p className="mt-3 text-sm text-zinc-500">No hay movimientos para estos filtros.</p></td></tr>}
              {loading && <tr><td colSpan={11} className="px-5 py-14 text-center text-sm text-zinc-500">Cargando movimientos…</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 border-t border-zinc-200 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"><p className="text-zinc-500">{data.total} movimientos</p><div className="flex items-center gap-2"><button className="btn-secondary px-3 py-2" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft size={16} /></button><span className="px-2 font-medium">Pagina {page} de {pageCount}</span><button className="btn-secondary px-3 py-2" disabled={page >= pageCount} onClick={() => setPage((value) => value + 1)}><ChevronRight size={16} /></button></div></div>
      </section>
    </>
  );
};
