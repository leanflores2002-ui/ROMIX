export const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));

export const movementLabel = {
  in: 'Entrada',
  out: 'Salida',
  adjustment: 'Ajuste'
} as const;

export const movementTone = {
  in: 'bg-emerald-100 text-emerald-700',
  out: 'bg-red-100 text-red-700',
  adjustment: 'bg-amber-100 text-amber-800'
} as const;
