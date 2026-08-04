import { LockKeyhole, Mail } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const LoginPage = () => {
  const { session, loading: authLoading, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (session) navigate('/', { replace: true });
  }, [session, navigate]);

  if (!authLoading && session) return <Navigate to="/" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signIn(email.trim(), password);
      const target = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/';
      navigate(target, { replace: true });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'No se pudo iniciar sesion';
      setError(message === 'Invalid login credentials' ? 'Email o contraseña incorrectos.' : message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-zinc-100 lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-zinc-950 p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-pink-500/20 blur-3xl" />
        <div className="relative">
          <p className="text-3xl font-black tracking-[0.22em] text-white">ROMIX</p>
          <p className="mt-2 text-sm uppercase tracking-[0.25em] text-zinc-500">Control de inventario</p>
        </div>
        <div className="relative max-w-xl">
          <p className="text-5xl font-bold leading-tight text-white">Tu stock, claro y actualizado en cada escaneo.</p>
          <p className="mt-5 text-lg leading-relaxed text-zinc-400">Entradas, ventas, ajustes e historial en tiempo real para todo el equipo.</p>
        </div>
        <p className="relative text-xs text-zinc-600">Sistema interno · Acceso autorizado</p>
      </section>
      <section className="flex items-center justify-center p-5 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <p className="text-3xl font-black tracking-[0.2em]">ROMIX</p>
            <p className="mt-1 text-xs uppercase tracking-widest text-zinc-500">Inventario</p>
          </div>
          <div className="card p-6 sm:p-8">
            <h1 className="text-2xl font-bold">Iniciar sesion</h1>
            <p className="mt-2 text-sm text-zinc-500">Ingresa con tu usuario de Supabase.</p>
            {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</div>}
            <form className="mt-6 space-y-5" onSubmit={submit}>
              <label className="block">
                <span className="label">Email</span>
                <span className="relative block"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} /><input className="field pl-10" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="usuario@romix.com" /></span>
              </label>
              <label className="block">
                <span className="label">Contraseña</span>
                <span className="relative block"><LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} /><input className="field pl-10" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></span>
              </label>
              <button className="btn-primary w-full py-3" disabled={loading}>{loading ? 'Ingresando…' : 'Ingresar'}</button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
};
