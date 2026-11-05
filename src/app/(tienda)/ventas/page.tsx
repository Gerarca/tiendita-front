'use client';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Dialogo } from '@/components/Dialogo';
import { useTasaVigente } from '@/components/TasaDelDia';
import { DialogoTasa } from '@/components/tasas/DialogoTasa';
import { BotonFactura } from '@/components/facturas/BotonFactura';
import { AgregarProducto } from '@/components/ventas/AgregarProducto';
import { CLIENTE_VACIO, DatosCliente, type ClienteVenta } from '@/components/ventas/DatosCliente';
import { esEfectivo, FormaDePago, llevaReferencia, type ModoPago, type PagoForm } from '@/components/ventas/FormaDePago';
import { TablaVenta, type LineaVenta } from '@/components/ventas/TablaVenta';
import { VentasDeHoy } from '@/components/ventas/VentasDeHoy';
import { api, ErrorApi } from '@/lib/api';
import { enfocar, FLUJO } from '@/lib/flujo';
import { fmtBs, fmtDiaCorto, fmtUsd, leerMonto, NOMBRE_METODO } from '@/lib/formato';
import { useRetardado } from '@/lib/hooks';
import { useSesion } from '@/lib/sesion';
import type { Cotizacion, CuentaBancaria, Producto, VentaRegistrada } from '@/lib/tipos';

let siguienteId = 1;
const nuevoPago = (metodo: PagoForm['metodo'], cuentaId: number | null, monto = ''): PagoForm => ({
  id: siguienteId++,
  metodo,
  monto,
  cuentaId: esEfectivo(metodo) ? null : cuentaId,
  referencia: '',
});

