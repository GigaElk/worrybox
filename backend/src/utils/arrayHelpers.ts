/**
 * Helper functions for handling arrays stored as strings in SQL Server
 */

export function stringToArray(value: string | null | undefined): string[] {
  if (!value || typeof value !== 'string') return [];
  return value.split(',').map(item => item.trim()).filter(item => item.length > 0);
}

export function stringToArrayOrUndefined(value: string | null | undefined): string[] | undefined {
  if (!value || typeof value !== 'string') return undefined;
  const result = value.split(',').map(item => item.trim()).filter(item => item.length > 0);
  return result.length > 0 ? result : undefined;
}

export function arrayToString(value: string[] | null | undefined): string | null {
  if (!value || !Array.isArray(value) || value.length === 0) return null;
  return value.join(',');
}

export function ensureArray(value: string | string[] | null | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return stringToArray(value);
  return [];
}