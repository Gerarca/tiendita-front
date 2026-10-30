'use client';

import { useEffect, useState } from 'react';
import { api, ErrorApi } from '@/lib/api';
import { hoyVenezuela } from '@/lib/formato';
import type { Cliente, TipoDocumento } from '@/lib/tipos';

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
export function DatosCliente({ valor, alCambiar }: { valor: ClienteVenta; alCambiar: (c: ClienteVenta) => void }) {
  const [estado, setEstado] = useState<Estado>('consumidor');
  const numero = valor.numeroDocumento.replace(/\D/g, '');

  // Si se borra la cédula, vuelve a ser consumidor final
  useEffect(() => {
    if (!numero) setEstado('consumidor');
  }, [numero]);

  async function buscarCliente() {
    if (numero.length < 6) return;
    setEstado('buscando');
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
      setEstado('registrado');
    } catch (e) {
      setEstado(e instanceof ErrorApi && e.estado === 404 ? 'nuevo' : 'error');
    }
  }

  const cambiar = (campo: keyof ClienteVenta) => (e: { target: { value: string } }) =>
    alCambiar({ ...valor, [campo]: e.target.value });

  const aviso: Record<Estado, { texto: string; clase: string }> = {
    consumidor: { texto: 'Sin cédula: la venta queda a nombre de CONSUMIDOR FINAL', clase: 'text-cafe' },
    buscando: { texto: 'Buscando cliente…', clase: 'text-cafe' },
    registrado: { texto: 'Cliente registrado', clase: 'text-salvia font-semibold' },
    nuevo: { texto: 'Cliente nuevo: se registrará con la venta', clase: 'text-cafe-oscuro font-semibold' },
    error: { texto: 'No se pudo buscar el cliente', clase: 'text-ladrillo' },
  };

  return (
    <fieldset className="grid grid-cols-2 gap-x-10 gap-y-2">
      <legend className="sr-only">Datos del cliente</legend>

      <div className="grid grid-cols-[7rem_1fr] items-center">
        <span className={etiqueta}>Fecha:</span>
        <span className="tabular-nums">{hoyVenezuela()}</span>
      </div>
      <div className="grid grid-cols-[7rem_1fr] items-center">
        <label htmlFor="cli-tel" className={etiqueta}>N° telf:</label>
        <input id="cli-tel" value={valor.telefono} onChange={cambiar('telefono')} className={campo} autoComplete="off" />
      </div>

      <div className="grid grid-cols-[7rem_1fr] items-center">
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
            onChange={cambiar('numeroDocumento')}
            onBlur={buscarCliente}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), buscarCliente())}
            inputMode="numeric"
            placeholder="Ej. 17572853"
            className={campo}
            autoComplete="off"
          />
        </span>
      </div>
      <div className="grid grid-cols-[7rem_1fr] items-center">
        <label htmlFor="cli-dir" className={etiqueta}>Dirección:</label>
        <input id="cli-dir" value={valor.direccion} onChange={cambiar('direccion')} className={campo} autoComplete="off" />
      </div>

      <div className="grid grid-cols-[7rem_1fr] items-center">
        <label htmlFor="cli-nom" className={etiqueta}>Cliente:</label>
        <input id="cli-nom" value={valor.nombre} onChange={cambiar('nombre')} disabled={!numero} placeholder={numero ? 'Nombre y apellido' : 'Consumidor final'} className={`${campo} disabled:border-transparent`} autoComplete="off" />
      </div>
      <div className="grid grid-cols-[7rem_1fr_1fr] items-center gap-2">
        <label htmlFor="cli-ciu" className={etiqueta}>Ciudad:</label>
        <input id="cli-ciu" value={valor.ciudad} onChange={cambiar('ciudad')} placeholder="Ciudad" className={campo} autoComplete="off" />
        <input aria-label="Estado" value={valor.estado} onChange={cambiar('estado')} placeholder="Estado" className={campo} autoComplete="off" />
      </div>

      <p className={`col-span-2 text-sm ${aviso[estado].clase}`} role="status">
        {aviso[estado].texto}
      </p>
    </fieldset>
  );
}