export default function PaginaVentas() {
  const { usuario } = useSesion();
  const clienteQuery = useQueryClient();
  const refCodigo = useRef<HTMLInputElement>(null);

  const [cliente, setCliente] = useState<ClienteVenta>(CLIENTE_VACIO);
  const [lineas, setLineas] = useState<LineaVenta[]>([]);
  const [modo, setModo] = useState<ModoPago | null>(null);
  const [pagos, setPagos] = useState<PagoForm[]>([]);
  const [montoAuto, setMontoAuto] = useState(true);
  const [registrando, setRegistrando] = useState(false);
  const [errorRegistro, setErrorRegistro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<VentaRegistrada | null>(null);

  // Dólar del día: se muestra desde que se abre la pantalla, antes de cargar productos
  const tasaVigente = useTasaVigente();

  const cuentas = useQuery({
    queryKey: ['cuentas'],
    queryFn: () => api<CuentaBancaria[]>('/cuentas-bancarias'),
  });
  const cuentaPorDefecto = cuentas.data?.[0]?.id ?? null;

  // ---------- Cotización en vivo (misma lógica que el cobro real) ----------
  const detalles = lineas.map((l) => ({ productoId: l.producto.id, cantidad: l.cantidad }));
  const pagosValidos = pagos
    .map((p) => ({ metodo: p.metodo, monto: leerMonto(p.monto), cuentaId: p.cuentaId ?? undefined }))
    .filter((p): p is { metodo: PagoForm['metodo']; monto: number; cuentaId: number | undefined } => p.monto !== null);
  const pagosRetardados = useRetardado(JSON.stringify(pagosValidos), 350);

  const cotizacion = useQuery({
    queryKey: ['cotizar', detalles, pagosRetardados],
    queryFn: () =>
      api<Cotizacion>('/ventas/cotizar', {
        method: 'POST',
        json: { detalles, ...(pagosValidos.length > 0 ? { pagos: JSON.parse(pagosRetardados) } : {}) },
      }),
    enabled: lineas.length > 0,
    placeholderData: keepPreviousData,
    retry: false,
  });
  const cot = lineas.length > 0 ? cotizacion.data : undefined;

  // Con una sola forma de pago, el monto sigue al total mientras no se edite a mano
  useEffect(() => {
    if (!cot || !modo || modo === 'MIXTA' || !montoAuto) return;
    const objetivo = (modo === 'EFECTIVO_USD' ? cot.totalUsd : cot.totalBs).replace('.', ',');
    setPagos((ps) => (ps[0] && ps[0].monto !== objetivo ? [{ ...ps[0], monto: objetivo }] : ps));
  }, [cot?.totalUsd, cot?.totalBs, modo, montoAuto]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Acciones ----------
  function agregarProducto(producto: Producto, cantidad: number) {
    setErrorRegistro(null);
    setLineas((ls) => {
      const existe = ls.find((l) => l.producto.id === producto.id);
      return existe
        ? ls.map((l) => (l.producto.id === producto.id ? { ...l, cantidad: l.cantidad + cantidad } : l))
        : [...ls, { producto, cantidad }];
    });
  }

  function elegirModo(m: ModoPago) {
    enfocar('[data-pago-monto]');
    if (m === modo) return;
    setModo(m);
    setMontoAuto(true);
    setPagos(
      m === 'MIXTA'
        ? [nuevoPago('PAGO_MOVIL', cuentaPorDefecto), nuevoPago('EFECTIVO_BS', null)]
        : [nuevoPago(m, cuentaPorDefecto, cot ? (m === 'EFECTIVO_USD' ? cot.totalUsd : cot.totalBs).replace('.', ',') : '')],
    );
  }

  function cambiarPago(id: number, cambios: Partial<PagoForm>) {
    if (modo !== 'MIXTA' && cambios.monto !== undefined) setMontoAuto(false);
    setPagos((ps) => ps.map((p) => (p.id === id ? { ...p, ...cambios } : p)));
  }

  const nuevaVenta = useCallback(() => {
    setCliente(CLIENTE_VACIO);
    setLineas([]);
    setModo(null);
    setPagos([]);
    setMontoAuto(true);
    setErrorRegistro(null);
    setResultado(null);
    enfocar('#cli-doc');
  }, []);

  // ---------- ¿Se puede cobrar? (se explica qué falta) ----------
  const documento = cliente.numeroDocumento.replace(/\D/g, '');
  const actualizado = !cotizacion.isFetching && !cotizacion.isPlaceholderData && pagosRetardados === JSON.stringify(pagosValidos);
  const pendientes: string[] = [];
  if (lineas.length === 0) pendientes.push('agrega al menos un producto');
  else if (cot && !cot.stockSuficiente) pendientes.push('hay productos sin existencia suficiente');
  if (documento && documento.length < 6) pendientes.push('la cédula o RIF está incompleta');
  if (documento && !cliente.nombre.trim()) pendientes.push('escribe el nombre del cliente');
  if (!modo) pendientes.push('elige la forma de pago');
  else if (pagos.some((p) => !esEfectivo(p.metodo) && !p.cuentaId)) pendientes.push('indica la cuenta bancaria del pago');
  else if (pagosValidos.length !== pagos.length) pendientes.push('revisa los montos de pago');
  else if (cot?.pago && cot.pago.estado !== 'COMPLETO') pendientes.push(cot.pago.estado === 'INCOMPLETO' ? 'el pago no cubre el total' : 'el pago supera el total');
  const puedeRegistrar = pendientes.length === 0 && actualizado && cot?.pago?.estado === 'COMPLETO' && !registrando;

  async function registrar() {
    if (!puedeRegistrar || !cot) return;
    setRegistrando(true);
    setErrorRegistro(null);
    const opcional = (v: string) => (v.trim() ? v.trim() : undefined);
    try {
      const venta = await api<VentaRegistrada>('/ventas', {
        method: 'POST',
        json: {
          ...(documento
            ? {
                cliente: {
                  tipoDocumento: cliente.tipoDocumento,
                  numeroDocumento: documento,
                  nombre: opcional(cliente.nombre),
                  telefono: opcional(cliente.telefono),
                  direccion: opcional(cliente.direccion),
                  ciudad: opcional(cliente.ciudad),
                  estado: opcional(cliente.estado),
                },
              }
            : {}),
          detalles,
          pagos: pagos.map((p) => ({
            metodo: p.metodo,
            monto: leerMonto(p.monto),
            ...(p.cuentaId ? { cuentaId: p.cuentaId } : {}),
            ...(llevaReferencia(p.metodo) && p.referencia.trim() ? { referencia: p.referencia.trim() } : {}),
          })),
          tasaEsperada: cot.tasaEsperada,
          totalUsdEsperado: cot.totalUsdEsperado,
        },
      });
      setResultado(venta);
      await Promise.all([
        clienteQuery.invalidateQueries({ queryKey: ['ventas'] }),
        clienteQuery.invalidateQueries({ queryKey: ['productos'] }),
      ]);
    } catch (e) {
      setErrorRegistro(e instanceof ErrorApi ? e.message : 'No se pudo registrar la venta');
      if (e instanceof ErrorApi && e.estado === 409) {
        // Cambió la tasa o un precio: se recalcula para mostrar los montos nuevos
        clienteQuery.invalidateQueries({ queryKey: ['cotizar'] });
        clienteQuery.invalidateQueries({ queryKey: ['tasa-vigente'] });
      }
    } finally {
      setRegistrando(false);
    }
  }

  // ---------- Atajos de caja: F2 = código, F9 = registrar ----------
  const registrarRef = useRef(registrar);
  registrarRef.current = registrar;
  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      if (e.key === 'F2') {
        e.preventDefault();
        refCodigo.current?.focus();
      } else if (e.key === 'F9') {
        e.preventDefault();
        registrarRef.current();
      }
    }
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, []);

  // Al entrar a la pantalla, el foco va a la cédula del cliente
  useEffect(() => {
    enfocar('#cli-doc');
  }, []);

  const etiqueta = 'font-mano text-xl uppercase text-cafe-oscuro';

  return (
    <div>
      <DatosCliente valor={cliente} alCambiar={setCliente} alCompletar={() => refCodigo.current?.focus()} />

      <div className="mt-6 border-t border-cafe/30 pt-4">
        <AgregarProducto
          alAgregar={agregarProducto}
          refCodigo={refCodigo}
          alCodigoVacio={() => lineas.length > 0 && enfocar(`[data-metodo="${modo ?? 'PAGO_MOVIL'}"]`)}
        />
        <TablaVenta
          lineas={lineas}
          cotizadas={cot?.lineas}
          alCambiarCantidad={(id, cantidad) => setLineas((ls) => ls.map((l) => (l.producto.id === id ? { ...l, cantidad } : l)))}
          alQuitar={(id) => setLineas((ls) => ls.filter((l) => l.producto.id !== id))}
        />
      </div>

      {/* ---------- Totales (parte inferior del boceto) ---------- */}
      <div className="mt-4 flex items-start justify-between gap-6">
        <PrecioDelDolar tasa={tasaVigente} cotizada={cot ? { tasa: cot.tasa, fecha: cot.fechaTasa } : null} esAdmin={usuario?.rol === 'ADMIN'} />
        <div className="grid grid-cols-[auto_12rem] items-center gap-x-3 gap-y-2">
          <span className={`${etiqueta} text-right`}>Total a pagar:</span>
          <span className="rounded border-2 border-cafe px-3 py-1 text-right text-xl font-bold tabular-nums">{cot ? fmtUsd(cot.totalUsd) : '0,00 $'}</span>
          <span className={`${etiqueta} text-right`}>Total a pagar:</span>
          <span className="rounded border-2 border-cafe px-3 py-1 text-right text-xl font-bold tabular-nums">{cot ? fmtBs(cot.totalBs) : '0,00 Bs'}</span>
        </div>
      </div>
      {cotizacion.error && lineas.length > 0 && (
        <p role="alert" className="mt-3 rounded bg-ladrillo/10 px-3 py-2 text-sm text-ladrillo">
          {(cotizacion.error as Error).message}
        </p>
      )}

      <FormaDePago
        modo={modo}
        pagos={pagos}
        cuentas={cuentas.data ?? []}
        cotizacion={cot}
        alElegirModo={elegirModo}
        alCambiarPago={cambiarPago}
        alAgregarPago={() => setPagos((ps) => [...ps, nuevoPago('EFECTIVO_BS', null)])}
        alQuitarPago={(id) => setPagos((ps) => ps.filter((p) => p.id !== id))}
      />

      {/* ---------- Registrar ---------- */}
      <div className="mt-6 flex items-center justify-end gap-4 border-t-2 border-cafe pt-4">
        {errorRegistro && <p role="alert" className="mr-auto text-sm font-semibold text-ladrillo">{errorRegistro}</p>}
        {!errorRegistro && pendientes.length > 0 && <p className="mr-auto text-sm text-cafe">Para registrar: {pendientes.join(', ')}.</p>}
        <button type="button" onClick={nuevaVenta} className="rounded border-2 border-cafe/60 px-4 py-2 font-mano text-xl uppercase hover:bg-durazno-claro">
          Limpiar
        </button>
        <button
          type="button"
          onClick={registrar}
          disabled={!puedeRegistrar}
          data-flujo={FLUJO.registrar}
          className="rounded bg-cafe-oscuro px-6 py-2 font-mano text-2xl uppercase text-white hover:bg-cafe disabled:cursor-not-allowed disabled:opacity-40"
        >
          {registrando ? 'Registrando…' : 'Registrar venta'} <span className="text-base opacity-70">(F9)</span>
        </button>
      </div>
      <p className="mt-1 text-right text-xs text-cafe">Enter: siguiente campo | ← →: elegir forma de pago | F2: ir al código | F9: registrar</p>

      <Dialogo abierto={resultado !== null} titulo="Venta registrada" alCerrar={nuevaVenta}>
        {resultado && (
          <div>
            <p className="text-lg">
              N° de control <strong className="tabular-nums">{resultado.numeroControl}</strong>
            </p>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
              <dt className="text-cafe-oscuro">Cliente</dt>
              <dd>{resultado.cliente.nombre}</dd>
              <dt className="text-cafe-oscuro">Total</dt>
              <dd className="tabular-nums">
                <strong>{fmtUsd(resultado.totalUsd)}</strong> / <strong>{fmtBs(resultado.totalBs)}</strong>
              </dd>
              <dt className="text-cafe-oscuro">Forma de pago</dt>
              <dd>{NOMBRE_METODO[resultado.formaPago]}</dd>
              {Number(resultado.diferenciaBs) > 0 && (
                <>
                  <dt className="text-cafe-oscuro">Pagado de más</dt>
                  <dd className="tabular-nums">{fmtBs(resultado.diferenciaBs)}</dd>
                </>
              )}
            </dl>
            <div className="mt-6 flex items-start justify-between gap-3">
              <BotonFactura
                ventaId={resultado.id}
                numeroControl={resultado.numeroControl}
                className="rounded border-2 border-cafe-oscuro px-5 py-2 font-mano text-2xl uppercase text-cafe-oscuro hover:bg-durazno-claro disabled:opacity-60"
              />
              <button data-autofocus onClick={nuevaVenta} className="rounded bg-cafe-oscuro px-6 py-2 font-mano text-2xl uppercase text-white hover:bg-cafe">
                Nueva venta
              </button>
            </div>
          </div>
        )}
      </Dialogo>

      <VentasDeHoy esAdmin={usuario?.rol === 'ADMIN'} />
    </div>
  );
}

