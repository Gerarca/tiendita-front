'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Dialogo } from '@/components/Dialogo';
import { Cargando, MensajeError } from '@/components/Estados';
import { FormClave, FormEditarUsuario, FormNuevoUsuario } from '@/components/usuarios/Formularios';
import { api } from '@/lib/api';
import { fmtFechaHora } from '@/lib/formato';
import { useSesion } from '@/lib/sesion';
import type { CuentaUsuario } from '@/lib/tipos';

type Ventana = { tipo: 'nuevo' } | { tipo: 'editar'; u: CuentaUsuario } | { tipo: 'clave'; u: CuentaUsuario } | null;

/** Usuarios del sistema (solo administradores). */
export default function PaginaUsuarios() {
  const { usuario: yo } = useSesion();
  const [ventana, setVentana] = useState<Ventana>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const { data, error, isLoading, refetch } = useQuery({ queryKey: ['usuarios'], queryFn: () => api<CuentaUsuario[]>('/usuarios') });

  const terminar = (m: string) => {
    setVentana(null);
    setMensaje(m);
  };

  if (isLoading) return <Cargando />;
  if (error) return <MensajeError error={error} alReintentar={() => refetch()} />;

  return (
    <div>
      {mensaje && (
        <div role="status" className="mb-5 flex items-start justify-between gap-4 rounded border-l-4 border-salvia bg-salvia/10 px-4 py-3">
          <p>{mensaje}</p>
          <button onClick={() => setMensaje(null)} aria-label="Cerrar aviso" className="text-xl leading-none text-salvia">×</button>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <p className="text-cafe-oscuro">
          Los <strong>vendedores</strong> registran ventas y solo ven sus propias ventas y facturas. Los <strong>administradores</strong> ven todo.
        </p>
        <button
          onClick={() => { setMensaje(null); setVentana({ tipo: 'nuevo' }); }}
          className="shrink-0 rounded bg-cafe-oscuro px-5 py-2 font-mano text-xl uppercase text-white hover:bg-cafe"
        >
          + Nuevo usuario
        </button>
      </div>

      <table className="w-full text-left text-sm">
        <thead className="border-b-2 border-cafe text-cafe-oscuro">
          <tr>
            <th className="py-2 pr-3 font-semibold">Nombre</th>
            <th className="py-2 pr-3 font-semibold">Usuario</th>
            <th className="py-2 pr-3 font-semibold">Rol</th>
            <th className="py-2 pr-3 font-semibold">Estado</th>
            <th className="py-2 pr-3 font-semibold">Creado</th>
            <th className="py-2"><span className="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-cafe/20">
          {data?.map((u) => (
            <tr key={u.id} className={u.activo ? '' : 'text-tinta/45'}>
              <td className="py-2 pr-3 font-semibold">
                {u.nombre}
                {u.id === yo?.id && <span className="ml-2 text-xs font-normal text-cafe">(tú)</span>}
              </td>
              <td className="py-2 pr-3">{u.usuario}</td>
              <td className="py-2 pr-3">{u.rol === 'ADMIN' ? 'Administrador' : 'Vendedor'}</td>
              <td className="py-2 pr-3">
                <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${u.activo ? 'bg-salvia/15 text-salvia' : 'bg-ladrillo/15 text-ladrillo'}`}>
                  {u.activo ? 'Activo' : 'Inactivo'}
                </span>
              </td>
              <td className="py-2 pr-3 tabular-nums">{fmtFechaHora(u.creadoEn)}</td>
              <td className="whitespace-nowrap py-2 text-right">
                <button onClick={() => { setMensaje(null); setVentana({ tipo: 'editar', u }); }} className="mr-3 text-cafe-oscuro underline">Editar</button>
                <button onClick={() => { setMensaje(null); setVentana({ tipo: 'clave', u }); }} className="text-cafe-oscuro underline">Cambiar contraseña</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Dialogo abierto={ventana?.tipo === 'nuevo'} titulo="Nuevo usuario" alCerrar={() => setVentana(null)}>
        {ventana?.tipo === 'nuevo' && <FormNuevoUsuario alCancelar={() => setVentana(null)} alTerminar={terminar} />}
      </Dialogo>
      <Dialogo abierto={ventana?.tipo === 'editar'} titulo="Editar usuario" alCerrar={() => setVentana(null)}>
        {ventana?.tipo === 'editar' && (
          <FormEditarUsuario usuario={ventana.u} esUnoMismo={ventana.u.id === yo?.id} alCancelar={() => setVentana(null)} alTerminar={terminar} />
        )}
      </Dialogo>
      <Dialogo abierto={ventana?.tipo === 'clave'} titulo="Cambiar contraseña" alCerrar={() => setVentana(null)}>
        {ventana?.tipo === 'clave' && <FormClave usuario={ventana.u} alCancelar={() => setVentana(null)} alTerminar={terminar} />}
      </Dialogo>
    </div>
  );
}
