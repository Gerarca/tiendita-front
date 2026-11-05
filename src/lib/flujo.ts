import type { KeyboardEvent } from 'react';

/**
 * Recorrido con Enter: los campos llevan data-flujo="<orden>" y Enter pasa
 * al siguiente con mayor orden que esté visible y habilitado. Así se saltan
 * solos los campos que no aplican (p. ej. la cuenta en un pago en efectivo).
 */
export function enfocarSiguiente(desde: HTMLElement) {
  const actual = Number(desde.dataset.flujo);
  // Dentro de una ventana (modal) se recorren solo sus campos
  const raiz: ParentNode = desde.closest('dialog') ?? document;
  const candidatos = [...raiz.querySelectorAll<HTMLElement>('[data-flujo]')]
    .filter((el) => !(el as HTMLInputElement).disabled && esVisible(el) && Number(el.dataset.flujo) > actual)
    .sort((a, b) => Number(a.dataset.flujo) - Number(b.dataset.flujo));
  // Si un campo no acepta el foco, se prueba con el siguiente
  for (const el of candidatos) {
    el.focus();
    if (document.activeElement === el) return;
  }
}

/** checkVisibility detecta también lo que está dentro de un <details> plegado. */
function esVisible(el: HTMLElement): boolean {
  const conCheck = el as HTMLElement & { checkVisibility?: () => boolean };
  return typeof conCheck.checkVisibility === 'function' ? conCheck.checkVisibility() : el.offsetParent !== null;
}

/** onKeyDown para campos simples: Enter = siguiente campo. */
export function alEnter(e: KeyboardEvent<HTMLElement>) {
  if (e.key === 'Enter') {
    e.preventDefault();
    enfocarSiguiente(e.currentTarget);
  }
}

/**
 * Enfoca un elemento un instante después: así se aplica luego de que una
 * ventana termine de cerrarse (al cerrarse, el navegador devuelve el foco
 * al botón que la abrió).
 */
export const enfocar = (selector: string) =>
  setTimeout(() => document.querySelector<HTMLElement>(selector)?.focus(), 60);

/** Orden del recorrido en la pantalla de ventas. */
export const FLUJO = {
  documento: 1,
  nombre: 2,
  telefono: 3,
  direccion: 4,
  ciudad: 5,
  estado: 6,
  /** Pagos: 30 + fila × 3 + campo (monto, cuenta, referencia) */
  pago: (fila: number, campo: 0 | 1 | 2) => 30 + fila * 3 + campo,
  registrar: 99,
} as const;

/** Orden del recorrido en los formularios de producto (Nuevo / Existente). */
export const FLUJO_PRODUCTO = {
  codigo: 1,
  nombre: 2,
  cantidad: 3,
  precio: 4,
  voz: 5,
  costo: 6,
  nota: 7,
  guardar: 9,
} as const;
