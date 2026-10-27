
export type OrdenCelularesVendidos =
  | 'fechaVenta'
  | 'proveedor'
  | 'modelo'
  | 'imei'
  | 'documento'
  | 'precioVenta';

export type DireccionCelularesVendidos =
  | 'asc'
  | 'desc';

export interface CelularVendido {
  idRegistro: string;
  idStock: number;
  idEmpresa: number;
  idProveedor: number;
  nombreProveedor: string;
  idModelo: number;
  nombreMarca: string;
  nombreModelo: string;
  ram: string | null;
  almacenamiento: string | null;
  color: string | null;
  imei1: string;
  imei2: string | null;
  factura: string;
  precioCosto: number;
  precioReferencia: number;
  precioVenta: number;
  estadoCelular: string;
  estadoStock: string;
  fechaIngreso: string;
  fechaVenta: string;
  numeroDocumento: number;
  tipoDocumento: 'FACTURA' | 'NOTA DE VENTA';
  idVenta: number;
  idDetalle: number;
  idCliente: number;
  idVendedor: number;
  estadoDocumento: string;
  estadoDetalle: string;
}

export interface FiltrosCelularesVendidos {
  fechaInicial: string;
  fechaFinal: string;
  page: number;
  pageSize: number;
  busqueda?: string;
  sortBy?: OrdenCelularesVendidos;
  sortDir?: DireccionCelularesVendidos;
}

export interface PaginacionCelularesVendidos {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface CelularesVendidosResponse {
  success: boolean;
  data: CelularVendido[];
  pagination: PaginacionCelularesVendidos;
  message?: string;
}
