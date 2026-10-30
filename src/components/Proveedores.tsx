'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { ErrorApi } from '@/lib/api';
import { ProveedorSesion } from '@/lib/sesion';

export function Proveedores({ children }: { children: ReactNode }) {
  const [cliente] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: true,
            // No reintentar errores de permisos o validación: no se van a arreglar solos
            retry: (intentos, error) =>
              !(error instanceof ErrorApi && error.estado >= 400 && error.estado < 500) && intentos < 2,
          },
        },
      }),
  );
  return (
    <QueryClientProvider client={cliente}>
      <ProveedorSesion>{children}</ProveedorSesion>
    </QueryClientProvider>
  );
}
