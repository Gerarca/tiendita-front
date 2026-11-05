'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { api, ErrorApi } from '@/lib/api';
import { alEnter } from '@/lib/flujo';
import { fmtBs, fmtDiaCorto, fmtFechaHora, hoyIso } from '@/lib/formato';
import type { ResultadoBcv, TasaRegistro } from '@/lib/tipos';

/** "889,58" o "889.5812" → número (máx. 4 decimales). */
function leerTasa(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,4})?$/.test(limpio)) return null;
  const n = Number(limpio);
  return n > 0 ? n : null;
}

/** Tasa ya registrada para una fecha, o null si no existe. */
async function tasaDeFecha(fecha: string): Promise<TasaRegistro | null> {
  try {
    return await api<TasaRegistro>(`/tasas/${fecha}`);
  } catch (e) {
    if (e instanceof ErrorApi && e.estado === 404) return null;
    throw e;
  }
}

/**
 * Registro manual del dólar del día, para cuando la tasa automática del BCV
 * no llega (sin internet, página del BCV caída...).
 *  - Vendedor: solo la de hoy y solo si todavía no existe.
 *  - Administrador: cualquier día hasta hoy, y puede corregir una existente
 *    (queda en auditoría). Las ventas ya hechas conservan su propia tasa.
 */
