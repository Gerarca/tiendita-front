'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Dialogo } from '@/components/Dialogo';
import { RegalosDelMes } from '@/components/regalos/RegalosDelMes';
import { TablaRegalo, type LineaRegalo } from '@/components/regalos/TablaRegalo';
import { AgregarProducto } from '@/components/ventas/AgregarProducto';
import { api, ErrorApi } from '@/lib/api';
import { fmtUsd, valorUsd } from '@/lib/formato';
import { useSesion } from '@/lib/sesion';
import type { Producto, Regalo } from '@/lib/tipos';

const etiqueta = 'font-mano text-xl uppercase text-cafe-oscuro';
const campo = 'w-full border-b-2 border-cafe/40 bg-transparent px-1 py-0.5 outline-none focus:border-cafe';

export default function PaginaRegalos() {
  const { usuario } = useSesion();
  const esAdmin = usuario?.rol === 'ADMIN';
  const clienteQuery = useQueryClient();
  const refCodigo = useRef<HTMLInputElement>(null);

  const [beneficiario, setBeneficiario] = useState('');
  const [motivo, setMotivo] = useState('');
  const [autorizadoPor, setAutorizadoPor] = useState('');
  const [lineas, setLineas] = useState<LineaRegalo[]>([]);
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      if (e.key === 'F2') {
        e.preventDefault();
        refCodigo.current?.focus();
      }
    }
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, []);

  function agregar(producto: Producto, cantidad: number) {
    setMensaje(null);
    setLineas((ls) => {
      const existe = ls.find((l) => l.producto.id === producto.id);
      return existe
        ? ls.map((l) => (l.producto.id === producto.id ? { ...l, cantidad: l.cantidad + cantidad } : l))
        : [...ls, { producto, cantidad }];
    });
  }

  const pendientes: string[] = [];
  if (beneficiario.trim().length < 2) pendientes.push('indica quién recibe el regalo');
  if (motivo.trim().length < 3) pendientes.push('escribe el motivo');
  if (lineas.length === 0) pendientes.push('agrega al menos un producto');
  if (lineas.some((l) => l.cantidad > l.producto.stock)) pendientes.push('hay productos sin existencia suficiente');

  const total = valorUsd(lineas.map((l) => ({ precioUsd: l.producto.precioUsd, cantidad: l.cantidad })));

  function limpiar() {
    setBeneficiario('');
    setMotivo('');
    setAutorizadoPor('');
    setLineas([]);
    setError(null);
  }

  async function registrar() {
    setEnviando(true);
    setError(null);
    try {
      const r = await api<Regalo>('/regalos', {
        method: 'POST',
        json: {
          beneficiario: beneficiario.trim(),
          motivo: motivo.trim(),
          ...(autorizadoPor.trim() ? { autorizadoPor: autorizadoPor.trim() } : {}),
          detalles: lineas.map((l) => ({ productoId: l.producto.id, cantidad: l.cantidad })),
        },
      });
      setConfirmando(false);
      limpiar();
      setMensaje(`Regalo registrado para ${r.beneficiario}: ${r.unidades} unidad(es) por un valor de ${fmtUsd(r.valorTotalUsd)}.`);
      await Promise.all([
        clienteQuery.invalidateQueries({ queryKey: ['regalos'] }),
        clienteQuery.invalidateQueries({ queryKey: ['productos'] }),
      ]);
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo registrar el regalo');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      {mensaje && (
        <div role="status" className="mb-5 flex items-start justify-between gap-4 rounded border-l-4 border-salvia bg-salvia/10 px-4 py-3">
          <p>{mensaje}</p>
          <button onClick={() => setMensaje(null)} aria-label="Cerrar aviso" className="text-xl leading-none text-salvia">
            ×
          </button>
        </div>
      )}

      {!esAdmin ? (
        <p className="rounded bg-durazno-claro px-4 py-3 text-cafe-oscuro">
          Solo un administrador puede registrar regalos. Aquí puedes consultar los de este mes.
        </p>
      ) : (
        <>
          <fieldset className="grid grid-cols-2 gap-x-10 gap-y-3">
            <legend className="sr-only">Datos del regalo</legend>
            <div className="grid grid-cols-[9rem_1fr] items-center">
              <label htmlFor="reg-ben" className={etiqueta}>Beneficiario:</label>
              <input id="reg-ben" value={beneficiario} onChange={(e) => setBeneficiario(e.target.value)} placeholder="Persona o institución" className={campo} autoComplete="off" />
            </div>
            <div className="grid grid-cols-[9rem_1fr] items-center">
              <label htmlFor="reg-aut" className={etiqueta}>Autorizó:</label>
              <input id="reg-aut" value={autorizadoPor} onChange={(e) => setAutorizadoPor(e.target.value)} placeholder="Opcional" className={campo} autoComplete="off" />
            </div>
            <div className="col-span-2 grid grid-cols-[9rem_1fr] items-center">
              <label htmlFor="reg-mot" className={etiqueta}>Motivo:</label>
              <input id="reg-mot" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej. Donación para la fiesta patronal" className={campo} autoComplete="off" />
            </div>
          </fieldset>

          <div className="mt-6 border-t border-cafe/30 pt-4">
            <AgregarProducto alAgregar={agregar} refCodigo={refCodigo} />
            <TablaRegalo
              lineas={lineas}
              alCambiarCantidad={(id, cantidad) => setLineas((ls) => ls.map((l) => (l.producto.id === id ? { ...l, cantidad } : l)))}
              alQuitar={(id) => setLineas((ls) => ls.filter((l) => l.producto.id !== id))}
            />
          </div>

          <div className="mt-6 flex items-center justify-end gap-4 border-t-2 border-cafe pt-4">
            {pendientes.length > 0 && <p className="mr-auto text-sm text-cafe">Para registrar: {pendientes.join(', ')}.</p>}
            <button type="button" onClick={limpiar} className="rounded border-2 border-cafe/60 px-4 py-2 font-mano text-xl uppercase hover:bg-durazno-claro">
              Limpiar
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setConfirmando(true);
              }}
              disabled={pendientes.length > 0}
              className="rounded bg-cafe-oscuro px-6 py-2 font-mano text-2xl uppercase text-white hover:bg-cafe disabled:cursor-not-allowed disabled:opacity-40"
            >
              Registrar regalo
            </button>
          </div>
          <p className="mt-1 text-right text-xs text-cafe">F2: ir al código</p>
        </>
      )}

      <Dialogo abierto={confirmando} titulo="Confirmar regalo" alCerrar={() => setConfirmando(false)}>
        {confirmando && (
          <div>
            <p className="mb-3">
              Para <strong>{beneficiario.trim()}</strong>
              {autorizadoPor.trim() && <> (autorizó {autorizadoPor.trim()})</>}. Motivo: {motivo.trim()}.
            </p>
            <ul className="mb-3 divide-y divide-cafe/20 rounded border border-cafe/40 text-sm">
              {lineas.map((l) => (
                <li key={l.producto.id} className="flex justify-between gap-3 px-3 py-1.5">
                  <span>
                    <strong>{l.producto.codigo}</strong> <span className="uppercase">{l.producto.nombre}</span>
                  </span>
                  <span className="tabular-nums">×{l.cantidad}</span>
                </li>
              ))}
            </ul>
            <p className="mb-2">
              Valor de referencia: <strong className="tabular-nums">{fmtUsd(total)}</strong>
            </p>
            <p className="rounded bg-durazno-claro px-3 py-2 text-sm text-cafe-oscuro">
              Estos productos saldrán del inventario. Un regalo registrado no se puede anular desde el sistema.
            </p>
            {error && <p role="alert" className="mt-3 text-sm font-semibold text-ladrillo">{error}</p>}
            <div className="mt-5 flex justify-between">
              <button type="button" onClick={() => setConfirmando(false)} className="rounded border-2 border-cafe/60 px-4 py-1.5 font-mano text-xl uppercase hover:bg-durazno-claro">
                Revisar
              </button>
              <button type="button" autoFocus onClick={registrar} disabled={enviando} className="rounded bg-cafe-oscuro px-5 py-1.5 font-mano text-xl uppercase text-white hover:bg-cafe disabled:opacity-60">
                {enviando ? 'Registrando…' : 'Confirmar'}
              </button>
            </div>
          </div>
        )}
      </Dialogo>

      <RegalosDelMes />
    </div>
  );
}
