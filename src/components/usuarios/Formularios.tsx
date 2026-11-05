'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { BotonesFormulario, Campo } from '@/components/Campo';
import { api, ErrorApi } from '@/lib/api';
import { alEnter } from '@/lib/flujo';
import type { CuentaUsuario, Rol } from '@/lib/tipos';

const USUARIO_REGEX = /^[a-z0-9._-]{3,50}$/;

function SelectorRol({ valor, alCambiar, disabled }: { valor: Rol; alCambiar: (r: Rol) => void; disabled?: boolean }) {
  return (
    <div className="mb-3 grid grid-cols-[7.5rem_1fr] items-center gap-2">
      <label htmlFor="rol" className="font-mano text-xl uppercase text-cafe-oscuro">Rol:</label>
      <div>
        <select
          id="rol"
          value={valor}
          disabled={disabled}
          onChange={(e) => alCambiar(e.target.value as Rol)}
          onKeyDown={alEnter}
          data-flujo={5}
          className="w-full border-b-2 border-cafe/40 bg-transparent px-1 py-1 outline-none focus:border-cafe disabled:opacity-60"
        >
          <option value="VENDEDOR">Vendedor</option>
          <option value="ADMIN">Administrador</option>
        </select>
        <p className="mt-1 text-xs text-cafe">
          {valor === 'VENDEDOR'
            ? 'Vende y ve solo sus propias ventas y facturas, además del inventario.'
            : 'Acceso completo: ingresos, regalos, traspasos, reportes, usuarios y todas las ventas.'}
        </p>
      </div>
    </div>
  );
}

/** Crear un usuario nuevo (por defecto, vendedor). */
export function FormNuevoUsuario({ alCancelar, alTerminar }: { alCancelar: () => void; alTerminar: (m: string) => void }) {
  const clienteQuery = useQueryClient();
  const [nombre, setNombre] = useState('');
  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [repetir, setRepetir] = useState('');
  const [rol, setRol] = useState<Rol>('VENDEDOR');
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const limpiar = (c: string) => setErrores((e) => (e[c] ? { ...e, [c]: '' } : e));

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setErrorGeneral(null);
    const nuevos: Record<string, string> = {};
    const usr = usuario.trim().toLowerCase();
    if (!nombre.trim()) nuevos.nombre = 'Escribe el nombre';
    if (!USUARIO_REGEX.test(usr)) nuevos.usuario = '3 a 50 caracteres: letras minúsculas, números, punto, guion o guion bajo';
    if (clave.length < 8) nuevos.clave = 'Mínimo 8 caracteres';
    if (repetir !== clave) nuevos.repetir = 'Las contraseñas no coinciden';
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;

    setEnviando(true);
    try {
      const u = await api<CuentaUsuario>('/usuarios', { method: 'POST', json: { nombre: nombre.trim(), usuario: usr, password: clave, rol } });
      await clienteQuery.invalidateQueries({ queryKey: ['usuarios'] });
      alTerminar(`Se creó el usuario "${u.usuario}" (${u.rol === 'ADMIN' ? 'administrador' : 'vendedor'}) para ${u.nombre}.`);
    } catch (err) {
      setErrorGeneral(err instanceof ErrorApi ? err.message : 'No se pudo crear el usuario');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={guardar} noValidate>
      <Campo etiqueta="Nombre" name="nombre" value={nombre} onChange={(e) => { setNombre(e.target.value); limpiar('nombre'); }} error={errores.nombre} placeholder="Ej. Hna. Rosa Pérez" autoComplete="off" onKeyDown={alEnter} data-flujo={1} />
      <Campo etiqueta="Usuario" name="usuario" value={usuario} onChange={(e) => { setUsuario(e.target.value.toLowerCase()); limpiar('usuario'); }} error={errores.usuario} ayuda="Con el que inicia sesión, ej. rosa" autoComplete="off" onKeyDown={alEnter} data-flujo={2} />
      <Campo etiqueta="Contraseña" name="clave" type="password" value={clave} onChange={(e) => { setClave(e.target.value); limpiar('clave'); }} error={errores.clave} ayuda="Mínimo 8 caracteres" autoComplete="new-password" onKeyDown={alEnter} data-flujo={3} />
      <Campo etiqueta="Repetir" name="repetir" type="password" value={repetir} onChange={(e) => { setRepetir(e.target.value); limpiar('repetir'); }} error={errores.repetir} autoComplete="new-password" onKeyDown={alEnter} data-flujo={4} />
      <SelectorRol valor={rol} alCambiar={setRol} />
      {errorGeneral && <p role="alert" className="mt-3 text-sm font-semibold text-ladrillo">{errorGeneral}</p>}
      <BotonesFormulario alCancelar={alCancelar} enviando={enviando} textoGuardar="Crear usuario" />
    </form>
  );
}

