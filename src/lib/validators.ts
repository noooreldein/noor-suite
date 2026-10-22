/** Tiny form validation helpers. */

export function required(value: string): boolean {
  return value.trim().length > 0;
}

export function isPositive(n: number): boolean {
  return Number.isFinite(n) && n > 0;
}

export function isValidPhone(phone: string): boolean {
  return /^01\d{9}$/.test(phone.trim());
}

export function isEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validate(fields: Record<string, string>): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const [k, v] of Object.entries(fields)) if (!required(v)) errors[k] = 'هذا الحقل مطلوب';
  return errors;
}
