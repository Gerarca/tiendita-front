const numero = (decimales: number) =>
  new Intl.NumberFormat('es-VE', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });

const dos = numero(2);

/** "2.6" → "2,60 $" */
export const fmtUsd = (v: string | number) => `${dos.format(Number(v))}\u00A0$`;

/** "2311.11" → "2.311,11 Bs" */
export const fmtBs = (v: string | number) => `${dos.format(Number(v))}\u00A0Bs`;

/** Precio en Bs solo para mostrar; el cálculo oficial lo hace el servidor al cotizar. */
export const aproxBs = (usd: string, tasa: string) => fmtBs(Math.round(Number(usd) * Number(tasa) * 100) / 100);

/** "2026-10-29" → "29/10" */
export const fmtDiaCorto = (fecha: string) => `${fecha.slice(8, 10)}/${fecha.slice(5, 7)}`;

const fechaHora = new Intl.DateTimeFormat('es-VE', {
  timeZone: 'America/Caracas',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});

/** ISO del servidor → "29/10/2026, 04:30 p. m." en hora de Venezuela */
export const fmtFechaHora = (iso: string) => fechaHora.format(new Date(iso));

/** Fecha de hoy en Venezuela: "29/10/2026" */
export const hoyVenezuela = () =>
  new Intl.DateTimeFormat('es-VE', { timeZone: 'America/Caracas', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date());

/**
 * Interpreta un monto escrito por el usuario. Acepta coma o punto decimal
 * ("2,80" o "2.80") y máximo 2 decimales. Devuelve null si no es válido.
 */
export function leerMonto(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(limpio)) return null;
  const n = Number(limpio);
  return n > 0 ? n : null;
}

/** Entero positivo o null. */
export function leerEntero(texto: string): number | null {
  const t = texto.trim();
  if (!/^\d+$/.test(t)) return null;
  const n = Number(t);
  return n >= 1 ? n : null;
}

/** Fecha de hoy en Venezuela en formato de la API: "2026-10-29" */
export const hoyIso = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

const hora = new Intl.DateTimeFormat('es-VE', { timeZone: 'America/Caracas', hour: '2-digit', minute: '2-digit', hour12: true });
/** ISO → "04:30 p. m." */
export const fmtHora = (iso: string) => hora.format(new Date(iso));

export const NOMBRE_METODO = {
  TARJETA: 'Tarjeta',
  PAGO_MOVIL: 'Pago móvil',
  TRANSFERENCIA: 'Transferencia',
  EFECTIVO_BS: 'Efectivo Bs',
  EFECTIVO_USD: 'Efectivo $',
  MIXTA: 'Mixta',
} as const;

/** Primer día del mes en curso en Venezuela: "2026-10-01" */
export const inicioMesIso = () => `${hoyIso().slice(0, 8)}01`;

/** Suma precio × cantidad en centavos para no acumular errores de decimales. Solo para mostrar. */
export function valorUsd(lineas: { precioUsd: string; cantidad: number }[]): number {
  const centavos = lineas.reduce((s, l) => s + Math.round(Number(l.precioUsd) * 100) * l.cantidad, 0);
  return centavos / 100;
}