/** Cambiar nombre, rol o activar/desactivar. */
export function FormEditarUsuario({
  usuario,
  esUnoMismo,
  alCancelar,
  alTerminar,
}: {
  usuario: CuentaUsuario;
  esUnoMismo: boolean;
  alCancelar: () => void;
  alTerminar: (m: string) => void;
}) {
  const clienteQuery = useQueryClient();
  const [nombre, setNombre] = useState(usuario.nombre);
  const [rol, setRol] = useState<Rol>(usuario.rol);
  const [activo, setActivo] = useState(usuario.activo);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return setError('Escribe el nombre');
    setEnviando(true);
    setError(null);
    try {
      await api(`/usuarios/${usuario.id}`, { method: 'PATCH', json: { nombre: nombre.trim(), rol, activo } });
      await clienteQuery.invalidateQueries({ queryKey: ['usuarios'] });
      alTerminar(`Se actualizó el usuario "${usuario.usuario}".`);
    } catch (err) {
      setError(err instanceof ErrorApi ? err.message : 'No se pudo actualizar');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={guardar} noValidate>
      <p className="mb-4 text-sm text-cafe">
        Usuario: <strong className="text-cafe-oscuro">{usuario.usuario}</strong>
        {esUnoMismo && ' (tú)'}
      </p>
      <Campo etiqueta="Nombre" name="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="off" onKeyDown={alEnter} data-flujo={1} />
      <SelectorRol valor={rol} alCambiar={setRol} disabled={esUnoMismo} />
      <label className="mb-1 flex items-center gap-2 pl-[8rem] text-sm">
        <input type="checkbox" checked={activo} disabled={esUnoMismo} onChange={(e) => setActivo(e.target.checked)} />
        Activo (puede iniciar sesión)
      </label>
      {esUnoMismo && <p className="pl-[8rem] text-xs text-cafe">No puedes cambiar tu propio rol ni desactivarte.</p>}
      {!activo && !esUnoMismo && (
        <p className="mt-2 rounded bg-durazno-claro px-3 py-2 text-xs text-cafe-oscuro">
          Al desactivarlo, su sesión se cierra en el próximo clic. Sus ventas se conservan.
        </p>
      )}
      {error && <p role="alert" className="mt-3 text-sm font-semibold text-ladrillo">{error}</p>}
      <BotonesFormulario alCancelar={alCancelar} enviando={enviando} />
    </form>
  );
}

/** Asignar una contraseña nueva (p. ej. si la olvidó). */
export function FormClave({ usuario, alCancelar, alTerminar }: { usuario: CuentaUsuario; alCancelar: () => void; alTerminar: (m: string) => void }) {
  const [clave, setClave] = useState('');
  const [repetir, setRepetir] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (clave.length < 8) return setError('La contraseña debe tener al menos 8 caracteres');
    if (clave !== repetir) return setError('Las contraseñas no coinciden');
    setEnviando(true);
    setError(null);
    try {
      await api(`/usuarios/${usuario.id}/password`, { method: 'PATCH', json: { password: clave } });
      alTerminar(`Se cambió la contraseña de "${usuario.usuario}". Comunícasela de forma privada.`);
    } catch (err) {
      setError(err instanceof ErrorApi ? err.message : 'No se pudo cambiar la contraseña');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={guardar} noValidate>
      <p className="mb-4 text-sm text-cafe">
        Nueva contraseña para <strong className="text-cafe-oscuro">{usuario.nombre}</strong> ({usuario.usuario}).
      </p>
      <Campo etiqueta="Contraseña" name="clave" type="password" value={clave} onChange={(e) => setClave(e.target.value)} autoComplete="new-password" ayuda="Mínimo 8 caracteres" onKeyDown={alEnter} data-flujo={1} />
      <Campo etiqueta="Repetir" name="repetir" type="password" value={repetir} onChange={(e) => setRepetir(e.target.value)} autoComplete="new-password" onKeyDown={alEnter} data-flujo={2} />
      {error && <p role="alert" className="mt-3 text-sm font-semibold text-ladrillo">{error}</p>}
      <BotonesFormulario alCancelar={alCancelar} enviando={enviando} textoGuardar="Cambiar" />
    </form>
  );
}
