'use client';

import { useState } from 'react';
import { abrirPdf, descargar, ErrorApi } from '@/lib/api';

/**
 * Factura en PDF de una venta.
 * - imprimir: la abre en una pestaña nueva, lista para imprimir.
 * - descargar: guarda el archivo con su nombre (venta-20260456.pdf).
 */
export function BotonFactura({
  ventaId,
  numeroControl,
  texto = 'Imprimir factura',
  className,
  modo = 'imprimir',
}: {
  ventaId: number;
  numeroControl: string;
  texto?: string;
  className?: string;
  modo?: 'imprimir' | 'descargar';
}) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function abrir() {
    setCargando(true);
    setError(null);
    try {
      const ruta = `/ventas/${ventaId}/factura`;
      const nombre = `venta-${numeroControl}.pdf`;
      await (modo === 'imprimir' ? abrirPdf(ruta, nombre) : descargar(ruta, nombre));
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo abrir la factura');
    } finally {
      setCargando(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-end">
      <button type="button" onClick={abrir} disabled={cargando} className={className}>
        {cargando ? (modo === 'imprimir' ? 'Abriendo…' : 'Descargando…') : texto}
      </button>
      {error && <span role="alert" className="mt-1 text-xs text-ladrillo">{error}</span>}
    </span>
  );
}
