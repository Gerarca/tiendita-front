'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Dialogo } from '@/components/Dialogo';
import { api, descargar, ErrorApi } from '@/lib/api';
import { hoyIso } from '@/lib/formato';
import type { CuentaBancaria } from '@/lib/tipos';

interface Reporte {
  id: string;
  texto: string;
  ruta?: string;
  conCuenta?: boolean;
}

/** Los de los bocetos, más "Pagos por cuenta" (reemplaza la hoja "Provincial Jurídico"). */
const REPORTES: Reporte[] = [
  { id: 'inventario', texto: 'Inventario', ruta: '/reportes/inventario' },
  { id: 'ventas', texto: 'Registro de ventas', ruta: '/reportes/ventas' },
  { id: 'regalos', texto: 'Control de regalos', ruta: '/reportes/regalos' },
  { id: 'pagos', texto: 'Pagos por cuenta', ruta: '/reportes/pagos', conCuenta: true },
  { id: 'traspasos', texto: 'Detalles de traspasos' }, // pendiente de definir
];

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const TRIMESTRES = ['1er trimestre (ene a mar)', '2do trimestre (abr a jun)', '3er trimestre (jul a sep)', '4to trimestre (oct a dic)'];

const etiqueta = 'font-mano text-xl uppercase text-cafe-oscuro';
const selector = 'w-full rounded border border-cafe/50 bg-white px-2 py-1.5';

/** Barra "DESCARGAR" del boceto 2 con la ventana de período del boceto 3. */
export function BarraDescargas() {
  const [abierto, setAbierto] = useState<Reporte | null>(null);

  return (
    <section aria-labelledby="titulo-descargas" className="mx-auto mb-10 max-w-6xl px-4">
      <div className="bg-white px-6 pb-5">
        <div className="flex items-center gap-4 pt-1">
          <span className="h-0.5 flex-1 bg-cafe" />
          <h2 id="titulo-descargas" className="font-mano text-2xl uppercase tracking-wide text-tinta">
            Descargar
          </h2>
          <span className="h-0.5 flex-1 bg-cafe" />
        </div>
        <ul className="mt-3 flex justify-between gap-2">
          {REPORTES.map((r) => (
            <li key={r.id} className="flex-1">
              <button
                onClick={() => setAbierto(r)}
                disabled={!r.ruta}
                title={r.ruta ? `Descargar ${r.texto.toLowerCase()}` : 'Pendiente: la tienda aún no define los traspasos'}
                className="w-full rounded px-2 py-2 font-mano text-xl uppercase leading-tight text-tinta hover:bg-durazno-claro disabled:cursor-not-allowed disabled:text-tinta/30 disabled:hover:bg-transparent"
              >
                {r.texto}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <Dialogo abierto={abierto !== null} titulo={abierto?.texto ?? ''} alCerrar={() => setAbierto(null)}>
        {abierto && <VentanaPeriodo reporte={abierto} alCerrar={() => setAbierto(null)} />}
      </Dialogo>
    </section>
  );
}

function VentanaPeriodo({ reporte, alCerrar }: { reporte: Reporte; alCerrar: () => void }) {
  const hoy = hoyIso();
  const anioActual = Number(hoy.slice(0, 4));
  const [anio, setAnio] = useState(anioActual);
  const [mes, setMes] = useState<number | ''>(Number(hoy.slice(5, 7)));
  const [trimestre, setTrimestre] = useState<number | ''>('');
  const [cuentaId, setCuentaId] = useState<number | ''>('');
  const [descargando, setDescargando] = useState<'pdf' | 'xlsx' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cuentas = useQuery({
    queryKey: ['cuentas'],
    queryFn: () => api<CuentaBancaria[]>('/cuentas-bancarias'),
    enabled: Boolean(reporte.conCuenta),
  });

  // Del año actual hacia atrás: el sistema guarda los registros por años
  const anios = Array.from({ length: 6 }, (_, i) => anioActual - i);
  const descripcion = mes ? `${MESES[mes - 1]} ${anio}` : trimestre ? `${TRIMESTRES[trimestre - 1]} de ${anio}` : `Todo el año ${anio}`;
  const sufijo = mes ? `${anio}-${String(mes).padStart(2, '0')}` : trimestre ? `${anio}-T${trimestre}` : `${anio}`;

  async function bajar(formato: 'pdf' | 'xlsx') {
    if (!reporte.ruta) return;
    setDescargando(formato);
    setError(null);
    const q = new URLSearchParams({ anio: String(anio), formato });
    if (mes) q.set('mes', String(mes));
    if (trimestre) q.set('trimestre', String(trimestre));
    if (reporte.conCuenta && cuentaId) q.set('cuentaId', String(cuentaId));
    try {
      await descargar(`${reporte.ruta}?${q}`, `${reporte.id}-${sufijo}.${formato}`);
      alCerrar();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo descargar el reporte');
    } finally {
      setDescargando(null);
    }
  }

  return (
    <div>
      <div className="grid grid-cols-[8rem_1fr] items-center gap-x-3 gap-y-3">
        <label htmlFor="rep-anio" className={etiqueta}>Año:</label>
        <select id="rep-anio" value={anio} onChange={(e) => setAnio(Number(e.target.value))} className={selector}>
          {anios.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>

        <label htmlFor="rep-mes" className={etiqueta}>Mes:</label>
        <select
          id="rep-mes"
          value={mes}
          onChange={(e) => {
            setMes(e.target.value ? Number(e.target.value) : '');
            if (e.target.value) setTrimestre('');
          }}
          className={selector}
        >
          <option value="">—</option>
          {MESES.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>

        <label htmlFor="rep-tri" className={etiqueta}>Trimestre:</label>
        <select
          id="rep-tri"
          value={trimestre}
          onChange={(e) => {
            setTrimestre(e.target.value ? Number(e.target.value) : '');
            if (e.target.value) setMes('');
          }}
          className={selector}
        >
          <option value="">—</option>
          {TRIMESTRES.map((t, i) => (
            <option key={t} value={i + 1}>
              {t}
            </option>
          ))}
        </select>

        {reporte.conCuenta && (
          <>
            <label htmlFor="rep-cta" className={etiqueta}>Cuenta:</label>
            <select id="rep-cta" value={cuentaId} onChange={(e) => setCuentaId(e.target.value ? Number(e.target.value) : '')} className={selector}>
              <option value="">Todas las formas de pago</option>
              {cuentas.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      <p className="mt-4 rounded bg-durazno-claro px-3 py-2 text-sm text-cafe-oscuro">
        Período: <strong>{descripcion}</strong>. Sin mes ni trimestre se descarga el año completo.
      </p>

      {error && <p role="alert" className="mt-3 text-sm font-semibold text-ladrillo">{error}</p>}

      <div className="mt-5 flex justify-end gap-3">
        <button
          onClick={() => bajar('pdf')}
          disabled={descargando !== null}
          className="rounded border-2 border-ladrillo px-5 py-1.5 font-mano text-xl uppercase text-ladrillo hover:bg-ladrillo/10 disabled:opacity-50"
        >
          {descargando === 'pdf' ? 'Generando…' : 'PDF'}
        </button>
        <button
          onClick={() => bajar('xlsx')}
          disabled={descargando !== null}
          className="rounded border-2 border-salvia px-5 py-1.5 font-mano text-xl uppercase text-salvia hover:bg-salvia/10 disabled:opacity-50"
        >
          {descargando === 'xlsx' ? 'Generando…' : 'Excel'}
        </button>
      </div>
    </div>
  );
}
