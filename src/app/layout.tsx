import '@fontsource/patrick-hand';
import '@fontsource-variable/nunito';
import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Proveedores } from '@/components/Proveedores';

export const metadata: Metadata = {
  title: 'Tienda del Monasterio',
  description: 'Inventario, ventas y reportes de la Tienda del Monasterio',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen">
        <Proveedores>{children}</Proveedores>
      </body>
    </html>
  );
}