export function DialogoTasa({ esAdmin, alTerminar }: { esAdmin: boolean; alTerminar: (mensaje: string) => void }) {
  const clienteQuery = useQueryClient();
  const hoy = hoyIso();
  const [fecha, setFecha] = useState(hoy);
  const [valor, setValor] = useState('');
  const [fuente, setFuente] = useState<'BCV' | 'MANUAL'>('BCV');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [bcv, setBcv] = useState<{ cargando: boolean; texto: string | null; ok: boolean }>({ cargando: false, texto: null, ok: false });

  const existente = useQuery({ queryKey: ['tasas', 'fecha', fecha], queryFn: () => tasaDeFecha(fecha), enabled: Boolean(fecha) });
  const historial = useQuery({ queryKey: ['tasas', 'historial'], queryFn: () => api<TasaRegistro[]>('/tasas') });

  const yaExiste = existente.data ?? null;
  const bloqueadoVendedor = !esAdmin && yaExiste !== null;

  async function refrescar() {
    await Promise.all([
      clienteQuery.invalidateQueries({ queryKey: ['tasa-vigente'] }),
      clienteQuery.invalidateQueries({ queryKey: ['tasas'] }),
      clienteQuery.invalidateQueries({ queryKey: ['cotizar'] }),
    ]);
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const n = leerTasa(valor);
    if (n === null) return setError('Escribe los bolívares por dólar, con máximo 4 decimales (ej. 889,58)');
    if (fecha > hoy) return setError('No se puede registrar una tasa con fecha futura');

    setEnviando(true);
    try {
      const r = await api<{ accion: 'CREADA' | 'ACTUALIZADA' | 'SIN_CAMBIOS'; tasa: TasaRegistro }>('/tasas', {
        method: 'POST',
        json: { fecha, bsPorUsd: n, fuente },
      });
      await refrescar();
      const dia = fecha === hoy ? 'de hoy' : `del ${fmtDiaCorto(fecha)}`;
      alTerminar(
        r.accion === 'SIN_CAMBIOS'
          ? `La tasa ${dia} ya era ${fmtBs(r.tasa.bsPorUsd)}; no hubo cambios.`
          : `Tasa ${dia} ${r.accion === 'CREADA' ? 'registrada' : 'corregida'}: ${fmtBs(r.tasa.bsPorUsd)} por dólar.`,
      );
    } catch (err) {
      setError(err instanceof ErrorApi ? err.message : 'No se pudo registrar la tasa');
    } finally {
      setEnviando(false);
    }
  }

  /** Reintenta la tasa automática del BCV (solo admin). */
  async function traerDelBcv() {
    setBcv({ cargando: true, texto: null, ok: false });
    try {
      const r = await api<ResultadoBcv>('/tasas/bcv/sincronizar', { method: 'POST' });
      await refrescar();
      const textos: Record<ResultadoBcv['estado'], string> = {
        REGISTRADA: 'estado' in r && r.estado === 'REGISTRADA' ? `Listo: se registró la tasa del BCV ${fmtBs(r.bsPorUsd)} (fecha valor ${fmtDiaCorto(r.fecha)}).` : '',
        YA_EXISTE: 'estado' in r && r.estado === 'YA_EXISTE' ? `Ya estaba registrada la tasa del ${fmtDiaCorto(r.fecha)}: ${fmtBs(r.bsPorUsd)} (${r.fuente === 'BCV' ? 'BCV' : 'manual'}).` : '',
        ERROR: 'mensaje' in r ? `No se pudo obtener la tasa del BCV: ${r.mensaje}. Regístrala a mano.` : '',
        RECHAZADA: 'mensaje' in r ? `${r.mensaje}` : '',
        DESACTIVADA: 'La tasa automática del BCV está desactivada en el servidor (BCV_AUTO).',
        EN_CURSO: 'Ya hay una consulta al BCV en curso; espera unos segundos.',
      };
      setBcv({ cargando: false, texto: textos[r.estado], ok: r.estado === 'REGISTRADA' || r.estado === 'YA_EXISTE' });
    } catch (err) {
      setBcv({ cargando: false, texto: err instanceof ErrorApi ? err.message : 'No se pudo consultar el BCV', ok: false });
    }
  }

  const etiqueta = 'font-mano text-xl uppercase text-cafe-oscuro';
  const campo = 'w-full border-b-2 border-cafe/40 bg-transparent px-1 py-1 outline-none focus:border-cafe';

  return (
    <div>
      <p className="mb-4 text-sm text-cafe">
        Úsalo cuando la tasa del BCV no se descargue sola (sin internet u otro problema). Las ventas ya hechas conservan la tasa con
        la que se cobraron.
      </p>

      <form onSubmit={guardar} noValidate>
        <div className="mb-3 grid grid-cols-[9rem_1fr] items-center gap-2">
          <label htmlFor="tasa-fecha" className={etiqueta}>Fecha:</label>
          <input
            id="tasa-fecha"
            type="date"
            value={fecha}
            max={hoy}
            disabled={!esAdmin}
            onChange={(e) => setFecha(e.target.value)}
            onKeyDown={alEnter}
            data-flujo={1}
            className={`${campo} disabled:border-transparent`}
          />
        </div>

        {existente.isLoading ? (
          <p className="mb-3 pl-[9.5rem] text-sm text-cafe">Revisando…</p>
        ) : yaExiste ? (
          <p className={`mb-3 rounded px-3 py-2 text-sm ${bloqueadoVendedor ? 'bg-durazno-claro text-cafe-oscuro' : 'bg-durazno-claro/60 text-cafe-oscuro'}`}>
            Ya hay una tasa para esta fecha: <strong>{fmtBs(yaExiste.bsPorUsd)}</strong> ({yaExiste.fuente === 'BCV' ? 'BCV' : 'manual'}
            {yaExiste.registradaPor ? `, registró ${yaExiste.registradaPor}` : ''}).{' '}
            {bloqueadoVendedor ? 'Solo un administrador puede corregirla.' : 'Si guardas, se corregirá y quedará en la auditoría.'}
          </p>
        ) : (
          <p className="mb-3 rounded bg-salvia/10 px-3 py-2 text-sm text-salvia">Todavía no hay tasa para esta fecha.</p>
        )}

        <div className="mb-3 grid grid-cols-[9rem_1fr] items-center gap-2">
          <label htmlFor="tasa-valor" className={etiqueta}>Bs por $:</label>
          <input
            id="tasa-valor"
            inputMode="decimal"
            value={valor}
            onChange={(e) => {
              setValor(e.target.value);
              setError(null);
            }}
            onKeyDown={alEnter}
            data-flujo={2}
            disabled={bloqueadoVendedor}
            placeholder="Ej. 889,58"
            className={`${campo} text-lg tabular-nums`}
            autoComplete="off"
          />
        </div>

        <fieldset className="mb-3 grid grid-cols-[9rem_1fr] items-center gap-2" disabled={bloqueadoVendedor}>
          <legend className="sr-only">Origen de la tasa</legend>
          <span className={etiqueta}>Origen:</span>
          <span className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-1.5">
              <input type="radio" name="fuente" checked={fuente === 'BCV'} onChange={() => setFuente('BCV')} />
              Copiada del BCV
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" name="fuente" checked={fuente === 'MANUAL'} onChange={() => setFuente('MANUAL')} />
              Otra
            </label>
          </span>
        </fieldset>

        {error && <p role="alert" className="mt-2 text-sm font-semibold text-ladrillo">{error}</p>}

        <div className="mt-5 flex items-center justify-between gap-3">
          {esAdmin ? (
            <button
              type="button"
              onClick={traerDelBcv}
              disabled={bcv.cargando}
              className="rounded border-2 border-cafe/60 px-3 py-1.5 text-sm text-cafe-oscuro hover:bg-durazno-claro disabled:opacity-50"
            >
              {bcv.cargando ? 'Consultando al BCV…' : 'Traer del BCV ahora'}
            </button>
          ) : (
            <span />
          )}
          <button
            type="submit"
            data-flujo={3}
            disabled={enviando || bloqueadoVendedor}
            className="rounded bg-cafe-oscuro px-5 py-1.5 font-mano text-xl uppercase text-white hover:bg-cafe disabled:opacity-50"
          >
            {enviando ? 'Guardando…' : yaExiste && esAdmin ? 'Corregir tasa' : 'Registrar tasa'}
          </button>
        </div>
        {bcv.texto && (
          <p role="status" className={`mt-3 rounded px-3 py-2 text-sm ${bcv.ok ? 'bg-salvia/10 text-salvia' : 'bg-ladrillo/10 text-ladrillo'}`}>
            {bcv.texto}
          </p>
        )}
      </form>

      {historial.data && historial.data.length > 0 && (
        <details className="mt-5 text-sm">
          <summary className="cursor-pointer text-cafe">Últimas tasas registradas</summary>
          <table className="mt-2 w-full">
            <thead className="border-b border-cafe text-left text-cafe-oscuro">
              <tr>
                <th className="py-1 pr-2 font-semibold">Fecha</th>
                <th className="py-1 pr-2 text-right font-semibold">Bs por $</th>
                <th className="py-1 pr-2 font-semibold">Origen</th>
                <th className="py-1 font-semibold">Registró</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cafe/20">
              {historial.data.slice(0, 7).map((t) => (
                <tr key={t.fecha}>
                  <td className="py-1 pr-2 tabular-nums">{fmtDiaCorto(t.fecha)}/{t.fecha.slice(0, 4)}</td>
                  <td className="py-1 pr-2 text-right tabular-nums">{fmtBs(t.bsPorUsd)}</td>
                  <td className="py-1 pr-2">{t.fuente === 'BCV' ? 'BCV' : 'Manual'}</td>
                  <td className="py-1" title={fmtFechaHora(t.creadoEn)}>{t.registradaPor ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </div>
  );
}
