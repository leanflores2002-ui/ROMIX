export const sanitizeText = (value: string): string =>
  value.replace(/[<>]/g, '').trim();

export const sanitizeOptionalText = (value?: string | null): string | null => {
  if (!value) return null;
  const cleaned = sanitizeText(value);
  return cleaned.length > 0 ? cleaned : null;
};

