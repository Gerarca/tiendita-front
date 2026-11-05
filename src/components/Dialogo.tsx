'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Ventana modal con <dialog> nativo: el navegador se encarga de atrapar el
 * foco y de cerrar con Escape.
 */
export function Dialogo({
  abierto,
  titulo,
  alCerrar,
  children,
  amplio = false,
}: {
  abierto: boolean;
  titulo: string;
  alCerrar: () => void;
  children: ReactNode;
  /** Para contenido con tablas (detalle de factura). */
  amplio?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (abierto && !d.open) {
      d.showModal();
      // El navegador enfoca el primer elemento (la × de cerrar). Se corrige:
      // primero el elemento marcado como principal, si no, el primer campo.
      requestAnimationFrame(() => {
        d.querySelector<HTMLElement>('[data-autofocus], input:not([disabled]):not([type=hidden]):not([type=file]), select, textarea')?.focus();
      });
    }
    if (!abierto && d.open) d.close();
  }, [abierto]);

  return (
    <dialog
      ref={ref}
      onClose={alCerrar}
      className={`m-auto ${amplio ? 'w-[min(56rem,calc(100%-2rem))]' : 'w-[min(34rem,calc(100%-2rem))]'} rounded-lg border-2 border-cafe bg-white p-0 text-tinta backdrop:bg-tinta/40`}
    >
      <div className="max-h-[85vh] overflow-y-auto p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="font-mano text-3xl uppercase tracking-wide text-cafe-oscuro">{titulo}</h2>
          <button onClick={alCerrar} aria-label="Cerrar" className="rounded px-2 text-2xl leading-none text-cafe hover:bg-durazno-claro">
            ×
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
