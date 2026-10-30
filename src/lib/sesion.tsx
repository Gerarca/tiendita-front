'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, registrarVencimientoSesion, token } from './api';
import type { Usuario } from './tipos';

interface Sesion {
  usuario: Usuario | null;
  cargando: boolean;
  iniciar: (usuario: string, password: string) => Promise<void>;
  cerrar: () => void;
}

const ContextoSesion = createContext<Sesion | null>(null);

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);
  const router = useRouter();
  const clienteQuery = useQueryClient();

  const cerrar = useCallback(() => {
    token.borrar();
    setUsuario(null);
    clienteQuery.clear();
    router.replace('/login/');
  }, [router, clienteQuery]);

  // Al abrir la app: si hay token guardado, se valida contra el servidor
  useEffect(() => {
    registrarVencimientoSesion(cerrar);
    if (!token.leer()) {
      setCargando(false);
      return;
    }
    api<Usuario>('/auth/me')
      .then(setUsuario)
      .catch(() => token.borrar())
      .finally(() => setCargando(false));
  }, [cerrar]);

  const iniciar = useCallback(async (nombreUsuario: string, password: string) => {
    const r = await api<{ accessToken: string; usuario: Usuario }>('/auth/login', {
      method: 'POST',
      json: { usuario: nombreUsuario, password },
    });
    token.guardar(r.accessToken);
    setUsuario(r.usuario);
  }, []);

  return <ContextoSesion.Provider value={{ usuario, cargando, iniciar, cerrar }}>{children}</ContextoSesion.Provider>;
}

export function useSesion() {
  const s = useContext(ContextoSesion);
  if (!s) throw new Error('useSesion debe usarse dentro de ProveedorSesion');
  return s;
}
