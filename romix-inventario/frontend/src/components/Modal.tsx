import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';

export const Modal = ({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) => {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:max-w-xl sm:rounded-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-zinc-200 bg-white px-5 py-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100" onClick={onClose} aria-label="Cerrar"><X size={20} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};
