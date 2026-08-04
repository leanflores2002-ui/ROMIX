export const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value));

export const movementLabels = {
  in: 'Entrada',
  out: 'Salida',
  adjustment: 'Ajuste',
  query: 'Consulta'
} as const;

