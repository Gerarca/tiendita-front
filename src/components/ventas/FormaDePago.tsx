'use client';

import { fmtBs, fmtUsd, leerMonto, NOMBRE_METODO } from '@/lib/formato';
import type { Cotizacion, CuentaBancaria, MetodoPago } from '@/lib/tipos';

export interface PagoForm {
  id: number;
  metodo: MetodoPago;
  monto: string;
  cuentaId: number | null;
  referencia: string;
}

export type ModoPago = MetodoPago | 'MIXTA';

const METODOS: MetodoPago[] = ['TARJETA', 'PAGO_MOVIL', 'TRANSFERENCIA', 'EFECTIVO_BS', 'EFECTIVO_USD'];
export const esEfectivo = (m: MetodoPago) => m === 'EFECTIVO_BS' || m === 'EFECTIVO_USD';
const moneda = (m: MetodoPago) => (m === 'EFECTIVO_USD' ? '$' : 'Bs');

/** Monto en la moneda del método, a 2 decimales, sin redondear hacia abajo lo que falta. */
export function montoRestante(cot: Cotizacion | undefined, metodo: MetodoPago): string {
  if (!cot) return '';
  const faltaBs = cot.pago ? -Number(cot.pago.diferenciaBs) : Number(cot.totalBs);
  if (faltaBs <= 0) return '';
  const valor = metodo === 'EFECTIVO_USD' ? Math.ceil((faltaBs / Number(cot.tasa)) * 100) / 100 : faltaBs;
  return valor.toFixed(2).replace('.', ',');
}

/** Mensaje del estado del pago, con montos en formato venezolano. */
function mensajePago(pago: NonNullable<Cotizacion['pago']>): string {
  const dif = Number(pago.diferenciaBs);
  const difUsd = Number(pago.diferenciaUsd);
  if (pago.estado === 'INCOMPLETO') return `Faltan ${fmtBs(-dif)} (${fmtUsd(-difUsd)})`;
  if (pago.estado === 'EXCEDIDO') {
    return `El pago supera el total por ${fmtBs(dif)}. Registra solo lo que queda en caja (descuenta el vuelto) o revisa si hay un error de tipeo.`;
  }
  return `Pago completo: ${fmtBs(pago.pagadoBs)} (${fmtUsd(pago.pagadoUsd)})` + (dif > 0 ? `, sobran ${fmtBs(dif)}` : '');
}

const boton = (activo: boolean) =>
  `rounded border-2 px-3 py-2 font-mano text-xl uppercase leading-tight ${
    activo ? 'border-cafe-oscuro bg-cafe-oscuro text-white' : 'border-cafe/60 text-tinta hover:bg-durazno-claro'
  }`;

/** Sección "FORMA DE PAGO" del boceto, con cobro mixto y datos de cada pago. */
export function FormaDePago({
  modo,
  pagos,
  cuentas,
  cotizacion,
  alElegirModo,
  alCambiarPago,
  alAgregarPago,
  alQuitarPago,
}: {
  modo: ModoPago | null;
  pagos: PagoForm[];
  cuentas: CuentaBancaria[];
  cotizacion: Cotizacion | undefined;
  alElegirModo: (m: ModoPago) => void;
  alCambiarPago: (id: number, cambios: Partial<PagoForm>) => void;
  alAgregarPago: () => void;
  alQuitarPago: (id: number) => void;
}) {
  return (
    <section aria-labelledby="titulo-pago" className="mt-6 border-t-2 border-cafe pt-4">
      <h2 id="titulo-pago" className="mb-3 text-center font-mano text-2xl uppercase tracking-wide text-cafe-oscuro">
        Forma de pago
      </h2>

      <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
        {METODOS.map((m) => (
          <button key={m} type="button" onClick={() => alElegirModo(m)} aria-pressed={modo === m} className={boton(modo === m)}>
            {NOMBRE_METODO[m]}
          </button>
        ))}
        <button type="button" onClick={() => alElegirModo('MIXTA')} aria-pressed={modo === 'MIXTA'} className={boton(modo === 'MIXTA')}>
          Mixta
        </button>
      </div>

      {modo && (
        <div className="mt-4 space-y-2">
          {pagos.map((p) => {
            const invalido = p.monto.trim() !== '' && leerMonto(p.monto) === null;
            const sugerido = montoRestante(cotizacion, p.metodo);
            return (
              <div key={p.id} className="flex flex-wrap items-center gap-3 rounded bg-durazno-claro/60 px-3 py-2">
                {modo === 'MIXTA' ? (
                  <select
                    aria-label="Forma de pago"
                    value={p.metodo}
                    onChange={(e) => {
                      const metodo = e.target.value as MetodoPago;
                      alCambiarPago(p.id, { metodo, cuentaId: esEfectivo(metodo) ? null : (p.cuentaId ?? cuentas[0]?.id ?? null) });
                    }}
                    className="rounded border border-cafe/50 bg-white px-2 py-1"
                  >
                    {METODOS.map((m) => (
                      <option key={m} value={m}>
                        {NOMBRE_METODO[m]}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="w-32 font-semibold">{NOMBRE_METODO[p.metodo]}</span>
                )}

                <label className="flex items-center gap-1">
                  <span className="text-sm text-cafe-oscuro">Monto</span>
                  <input
                    value={p.monto}
                    onChange={(e) => alCambiarPago(p.id, { monto: e.target.value })}
                    inputMode="decimal"
                    aria-invalid={invalido || undefined}
                    className={`w-32 rounded border bg-white px-2 py-1 text-right tabular-nums ${invalido ? 'border-ladrillo' : 'border-cafe/50'}`}
                  />
                  <span className="w-5 text-sm">{moneda(p.metodo)}</span>
                </label>
                {modo === 'MIXTA' && sugerido && !p.monto.trim() && (
                  <button type="button" onClick={() => alCambiarPago(p.id, { monto: sugerido })} className="text-xs text-cafe underline">
                    Completar ({sugerido} {moneda(p.metodo)})
                  </button>
                )}

                {!esEfectivo(p.metodo) && (
                  <>
                    <select
                      aria-label="Cuenta bancaria"
                      value={p.cuentaId ?? ''}
                      onChange={(e) => alCambiarPago(p.id, { cuentaId: e.target.value ? Number(e.target.value) : null })}
                      className={`rounded border bg-white px-2 py-1 ${p.cuentaId ? 'border-cafe/50' : 'border-ladrillo'}`}
                    >
                      <option value="">Cuenta…</option>
                      {cuentas.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                    <input
                      value={p.referencia}
                      onChange={(e) => alCambiarPago(p.id, { referencia: e.target.value })}
                      placeholder="Referencia"
                      aria-label="Número de referencia"
                      className="w-32 rounded border border-cafe/50 bg-white px-2 py-1"
                    />
                  </>
                )}

                {modo === 'MIXTA' && pagos.length > 1 && (
                  <button type="button" onClick={() => alQuitarPago(p.id)} aria-label="Quitar este pago" className="ml-auto px-2 text-lg text-ladrillo">
                    ×
                  </button>
                )}
              </div>
            );
          })}

          {modo === 'MIXTA' && (
            <button type="button" onClick={alAgregarPago} className="text-sm text-cafe-oscuro underline">
              + Agregar otra forma de pago
            </button>
          )}

          {cotizacion?.pago && (
            <p
              role="status"
              className={`rounded px-3 py-2 text-sm font-semibold ${
                cotizacion.pago.estado === 'COMPLETO' ? 'bg-salvia/10 text-salvia' : 'bg-ladrillo/10 text-ladrillo'
              }`}
            >
              {mensajePago(cotizacion.pago)}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
