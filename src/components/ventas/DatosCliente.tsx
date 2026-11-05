'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { api, ErrorApi } from '@/lib/api';
import { alEnter, enfocar, FLUJO } from '@/lib/flujo';
import { hoyVenezuela } from '@/lib/formato';
import { useRetardado } from '@/lib/hooks';
import type { Cliente, Pagina, TipoDocumento } from '@/lib/tipos';

export interface ClienteVenta {
  tipoDocumento: TipoDocumento;
  numeroDocumento: string;
  nombre: string;
  telefono: string;
  direccion: string;
  ciudad: string;
  estado: string;
}

export const CLIENTE_VACIO: ClienteVenta = {
  tipoDocumento: 'V',
  numeroDocumento: '',
  nombre: '',
  telefono: '',
  direccion: '',
  ciudad: '',
  estado: '',
};

type Estado = 'consumidor' | 'buscando' | 'registrado' | 'nuevo' | 'error';

const etiqueta = 'font-mano text-xl uppercase text-cafe-oscuro';
const campo = 'w-full border-b-2 border-cafe/40 bg-transparent px-1 py-0.5 outline-none focus:border-cafe';

/** Bloque superior del boceto: FECHA, CLIENTE, CI/RIF, TELÉFONO, DIRECCIÓN. */
export function DatosCliente({
  valor,
  alCambiar,
  alCompletar,
}: {
  valor: ClienteVenta;
  alCambiar: (c: ClienteVenta) => void;
  /** Se llama al terminar los datos del cliente (pasa a cargar productos). */
  alCompletar: () => void;
}) {
  const [estado, setEstado] = useState<Estado>('consumidor');
  const numero = valor.numeroDocumento.replace(/\D/g, '');
  /** Evita buscar dos veces el mismo documento (Enter y luego al salir del campo). */
  const ultimaBusqueda = useRef<{ clave: string; resultado: Estado } | null>(null);

  // ---------- Búsqueda mientras se escribe la cédula/RIF ----------
  const [listaAbierta, setListaAbierta] = useState(false);
  const [indice, setIndice] = useState(0);
  const numeroBuscado = useRetardado(numero, 250);
  const sugerencias = useQuery({
    queryKey: ['clientes', 'buscar', numeroBuscado],
    queryFn: () => api<Pagina<Cliente>>(`/clientes?${new URLSearchParams({ buscar: numeroBuscado, porPagina: '8' })}`),
    enabled: listaAbierta && numeroBuscado.length >= 3,
  });
  const lista = listaAbierta && numero.length >= 3 ? (sugerencias.data?.datos ?? []).filter((c) => c.numeroDocumento) : [];

  /** Rellena todos los datos con un cliente ya registrado. */
  function seleccionar(c: Cliente) {
    const tipo = (c.tipoDocumento ?? valor.tipoDocumento) as TipoDocumento;
    alCambiar({
      tipoDocumento: tipo,
      numeroDocumento: c.numeroDocumento ?? '',
      nombre: c.nombre,
      telefono: c.telefono ?? '',
      direccion: c.direccion ?? '',
      ciudad: c.ciudad ?? '',
      estado: c.estado ?? '',
    });
    setEstado('registrado');
    ultimaBusqueda.current = { clave: `${tipo}-${c.numeroDocumento}`, resultado: 'registrado' };
    setListaAbierta(false);
    alCompletar();
  }

  // Si se borra la cédula, vuelve a ser consumidor final
  useEffect(() => {
    if (!numero) setEstado('consumidor');
  }, [numero]);

  async function buscarCliente(): Promise<Estado | null> {
    if (numero.length < 6) return null;
    const clave = `${valor.tipoDocumento}-${numero}`;
    if (ultimaBusqueda.current?.clave === clave) return ultimaBusqueda.current.resultado;
    setEstado('buscando');
    let resultado: Estado;
    try {
      const c = await api<Cliente>(`/clientes/documento/${valor.tipoDocumento}/${numero}`);
      alCambiar({
        ...valor,
        numeroDocumento: numero,
        nombre: c.nombre,
        telefono: c.telefono ?? '',
        direccion: c.direccion ?? '',
        ciudad: c.ciudad ?? '',
        estado: c.estado ?? '',
      });
      resultado = 'registrado';
    } catch (e) {
      resultado = e instanceof ErrorApi && e.estado === 404 ? 'nuevo' : 'error';
    }
    setEstado(resultado);
    ultimaBusqueda.current = { clave, resultado };
    return resultado;
  }

  /**
   * Enter en CI/RIF:
   *  - vacío → consumidor final, pasa directo a productos
   *  - cliente registrado → sus datos ya están, pasa a productos
   *  - cliente nuevo → pasa a escribir su nombre
   */
  async function enterDocumento() {
    if (!numero) return alCompletar();
    const r = await buscarCliente();
    if (r === null) return; // documento incompleto: se queda para corregirlo
    if (r === 'registrado') alCompletar();
    else enfocar('#cli-nom');
  }

  const cambiar = (campo: keyof ClienteVenta) => (e: { target: { value: string } }) =>
    alCambiar({ ...valor, [campo]: e.target.value });

  const aviso: Record<Estado, { texto: string; clase: string }> = {
    consumidor: { texto: 'Sin cédula: la venta queda a nombre de CONSUMIDOR FINAL', clase: 'text-cafe' },
    buscando: { texto: 'Buscando cliente…', clase: 'text-cafe' },
    registrado: { texto: 'Cliente registrado: puedes corregir o completar sus datos; los cambios se guardan al registrar la venta', clase: 'text-salvia font-semibold' },
    nuevo: { texto: 'Cliente nuevo: se registrará con la venta', clase: 'text-cafe-oscuro font-semibold' },
    error: { texto: 'No se pudo buscar el cliente', clase: 'text-ladrillo' },
  };

  // Mientras se escribe una cédula todavía no buscada, se explica qué hacer
  const escribiendo = numero && estado === 'consumidor';
  const avisoActual = escribiendo
    ? { texto: 'Elige un cliente de la lista, o termina la cédula y presiona Enter', clase: 'text-cafe' }
    : aviso[estado];

  return (
    <fieldset className="grid grid-cols-2 gap-x-10 gap-y-2">
      <legend className="sr-only">Datos del cliente</legend>

      <div className="grid grid-cols-[7rem_1fr] items-center">
        <span className={etiqueta}>Fecha:</span>
        <span className="tabular-nums">{hoyVenezuela()}</span>
      </div>
      <div className="grid grid-cols-[7rem_1fr] items-center">
        <label htmlFor="cli-tel" className={etiqueta}>N° telf:</label>
        <input id="cli-tel" value={valor.telefono} onChange={cambiar('telefono')} onKeyDown={alEnter} data-flujo={FLUJO.telefono} className={campo} autoComplete="off" />
      </div>

      <div className="relative grid grid-cols-[7rem_1fr] items-center">
        <label htmlFor="cli-doc" className={etiqueta}>CI/RIF:</label>
        <span className="flex items-center gap-2">
          <select
            aria-label="Tipo de documento"
            value={valor.tipoDocumento}
            onChange={(e) => alCambiar({ ...valor, tipoDocumento: e.target.value as TipoDocumento })}
            onBlur={buscarCliente}
            className="border-b-2 border-cafe/40 bg-transparent py-0.5"
          >
            {(['V', 'E', 'J', 'G', 'P'] as const).map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <input
            id="cli-doc"
            value={valor.numeroDocumento}
            onChange={(e) => {
              alCambiar({ ...valor, numeroDocumento: e.target.value });
              setListaAbierta(true);
              setIndice(0);
            }}
            onBlur={() => {
              // Pequeña espera: permite hacer clic en una sugerencia antes de cerrar la lista
              setTimeout(() => setListaAbierta(false), 150);
              buscarCliente();
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' && lista.length > 0) {
                e.preventDefault();
                setIndice((i) => Math.min(i + 1, lista.length - 1));
              } else if (e.key === 'ArrowUp' && lista.length > 0) {
                e.preventDefault();
                setIndice((i) => Math.max(i - 1, 0));
              } else if (e.key === 'Escape') {
                setListaAbierta(false);
              } else if (e.key === 'Enter') {
                e.preventDefault();
                if (lista[indice]) seleccionar(lista[indice]);
                else enterDocumento();
              }
            }}
            role="combobox"
            aria-expanded={lista.length > 0}
            aria-controls="cli-sugerencias"
            aria-autocomplete="list"
            data-flujo={FLUJO.documento}
            inputMode="numeric"
            placeholder="Ej. 17572853"
            className={campo}
            autoComplete="off"
          />
        </span>
        {lista.length > 0 && (
          <ul
            id="cli-sugerencias"
            role="listbox"
            className="absolute left-[7rem] top-full z-20 mt-1 w-[34rem] max-w-[calc(100vw-4rem)] rounded border-2 border-cafe bg-white py-1 shadow-lg"
          >
            {lista.map((c, i) => (
              <li key={c.id} role="option" aria-selected={i === indice}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => seleccionar(c)}
                  className={`grid w-full grid-cols-[8.5rem_1fr_auto] items-baseline gap-3 px-3 py-1.5 text-left text-sm ${
                    i === indice ? 'bg-durazno-claro' : 'hover:bg-durazno-claro/60'
                  }`}
                >
                  <span className="font-semibold tabular-nums">
                    {c.tipoDocumento}-{c.numeroDocumento?.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                  </span>
                  <span className="truncate uppercase">{c.nombre}</span>
                  <span className="truncate text-xs text-cafe">{[c.ciudad, c.telefono].filter(Boolean).join(', ')}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="grid grid-cols-[7rem_1fr] items-center">
        <label htmlFor="cli-dir" className={etiqueta}>Dirección:</label>
        <input id="cli-dir" value={valor.direccion} onChange={cambiar('direccion')} onKeyDown={alEnter} data-flujo={FLUJO.direccion} className={campo} autoComplete="off" />
      </div>

      <div className="grid grid-cols-[7rem_1fr] items-center">
        <label htmlFor="cli-nom" className={etiqueta}>Cliente:</label>
        <input id="cli-nom" value={valor.nombre} onChange={cambiar('nombre')} onKeyDown={alEnter} data-flujo={FLUJO.nombre} disabled={!numero} placeholder={numero ? 'Nombre y apellido' : 'Consumidor final'} className={`${campo} disabled:border-transparent`} autoComplete="off" />
      </div>
      <div className="grid grid-cols-[7rem_1fr_1fr] items-center gap-2">
        <label htmlFor="cli-ciu" className={etiqueta}>Ciudad:</label>
        <input id="cli-ciu" value={valor.ciudad} onChange={cambiar('ciudad')} onKeyDown={alEnter} data-flujo={FLUJO.ciudad} placeholder="Ciudad" className={campo} autoComplete="off" />
        <input
          aria-label="Estado"
          value={valor.estado}
          onChange={cambiar('estado')}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              alCompletar();
            }
          }}
          data-flujo={FLUJO.estado}
          placeholder="Estado"
          className={campo}
          autoComplete="off"
        />
      </div>

      <p className={`col-span-2 text-sm ${avisoActual.clase}`} role="status">
        {avisoActual.texto}
      </p>
    </fieldset>
  );
}
