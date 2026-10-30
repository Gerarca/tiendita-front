/** Formas de los datos que devuelve la API. Montos y tasas llegan como texto decimal. */
export type Rol = 'ADMIN' | 'VENDEDOR';

export interface Usuario {
  id: number;
  nombre: string;
  usuario: string;
  rol: Rol;
}

export interface Categoria {
  id: number;
  nombre: string;
  padreId: number | null;
  prefijoCodigo: string | null;
  orden: number;
  activo: boolean;
  productosActivos: number;
  vozFiscalId: number | null;
  hijas?: Categoria[];
}

export interface Producto {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  precioUsd: string;
  imagenUrl: string | null;
  stock: number;
  stockMinimo: number | null;
  stockBajo: boolean;
  activo: boolean;
  vozFiscal: { id: number; nombre: string; exentoIva: boolean; origen: 'producto' | 'categoria' } | null;
  categoria: { id: number; nombre: string; padre: { id: number; nombre: string } | null };
}

export interface Pagina<T> {
  datos: T[];
  total: number;
  pagina: number;
  porPagina: number;
}

export interface TasaVigente {
  fecha: string;
  bsPorUsd: string;
  fuente: 'BCV' | 'MANUAL';
  esDeHoy: boolean;
  diasAntiguedad: number;
  validaParaVender: boolean;
}

export interface DetalleIngreso {
  productoId: number;
  codigo: string;
  nombre: string;
  cantidad: number;
  costoUnitUsd: string | null;
  costoTotalUsd: string | null;
}

export interface Ingreso {
  id: number;
  fecha: string;
  ubicacion: string;
  proveedor: string | null;
  nota: string | null;
  usuario: string;
  totalProductos: number;
  totalUnidades: number;
  costoTotalUsd: string | null;
  detalles: DetalleIngreso[];
}

export type MetodoPago = 'TARJETA' | 'PAGO_MOVIL' | 'TRANSFERENCIA' | 'EFECTIVO_BS' | 'EFECTIVO_USD';
export type TipoDocumento = 'V' | 'E' | 'J' | 'G' | 'P';

export interface Cliente {
  id: number;
  documento: string | null;
  tipoDocumento: TipoDocumento | null;
  numeroDocumento: string | null;
  nombre: string;
  telefono: string | null;
  direccion: string | null;
  ciudad: string | null;
  estado: string | null;
}

export interface CuentaBancaria {
  id: number;
  banco: string;
  nombre: string;
  titular: string;
  activo: boolean;
}

export interface LineaCotizada {
  productoId: number;
  codigo: string;
  nombre: string;
  cantidad: number;
  precioUnitUsd: string;
  precioUnitBs: string;
  subtotalUsd: string;
  subtotalBs: string;
  stockDisponible: number;
  stockSuficiente: boolean;
}

export interface Cotizacion {
  tasa: string;
  fechaTasa: string;
  lineas: LineaCotizada[];
  totalUsd: string;
  totalBs: string;
  stockSuficiente: boolean;
  pago: null | {
    estado: 'COMPLETO' | 'INCOMPLETO' | 'EXCEDIDO';
    mensaje: string | null;
    pagadoUsd: string;
    pagadoBs: string;
    diferenciaBs: string;
    diferenciaUsd: string;
  };
  tasaEsperada: string;
  totalUsdEsperado: string;
}

export interface VentaResumen {
  id: number;
  numeroControl: string;
  fecha: string;
  estado: 'ACTIVA' | 'ANULADA';
  cliente: Cliente;
  totalUsd: string;
  totalBs: string;
  pagadoUsd: string;
  pagadoBs: string;
  tasa: string;
  formaPago: MetodoPago | 'MIXTA';
  productos: number;
  unidades: number;
  vendedor: string;
}

export interface ListaVentas extends Pagina<VentaResumen> {
  resumen: { ventasActivas: number; totalUsd: string; totalBs: string; pagadoUsd: string; pagadoBs: string };
}

export interface VentaRegistrada extends VentaResumen {
  diferenciaUsd: string;
  diferenciaBs: string;
}

export interface Regalo {
  id: number;
  fecha: string;
  beneficiario: string;
  motivo: string;
  autorizadoPor: string | null;
  registradoPor: string;
  unidades: number;
  valorTotalUsd: string;
  detalles: { productoId: number; codigo: string; nombre: string; cantidad: number; valorUnitUsd: string; valorTotalUsd: string }[];
}

export interface ListaRegalos extends Pagina<Regalo> {
  resumen: { regalos: number; unidades: number; valorTotalUsd: string };
}

export interface VentaDetalle extends VentaRegistrada {
  detalles: {
    productoId: number;
    codigo: string;
    nombre: string;
    cantidad: number;
    precioUnitUsd: string;
    precioUnitBs: string;
    subtotalUsd: string;
    subtotalBs: string;
  }[];
  pagos: {
    metodo: MetodoPago;
    moneda: 'BS' | 'USD';
    monto: string;
    montoUsd: string;
    montoBs: string;
    cuenta: { id: number; nombre: string; banco: string } | null;
    referencia: string | null;
  }[];
  anulacion: { motivo: string | null; por: string | null; en: string | null } | null;
}

export interface VozFiscal {
  id: number;
  nombre: string;
  exentoIva: boolean;
  activo: boolean;
}