/**
 * "PRECIO DEL $" del boceto: el dólar del día que se usará para cobrar.
 * Avisa si la tasa no es de hoy o si está vencida (en ese caso no se puede vender).
 */
function PrecioDelDolar({
  tasa,
  cotizada,
  esAdmin,
}: {
  tasa: ReturnType<typeof useTasaVigente>;
  cotizada: { tasa: string; fecha: string } | null;
  esAdmin: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const etiqueta = 'font-mano text-xl uppercase text-cafe-oscuro';
  const t = tasa.data;
  // Si ya hay cotización se muestra la que usó el servidor; si no, la vigente
  const valor = cotizada?.tasa ?? t?.bsPorUsd;
  const fecha = cotizada?.fecha ?? t?.fecha;

  let aviso: { texto: string; clase: string } | null = null;
  if (tasa.error instanceof ErrorApi && tasa.error.estado === 404) {
    aviso = { texto: 'Sin tasa registrada: no se puede vender', clase: 'bg-ladrillo text-white' };
  } else if (tasa.error) {
    aviso = { texto: 'No se pudo leer la tasa', clase: 'bg-ladrillo text-white' };
  } else if (t && !t.validaParaVender) {
    aviso = { texto: 'Tasa vencida: registra la de hoy para poder vender', clase: 'bg-ladrillo text-white' };
  } else if (t && !t.esDeHoy) {
    aviso = { texto: 'No es la tasa de hoy', clase: 'bg-durazno text-cafe-oscuro' };
  }

  return (
    <div>
      <span className={etiqueta}>Precio del $:</span>{' '}
      <span className="text-lg font-bold tabular-nums">{valor ? fmtBs(valor) : tasa.isLoading ? '…' : '—'}</span>
      {fecha && (
        <span className="ml-2 text-xs text-cafe">
          tasa del {fmtDiaCorto(fecha)}
          {t && `, ${t.fuente === 'BCV' ? 'BCV' : 'registrada a mano'}`}
        </span>
      )}
      {aviso && <p className={`mt-1 inline-block rounded px-2 py-0.5 text-xs font-semibold ${aviso.clase}`}>{aviso.texto}</p>}

      {/* El vendedor lo ve solo si falta la tasa de hoy; el administrador, siempre */}
      {(esAdmin || !t?.esDeHoy) && (
        <div className="mt-1">
          <button type="button" onClick={() => { setMensaje(null); setAbierto(true); }} className="text-sm text-cafe-oscuro underline">
            {esAdmin && t?.esDeHoy ? 'Registrar o corregir tasa' : 'Registrar tasa'}
          </button>
        </div>
      )}
      {mensaje && <p role="status" className="mt-1 text-sm font-semibold text-salvia">{mensaje}</p>}

      <Dialogo abierto={abierto} titulo="Dólar del día" alCerrar={() => setAbierto(false)}>
        {abierto && (
          <DialogoTasa
            esAdmin={esAdmin}
            alTerminar={(m) => {
              setAbierto(false);
              setMensaje(m);
            }}
          />
        )}
      </Dialogo>
    </div>
  );
}
