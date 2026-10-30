import type { NextConfig } from 'next';

const config: NextConfig = {
  // Exportación estática: genera HTML/JS en /out que el backend Nest sirve.
  // Así en el monasterio corre UN solo proceso (Nest) y no un servidor Next aparte.
  output: 'export',
  // Cada ruta como carpeta con index.html (/inventario/ → inventario/index.html)
  trailingSlash: true,
  // Sin servidor Next no hay optimizador de imágenes
  images: { unoptimized: true },
};

export default config;
