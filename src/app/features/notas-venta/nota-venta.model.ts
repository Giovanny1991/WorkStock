export interface NotaVentaDetalleRequest {
  idProducto: number;
  precioTotal: number;
}

export interface NotaVentaRequest {
  idCliente: number;
  detalle: NotaVentaDetalleRequest[];
}

export interface NotaVentaCreada {
  idNotaVenta: number;
  totalVenta: number;
}

export interface NotaVentaCreadaResponse {
  success: boolean;
  message: string;
  data: NotaVentaCreada;
}

export interface NotaVentaResumen {
  id: number;
  numeroNV: string;
  fechaNotaVenta: string;
  idCliente: number;
  identificacion: string;
  nombreCliente: string;
  totalVenta: number;
  estado: string;
  vendedor: string;
}

export interface NotaVentaDetalle {
  id: number;
  idProducto: number;
  nombreMarca: string;
  nombreModelo: string;
  ram: string;
  almacenamiento: string;
  color: string;
  imei1: string;
  imei2?: string;
  cantidad: number;
  precioUnitario: number;
  precioTotal: number;
  estado: string;
}

export interface NotaVentaCompleta extends NotaVentaResumen {
  telefono?: string;
  direccion?: string;
  correo?: string;
  detalle: NotaVentaDetalle[];
}

export interface NotasVentaResponse {
  success: boolean;
  data: NotaVentaResumen[];
}

export interface NotaVentaResponse {
  success: boolean;
  data: NotaVentaCompleta;
}