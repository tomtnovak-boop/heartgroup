import { parse, isValid, format } from 'date-fns';

/**
 * Formats a raw input string into dd/MM/YYYY format while typing
 * Automatically adds slashes at the right positions
 */
export function formatDateInput(value: string): string {
  // Remove all non-digits
  const digits = value.replace(/\D/g, '');
  
  // Limit to 8 digits (ddMMYYYY)
  const limited = digits.slice(0, 8);
  
  // Add slashes at appropriate positions
  if (limited.length <= 2) {
    return limited;
  } else if (limited.length <= 4) {
    return `${limited.slice(0, 2)}/${limited.slice(2)}`;
  } else {
    return `${limited.slice(0, 2)}/${limited.slice(2, 4)}/${limited.slice(4)}`;
  }
}

/**
 * Parses a dd/MM/YYYY string into a Date object
 * Returns null if invalid
 */
export function parseDateString(dateString: string): Date | null {
  if (dateString.length !== 10) return null;
  
  const parsed = parse(dateString, 'dd/MM/yyyy', new Date());
  
  if (!isValid(parsed)) return null;
  
  // Additional validation: date should not be in the future
  if (parsed > new Date()) return null;
  
  // Additional validation: reasonable birth date (not before 1900)
  if (parsed < new Date('1900-01-01')) return null;
  
  return parsed;
}

/**
 * Formats a Date object to dd/MM/YYYY string
 */
export function formatDateToInput(date: Date | undefined): string {
  if (!date) return '';
  return format(date, 'dd/MM/yyyy');
}
