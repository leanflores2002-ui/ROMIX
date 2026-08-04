import { CheckCircle2, Focus, ScanBarcode, XCircle } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { PageHeader } from '../components/PageHeader';
import { apiPost } from '../services/api';
import type { ScanMode, ScanResult } from '../types';
import { playFeedback } from '../utils/audio';

interface SessionScan {
  id: string;
  barcode: string;
  mode: ScanMode;
  at: Date;
  result?: ScanResult;
  error?: string;
}

const modes: Array<{ value: ScanMode; label: string; help: string }> = [
  { value: 'out', label: 'Salida', help: 'Descuenta unidades' },
  { value: 'in', label: 'Entrada', help: 'Suma unidades' },
  { value: 'adjustment', label: 'Ajuste', help: 'Fija el stock final' },
  { value: 'query', label: 'Consulta', help: 'No modifica stock' }
];

export const ScannerPage = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const lastScanRef = useRef<{ barcode: string; at: number } | null>(null);
  const [mode, setMode] = useState<ScanMode>('out');
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const [barcode, setBarcode] = useState('');
  const [processing, setProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<SessionScan | null>(null);
  const [history, setHistory] = useState<SessionScan[]>([]);

  const focusScanner = () => { window.setTimeout(() => inputRef.current?.focus(), 50); };
  useEffect(() => { inputRef.current?.focus(); }, []);

  const scan = async (event: FormEvent) => {
    event.preventDefault();
    const cleanBarcode = barcode.trim().toUpperCase();
    setBarcode('');
    if (!cleanBarcode || processing) return focusScanner();

    const now = Date.now();
    if (lastScanRef.current?.barcode === cleanBarcode && now - lastScanRef.current.at < 1500) {
      const duplicate: SessionScan = { id: crypto.randomUUID(), barcode: cleanBarcode, mode, at: new Date(), error: 'Lectura duplicada ignorada. Espera 1,5 segundos.' };
      setLastResult(duplicate);
      focusScanner();
      return;
    }
    lastScanRef.current = { barcode: cleanBarcode, at: now };
    setProcessing(true);

    try {
      const result = await apiPost<ScanResult>('/api/inventory/scan', { barcode: cleanBarcode, movementType: mode, quantity: mode === 'query' ? 1 : quantity, note: note || null });
      const entry: SessionScan = { id: crypto.randomUUID(), barcode: cleanBarcode, mode, at: new Date(), result };
      setLastResult(entry);
      setHistory((current) => [entry, ...current].slice(0, 12));
      playFeedback(true);
    } catch (caught) {
      const entry: SessionScan = { id: crypto.randomUUID(), barcode: cleanBarcode, mode, at: new Date(), error: caught instanceof Error ? caught.message : 'No se pudo procesar el codigo' };
      setLastResult(entry);
      setHistory((current) => [entry, ...current].slice(0, 12));
      playFeedback(false);
    } finally {
      setProcessing(false);
      focusScanner();
    }
  };

  return (
    <>
      <PageHeader title="Escaner" description="Conecta el lector USB, selecciona el modo y escanea una etiqueta" actions={<button className="btn-secondary" onClick={focusScanner}><Focus size={18} /> Enfocar lector</button>} />
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <section className="card p-5 sm:p-6">
            <p className="mb-3 text-sm font-semibold text-zinc-700">Modo de operacion</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {modes.map((item) => <button key={item.value} type="button" onClick={() => { setMode(item.value); focusScanner(); }} className={`rounded-xl border p-3 text-left transition ${mode === item.value ? 'border-zinc-950 bg-zinc-950 text-white' : 'border-zinc-200 bg-white hover:border-zinc-400'}`}><span className="block text-sm font-bold">{item.label}</span><span className={`mt-1 block text-xs ${mode === item.value ? 'text-zinc-300' : 'text-zinc-500'}`}>{item.help}</span></button>)}
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className={mode === 'query' ? 'opacity-50' : ''}><span className="label">{mode === 'adjustment' ? 'Stock final' : 'Cantidad'}</span><input className="field" type="number" min={mode === 'adjustment' ? 0 : 1} value={quantity} disabled={mode === 'query'} onChange={(event) => setQuantity(Number(event.target.value))} /></label>
              <label><span className="label">Nota opcional</span><input className="field" maxLength={300} value={note} onChange={(event) => setNote(event.target.value)} placeholder={mode === 'out' ? 'Ej: Venta mostrador' : 'Detalle del movimiento'} /></label>
            </div>
            <form className="mt-5" onSubmit={scan}>
              <label className="label" htmlFor="barcode">Codigo de barras</label>
              <div className="relative">
                <ScanBarcode className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={28} />
                <input id="barcode" ref={inputRef} className="field h-16 pl-14 pr-28 font-mono text-lg font-semibold tracking-wide" autoComplete="off" value={barcode} onChange={(event) => setBarcode(event.target.value)} disabled={processing} placeholder="Escanea y presiona Enter" />
                <button className="absolute right-2 top-2 h-12 rounded-lg bg-pink-600 px-4 text-sm font-bold text-white hover:bg-pink-700 disabled:opacity-50" disabled={processing}>{processing ? 'Procesando…' : 'Aplicar'}</button>
              </div>
            </form>
          </section>
          {lastResult && <section className={`rounded-2xl border p-5 sm:p-6 ${lastResult.result ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
            <div className="flex gap-3">{lastResult.result ? <CheckCircle2 className="shrink-0 text-emerald-600" size={28} /> : <XCircle className="shrink-0 text-red-600" size={28} />}<div className="min-w-0 flex-1">
              <h2 className={`font-bold ${lastResult.result ? 'text-emerald-900' : 'text-red-900'}`}>{lastResult.result ? 'Escaneo procesado correctamente' : 'No se pudo procesar el escaneo'}</h2>
              {lastResult.error && <p className="mt-1 text-sm text-red-700">{lastResult.error}</p>}
              {lastResult.result && <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><div><p className="text-emerald-700">Producto</p><p className="font-bold text-emerald-950">{lastResult.result.product.name}</p></div><div><p className="text-emerald-700">Variante</p><p className="font-bold text-emerald-950">{lastResult.result.product.color} · Talle {lastResult.result.product.size}</p></div><div><p className="text-emerald-700">SKU / Codigo</p><p className="break-all font-mono font-semibold text-emerald-950">{lastResult.result.product.sku}<br />{lastResult.result.product.barcode}</p></div><div><p className="text-emerald-700">Stock</p><p className="text-2xl font-black text-emerald-950">{lastResult.result.previousStock} → {lastResult.result.newStock}</p></div></div>}
            </div></div>
          </section>}
        </div>
        <section className="card h-fit overflow-hidden">
          <div className="border-b border-zinc-200 px-5 py-4"><h2 className="font-bold">Escaneos de esta sesion</h2><p className="mt-1 text-xs text-zinc-500">Ultimas {history.length} lecturas</p></div>
          <div className="divide-y divide-zinc-100">
            {history.map((item) => <div key={item.id} className="flex gap-3 px-5 py-4"><div className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${item.result ? 'bg-emerald-500' : 'bg-red-500'}`} /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><p className="truncate font-mono text-sm font-semibold">{item.barcode}</p><span className="whitespace-nowrap text-xs text-zinc-400">{item.at.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span></div><p className="mt-1 text-xs text-zinc-500">{item.result ? `${item.result.product.name} · ${item.result.previousStock} → ${item.result.newStock}` : item.error}</p></div></div>)}
            {history.length === 0 && <div className="px-5 py-14 text-center"><ScanBarcode className="mx-auto text-zinc-300" size={40} /><p className="mt-3 text-sm text-zinc-500">Los escaneos apareceran aca.</p></div>}
          </div>
        </section>
      </div>
    </>
  );
};
