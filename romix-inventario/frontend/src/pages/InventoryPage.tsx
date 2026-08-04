import { Boxes, ChevronLeft, ChevronRight, Edit3, PackagePlus, Plus, Search, SlidersHorizontal } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { useInventoryRevision } from '../contexts/RealtimeContext';
import { apiGet, apiPatch, apiPost } from '../services/api';
import type { InventoryRow, Product, ScanResult } from '../types';

type ModalState = { type: 'product' } | { type: 'variant'; row?: InventoryRow } | { type: 'adjust'; row: InventoryRow } | null;
type SortKey = 'product' | 'sku' | 'stock';

const pageSize = 15;

export const InventoryPage = () => {
  const revision = useInventoryRevision();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modal, setModal] = useState<ModalState>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [color, setColor] = useState('');
  const [size, setSize] = useState('');
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [sort, setSort] = useState<SortKey>('product');
  const [descending, setDescending] = useState(false);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    try {
      setProducts(await apiGet<Product[]>('/api/products'));
      setError('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo cargar el inventario');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load, revision]);

  const rows = useMemo<InventoryRow[]>(() => products.flatMap((product) => product.product_variants.map((variant) => ({ ...variant, productId: product.id, productName: product.name, category: product.category, productActive: product.active }))), [products]);
  const categories = useMemo(() => [...new Set(rows.map((row) => row.category).filter(Boolean) as string[])].sort(), [rows]);
  const colors = useMemo(() => [...new Set(rows.map((row) => row.color))].sort(), [rows]);
  const sizes = useMemo(() => [...new Set(rows.map((row) => row.size))].sort((a, b) => a.localeCompare(b, 'es', { numeric: true })), [rows]);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es');
    const result = rows.filter((row) => {
      const matchesSearch = !query || [row.barcode, row.sku, row.productName, row.category, row.color, row.size].some((value) => value?.toLocaleLowerCase('es').includes(query));
      const matchesStatus = !status || (status === 'low' && row.active && row.productActive && row.stock <= row.minimum_stock) || (status === 'ok' && row.active && row.productActive && row.stock > row.minimum_stock) || (status === 'inactive' && (!row.active || !row.productActive));
      return matchesSearch && (!category || row.category === category) && (!color || row.color === color) && (!size || row.size === size) && matchesStatus;
    });
    result.sort((a, b) => {
      const comparison = sort === 'stock' ? a.stock - b.stock : sort === 'sku' ? a.sku.localeCompare(b.sku) : a.productName.localeCompare(b.productName);
      return descending ? -comparison : comparison;
    });
    return result;
  }, [rows, search, category, color, size, status, sort, descending]);

  useEffect(() => setPage(1), [search, category, color, size, status, sort, descending]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visibleRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const complete = async (message: string) => {
    setModal(null);
    setNotice(message);
    await load();
    window.setTimeout(() => setNotice(''), 3500);
  };

  return (
    <>
      <PageHeader title="Inventario" description={`${rows.length} variantes registradas`} actions={<><button className="btn-secondary" onClick={() => setModal({ type: 'product' })}><Plus size={18} /> Crear producto</button><button className="btn-primary" onClick={() => setModal({ type: 'variant' })}><PackagePlus size={18} /> Agregar variante</button></>} />
      {notice && <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">{notice}</div>}
      {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error} <button className="ml-2 underline" onClick={() => void load()}>Reintentar</button></div>}
      <section className="card mb-5 p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[2fr_repeat(5,1fr)]">
          <label className="relative"><span className="sr-only">Buscar</span><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} /><input className="field pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar producto, SKU o codigo…" /></label>
          <select className="field" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Categorias</option>{categories.map((value) => <option key={value}>{value}</option>)}</select>
          <select className="field" value={color} onChange={(event) => setColor(event.target.value)}><option value="">Colores</option>{colors.map((value) => <option key={value}>{value}</option>)}</select>
          <select className="field" value={size} onChange={(event) => setSize(event.target.value)}><option value="">Talles</option>{sizes.map((value) => <option key={value}>{value}</option>)}</select>
          <select className="field" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todos los estados</option><option value="ok">Stock normal</option><option value="low">Stock bajo</option><option value="inactive">Inactivo</option></select>
          <select className="field" value={`${sort}:${descending ? 'desc' : 'asc'}`} onChange={(event) => { const [key, direction] = event.target.value.split(':'); setSort(key as SortKey); setDescending(direction === 'desc'); }}><option value="product:asc">Producto A–Z</option><option value="sku:asc">SKU A–Z</option><option value="stock:asc">Menor stock</option><option value="stock:desc">Mayor stock</option></select>
        </div>
      </section>
      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500"><tr><th className="px-4 py-3">Codigo</th><th className="px-4 py-3">SKU</th><th className="px-4 py-3">Producto</th><th className="px-4 py-3">Categoria</th><th className="px-4 py-3">Color</th><th className="px-4 py-3">Talle</th><th className="px-4 py-3 text-right">Stock</th><th className="px-4 py-3 text-right">Minimo</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3 text-right">Acciones</th></tr></thead>
            <tbody className="divide-y divide-zinc-100">
              {visibleRows.map((row) => { const low = row.stock <= row.minimum_stock; const inactive = !row.active || !row.productActive; return <tr key={row.id} className="hover:bg-zinc-50/80"><td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{row.barcode}</td><td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold">{row.sku}</td><td className="px-4 py-3 font-medium">{row.productName}</td><td className="px-4 py-3 text-zinc-500">{row.category || '—'}</td><td className="px-4 py-3">{row.color}</td><td className="px-4 py-3">{row.size}</td><td className={`px-4 py-3 text-right text-lg font-black ${low && !inactive ? 'text-amber-700' : ''}`}>{row.stock}</td><td className="px-4 py-3 text-right text-zinc-500">{row.minimum_stock}</td><td className="px-4 py-3">{inactive ? <span className="badge bg-zinc-200 text-zinc-600">Inactivo</span> : low ? <span className="badge bg-amber-100 text-amber-800">Stock bajo</span> : <span className="badge bg-emerald-100 text-emerald-700">Normal</span>}</td><td className="px-4 py-3"><div className="flex justify-end gap-2"><button className="btn-secondary px-3 py-2" onClick={() => setModal({ type: 'variant', row })} title="Editar variante"><Edit3 size={16} /></button><button className="btn-secondary px-3 py-2" onClick={() => setModal({ type: 'adjust', row })} disabled={inactive}><SlidersHorizontal size={16} /> Ajustar</button></div></td></tr>; })}
              {!loading && visibleRows.length === 0 && <tr><td colSpan={10} className="px-5 py-14 text-center"><Boxes className="mx-auto text-zinc-300" size={42} /><p className="mt-3 text-sm text-zinc-500">No se encontraron variantes con estos filtros.</p></td></tr>}
              {loading && <tr><td colSpan={10} className="px-5 py-14 text-center text-sm text-zinc-500">Cargando inventario…</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 border-t border-zinc-200 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"><p className="text-zinc-500">{filtered.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} de {filtered.length}</p><div className="flex items-center gap-2"><button className="btn-secondary px-3 py-2" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft size={16} /></button><span className="px-2 font-medium">Pagina {page} de {pageCount}</span><button className="btn-secondary px-3 py-2" disabled={page >= pageCount} onClick={() => setPage((value) => value + 1)}><ChevronRight size={16} /></button></div></div>
      </section>
      {modal?.type === 'product' && <ProductModal onClose={() => setModal(null)} onComplete={complete} />}
      {modal?.type === 'variant' && <VariantModal products={products} row={modal.row} onClose={() => setModal(null)} onComplete={complete} />}
      {modal?.type === 'adjust' && <AdjustModal row={modal.row} onClose={() => setModal(null)} onComplete={complete} />}
    </>
  );
};

const ProductModal = ({ onClose, onComplete }: { onClose: () => void; onComplete: (message: string) => Promise<void> }) => {
  const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setSaving(true); setError(''); const data = new FormData(event.currentTarget); try { await apiPost('/api/products', { name: data.get('name'), category: data.get('category') || null, description: data.get('description') || null, active: true }); await onComplete('Producto creado correctamente.'); } catch (caught) { setError(caught instanceof Error ? caught.message : 'No se pudo crear el producto'); } finally { setSaving(false); } };
  return <Modal title="Crear producto" onClose={onClose}><form className="space-y-4" onSubmit={submit}>{error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<label><span className="label">Nombre *</span><input className="field" name="name" required maxLength={160} autoFocus /></label><label><span className="label">Categoria</span><input className="field" name="category" maxLength={80} /></label><label><span className="label">Descripcion</span><textarea className="field min-h-24 resize-y" name="description" maxLength={500} /></label><div className="flex justify-end gap-2 pt-2"><button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button><button className="btn-primary" disabled={saving}>{saving ? 'Guardando…' : 'Crear producto'}</button></div></form></Modal>;
};

const VariantModal = ({ products, row, onClose, onComplete }: { products: Product[]; row?: InventoryRow; onClose: () => void; onComplete: (message: string) => Promise<void> }) => {
  const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setSaving(true); setError(''); const data = new FormData(event.currentTarget); const payload = { barcode: data.get('barcode'), sku: data.get('sku'), color: data.get('color'), size: data.get('size'), minimumStock: Number(data.get('minimumStock')), active: data.get('active') === 'on', ...(!row ? { stock: Number(data.get('stock')) } : {}) }; try { if (row) await apiPatch(`/api/variants/${row.id}`, payload); else await apiPost(`/api/products/${data.get('productId')}/variants`, payload); await onComplete(row ? 'Variante actualizada correctamente.' : 'Variante creada correctamente.'); } catch (caught) { setError(caught instanceof Error ? caught.message : 'No se pudo guardar la variante'); } finally { setSaving(false); } };
  return <Modal title={row ? 'Editar variante' : 'Agregar variante'} onClose={onClose}><form className="space-y-4" onSubmit={submit}>{error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}{!row && <label><span className="label">Producto *</span><select className="field" name="productId" required defaultValue=""><option value="" disabled>Seleccionar producto</option>{products.filter((product) => product.active).map((product) => <option value={product.id} key={product.id}>{product.name}</option>)}</select></label>}<div className="grid gap-4 sm:grid-cols-2"><label><span className="label">Codigo de barras *</span><input className="field font-mono" name="barcode" required maxLength={120} defaultValue={row?.barcode} autoFocus={Boolean(row)} /></label><label><span className="label">SKU *</span><input className="field font-mono" name="sku" required maxLength={120} defaultValue={row?.sku} /></label><label><span className="label">Color *</span><input className="field" name="color" required maxLength={80} defaultValue={row?.color} /></label><label><span className="label">Talle *</span><input className="field" name="size" required maxLength={40} defaultValue={row?.size} /></label>{!row && <label><span className="label">Stock inicial</span><input className="field" type="number" name="stock" min={0} defaultValue={0} required /></label>}<label><span className="label">Stock minimo</span><input className="field" type="number" name="minimumStock" min={0} defaultValue={row?.minimum_stock ?? 0} required /></label></div><label className="flex items-center gap-2 text-sm font-medium text-zinc-700"><input type="checkbox" name="active" defaultChecked={row?.active ?? true} className="h-4 w-4 rounded border-zinc-300 text-pink-600" /> Variante activa</label><div className="flex justify-end gap-2 pt-2"><button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button><button className="btn-primary" disabled={saving}>{saving ? 'Guardando…' : row ? 'Guardar cambios' : 'Crear variante'}</button></div></form></Modal>;
};

const AdjustModal = ({ row, onClose, onComplete }: { row: InventoryRow; onClose: () => void; onComplete: (message: string) => Promise<void> }) => {
  const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setSaving(true); setError(''); const data = new FormData(event.currentTarget); try { const result = await apiPost<ScanResult>('/api/inventory/scan', { barcode: row.barcode, movementType: 'adjustment', quantity: Number(data.get('stock')), note: data.get('note') || 'Ajuste manual' }); await onComplete(`Stock ajustado: ${result.previousStock} → ${result.newStock}.`); } catch (caught) { setError(caught instanceof Error ? caught.message : 'No se pudo ajustar el stock'); } finally { setSaving(false); } };
  return <Modal title="Ajustar stock" onClose={onClose}><div className="mb-4 rounded-xl bg-zinc-50 p-4"><p className="font-semibold">{row.productName}</p><p className="mt-1 text-sm text-zinc-500">{row.color} · Talle {row.size} · Stock actual: <strong>{row.stock}</strong></p></div><form className="space-y-4" onSubmit={submit}>{error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<label><span className="label">Nuevo stock final *</span><input className="field" type="number" name="stock" min={0} defaultValue={row.stock} required autoFocus /></label><label><span className="label">Motivo del ajuste</span><textarea className="field min-h-20" name="note" maxLength={300} placeholder="Ej: Conteo fisico" /></label><p className="text-xs text-zinc-500">El ajuste se procesa por el backend y queda registrado en el historial.</p><div className="flex justify-end gap-2 pt-2"><button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button><button className="btn-primary" disabled={saving}>{saving ? 'Ajustando…' : 'Confirmar ajuste'}</button></div></form></Modal>;
};
