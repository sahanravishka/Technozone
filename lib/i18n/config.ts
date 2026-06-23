export const locales = ['en', 'si', 'ta'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';
export const localeNames: Record<Locale, string> = { en: 'EN', si: 'සිං', ta: 'த' };
