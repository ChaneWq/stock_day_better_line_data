export function isValidStockCode(code: string): boolean {
  if (!code || typeof code !== 'string') return false;
  const trimmed = code.trim();
  return /^[0-9]{6}$/.test(trimmed);
}

export function isValidDate(date: string): boolean {
  if (!date || typeof date !== 'string') return false;
  const trimmed = date.trim();
  return /^[0-9]{8}$/.test(trimmed);
}
