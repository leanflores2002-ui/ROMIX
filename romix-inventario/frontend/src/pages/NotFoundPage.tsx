import { Link } from 'react-router-dom';

export const NotFoundPage = () => <div className="grid min-h-[70vh] place-items-center text-center"><div><p className="text-7xl font-black text-zinc-200">404</p><h1 className="mt-3 text-2xl font-bold">Pagina inexistente</h1><p className="mt-2 text-zinc-500">La direccion solicitada no existe.</p><Link className="btn-primary mt-6" to="/">Volver al dashboard</Link></div></div>;
