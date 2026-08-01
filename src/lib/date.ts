export const HOTEL_TIMEZONE = 'Europe/Madrid';

/** Fecha de "hoy" (YYYY-MM-DD) según la hora del hotel, no la del servidor/navegador. */
export function todayISOInHotelTimezone(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: HOTEL_TIMEZONE });
}
