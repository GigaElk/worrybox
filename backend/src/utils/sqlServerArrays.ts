/**
 * Utility functions for handling arrays in SQL Server
 * Since SQL Server doesn't support native arrays, we store them as comma-separated strings
 */

/**
 * Convert array to comma-separated string for SQL Server storage
 */
export function arrayToString(arr: string[] | null | undefined): string | null {
  if (!arr || arr.length === 0) {
    return null;
  }
  return arr.join(',');
}

/**
 * Convert comma-separated string back to array
 */
export function stringToArray(str: string | null | undefined): string[] {
  if (!str || str.trim() === '') {
    return [];
  }
  return str.split(',').map(item => item.trim()).filter(item => item.length > 0);
}

/**
 * Helper for JSON data that needs to be stored as string
 */
export function jsonToString(obj: any): string {
  if (obj === null || obj === undefined) {
    return '{}';
  }
  return JSON.stringify(obj);
}

/**
 * Helper for parsing JSON strings back to objects
 */
export function stringToJson<T = any>(str: string | null | undefined): T {
  if (!str || str.trim() === '') {
    return {} as T;
  }
  try {
    return JSON.parse(str);
  } catch (error) {
    console.warn('Failed to parse JSON string:', str, error);
    return {} as T;
  }
}

/**
 * Transform data before saving to SQL Server
 */
export function transformForSqlServer(data: any): any {
  const transformed = { ...data };
  
  // Handle array fields
  if (data.keywords && Array.isArray(data.keywords)) {
    transformed.keywords = arrayToString(data.keywords);
  }
  
  if (data.copingMethods && Array.isArray(data.copingMethods)) {
    transformed.copingMethods = arrayToString(data.copingMethods);
  }
  
  if (data.flaggedReasons && Array.isArray(data.flaggedReasons)) {
    transformed.flaggedReasons = arrayToString(data.flaggedReasons);
  }
  
  if (data.tags && Array.isArray(data.tags)) {
    transformed.tags = arrayToString(data.tags);
  }
  
  if (data.whenToUse && Array.isArray(data.whenToUse)) {
    transformed.whenToUse = arrayToString(data.whenToUse);
  }
  
  // Handle JSON fields
  if (data.instructions && typeof data.instructions === 'object') {
    transformed.instructions = jsonToString(data.instructions);
  }
  
  if (data.metadata && typeof data.metadata === 'object') {
    transformed.metadata = jsonToString(data.metadata);
  }
  
  if (data.data && typeof data.data === 'object') {
    transformed.data = jsonToString(data.data);
  }
  
  return transformed;
}

/**
 * Transform data after reading from SQL Server
 */
export function transformFromSqlServer(data: any): any {
  if (!data) return data;
  
  const transformed = { ...data };
  
  // Handle array fields
  if (data.keywords) {
    transformed.keywords = stringToArray(data.keywords);
  }
  
  if (data.copingMethods) {
    transformed.copingMethods = stringToArray(data.copingMethods);
  }
  
  if (data.flaggedReasons) {
    transformed.flaggedReasons = stringToArray(data.flaggedReasons);
  }
  
  if (data.tags) {
    transformed.tags = stringToArray(data.tags);
  }
  
  if (data.whenToUse) {
    transformed.whenToUse = stringToArray(data.whenToUse);
  }
  
  // Handle JSON fields
  if (data.instructions && typeof data.instructions === 'string') {
    transformed.instructions = stringToJson(data.instructions);
  }
  
  if (data.metadata && typeof data.metadata === 'string') {
    transformed.metadata = stringToJson(data.metadata);
  }
  
  if (data.data && typeof data.data === 'string') {
    transformed.data = stringToJson(data.data);
  }
  
  return transformed;
}