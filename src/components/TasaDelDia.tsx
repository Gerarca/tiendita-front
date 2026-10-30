'use client';

import { useQuery } from '@tanstack/react-query';
import { api, ErrorApi } from '@/lib/api';
import { fmtBs, fmtDiaCorto } from '@/lib/formato';
import type { TasaVigente } from '@/lib/tipos';

export function useTasaVigente() {
  return useQuery({
    queryKey: ['tasa-vigente'],
    queryFn: () => api<TasaVigente>('/tasas/vigente'),
    refetchInterval: 30 * 60_000, // la tasa automática puede llegar durante el día
  });
}

/** Indicador del dólar del día en el encabezado. Avisa si la tasa no es de hoy. */
export function TasaDelDia() {
  const { data: tasa, error, isLoading } = useTasaVigente();

  if (isLoading) return <span className="text-sm text-cafe">Dólar del día…</span>;

  if (error || !tasa) {
    const sinTasa = error instanceof ErrorApi && error.estado === 404;
    return (
      <span className="rounded bg-ladrillo px-2 py-0.5 text-sm font-semibold text-white">
        {sinTasa ? 'Sin tasa registrada: no se puede vender' : 'No se pudo leer la tasa'}
      </span>
    );
  }

  const aviso = !tasa.validaParaVender
    ? 'Tasa vencida: registra la de hoy para vender'
    : !tasa.esDeHoy
      ? `Tasa del ${fmtDiaCorto(tasa.fecha)}`
      : null;

  return (
    <span className="flex items-baseline gap-2 text-sm">
      <span className="text-cafe-oscuro">Dólar del día</span>
      <strong className="text-base tabular-nums text-tinta">{fmtBs(tasa.bsPorUsd)}</strong>
      <span className="text-xs text-cafe">{tasa.fuente === 'BCV' ? 'BCV' : 'manual'}</span>
      {aviso && (
        <span className={`rounded px-1.5 text-xs font-semibold ${tasa.validaParaVender ? 'bg-durazno text-cafe-oscuro' : 'bg-ladrillo text-white'}`}>
          {aviso}
        </span>
      )}
    </span>
  );
}
