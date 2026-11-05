'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { BarraDescargas } from '@/components/BarraDescargas';
import { Encabezado, Pestanas, puedeVer } from '@/components/Encabezado';
import { Cargando } from '@/components/Estados';
import { useSesion } from '@/lib/sesion';

/** Todas las pantallas de la tienda: exigen sesión y comparten encabezado y pestañas. */
export default function LayoutTienda({ children }: { children: ReactNode }) {
  const { usuario, cargando } = useSesion();
  const router = useRouter();
  const ruta = usePathname();

  useEffect(() => {
    if (!cargando && !usuario) router.replace('/login/');
  }, [cargando, usuario, router]);

  if (cargando || !usuario) return <Cargando />;

  return (
    <>
      <Encabezado />
      <Pestanas />
      <main className={`mx-auto max-w-6xl px-4 ${usuario.rol === 'ADMIN' ? '' : 'mb-10'}`}>
        <div className="min-h-[70vh] bg-white px-4 py-6 md:px-6">
          {puedeVer(ruta, usuario.rol) ? (
            children
          ) : (
            // Si se entra escribiendo la dirección: el backend tampoco entregaría los datos
            <div className="mx-auto max-w-md py-16 text-center">
              <p className="font-mano text-2xl text-cafe-oscuro">Esta sección es solo para administradores</p>
              <Link href="/ventas/" className="mt-4 inline-block text-cafe underline">
                Ir a Ventas
              </Link>
            </div>
          )}
        </div>
      </main>
      {/* Reportes: solo administradores (igual que el permiso del backend) */}
      {usuario.rol === 'ADMIN' && <BarraDescargas />}
    </>
  );
}
