/**
 * Cliente de la API. Agrega el token, convierte errores de Nest en mensajes
 * legibles y avisa cuando la sesión venció.
 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

const CLAVE_TOKEN = 'tienda.token';

export const token = {
  leer: () => (typeof window === 'undefined' ? null : window.localStorage.getItem(CLAVE_TOKEN)),
  guardar: (t: string) => window.localStorage.setItem(CLAVE_TOKEN, t),
  borrar: () => window.localStorage.removeItem(CLAVE_TOKEN),
};

export class ErrorApi extends Error {
  constructor(
    message: string,
    public readonly estado: number,
    public readonly datos?: unknown,
  ) {
    super(message);
  }
}

/** Nest devuelve message como texto o como lista (errores de validación). */
function mensajeDe(cuerpo: unknown, estado: number): string {
  if (cuerpo && typeof cuerpo === 'object' && 'message' in cuerpo) {
    const m = (cuerpo as { message: unknown }).message;
    if (Array.isArray(m)) return m.join('. ');
    if (typeof m === 'string') return m;
  }
  if (estado === 0) return 'No hay conexión con el servidor de la tienda';
  return `Error ${estado}`;
}

let alVencerSesion: (() => void) | null = null;
export function registrarVencimientoSesion(fn: () => void) {
  alVencerSesion = fn;
}

export async function api<T>(ruta: string, opciones: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...resto } = opciones;
  const t = token.leer();

  let respuesta: Response;
  try {
    respuesta = await fetch(`${API_URL}/api${ruta}`, {
      ...resto,
      headers: {
        ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
        ...headers,
      },
      body: json !== undefined ? JSON.stringify(json) : resto.body,
    });
  } catch {
    throw new ErrorApi('No hay conexión con el servidor de la tienda', 0);
  }

  if (respuesta.status === 401 && t) {
    token.borrar();
    alVencerSesion?.();
  }

  if (respuesta.status === 204) return undefined as T;

  const cuerpo: unknown = await respuesta.json().catch(() => null);
  if (!respuesta.ok) throw new ErrorApi(mensajeDe(cuerpo, respuesta.status), respuesta.status, cuerpo);
  return cuerpo as T;
}

/** URL absoluta de una imagen subida (/uploads/...). */
export const urlImagen = (ruta: string | null) => (ruta ? `${API_URL}${ruta}` : null);

/**
 * Descarga un archivo de la API (PDF, Excel) enviando el token.
 * Un enlace <a href> normal no puede enviar el token, por eso se descarga
 * con fetch y se entrega al navegador como archivo.
 */
export async function descargar(ruta: string, nombrePorDefecto: string): Promise<void> {
  const t = token.leer();
  let respuesta: Response;
  try {
    respuesta = await fetch(`${API_URL}/api${ruta}`, { headers: t ? { Authorization: `Bearer ${t}` } : {} });
  } catch {
    throw new ErrorApi('No hay conexión con el servidor de la tienda', 0);
  }

  if (respuesta.status === 401 && t) {
    token.borrar();
    alVencerSesion?.();
  }
  if (!respuesta.ok) {
    const cuerpo: unknown = await respuesta.json().catch(() => null);
    throw new ErrorApi(mensajeDe(cuerpo, respuesta.status), respuesta.status, cuerpo);
  }

  const archivo = await respuesta.blob();
  const nombre = /filename="([^"]+)"/.exec(respuesta.headers.get('Content-Disposition') ?? '')?.[1] ?? nombrePorDefecto;
  const url = URL.createObjectURL(archivo);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Abre un PDF de la API en una pestaña nueva, listo para imprimir.
 * La pestaña se abre ANTES de pedir el archivo para que el navegador no la
 * bloquee como ventana emergente; si igual la bloquea, se descarga.
 */
export async function abrirPdf(ruta: string, nombre: string): Promise<void> {
  const ventana = window.open('', '_blank');
  const t = token.leer();
  try {
    const respuesta = await fetch(`${API_URL}/api${ruta}`, { headers: t ? { Authorization: `Bearer ${t}` } : {} });
    if (respuesta.status === 401 && t) {
      token.borrar();
      alVencerSesion?.();
    }
    if (!respuesta.ok) {
      const cuerpo: unknown = await respuesta.json().catch(() => null);
      throw new ErrorApi(mensajeDe(cuerpo, respuesta.status), respuesta.status, cuerpo);
    }
    const url = URL.createObjectURL(await respuesta.blob());
    if (ventana) {
      ventana.location.href = url;
    } else {
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = nombre;
      enlace.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (e) {
    ventana?.close();
    throw e instanceof ErrorApi ? e : new ErrorApi('No hay conexión con el servidor de la tienda', 0);
  }
}
