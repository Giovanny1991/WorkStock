import { PagoCaptura, PagoRegistrado } from '../../shared/pagos-editor/pagos-editor.model';
export interface NotaVentaDetalleRequest {
  idProducto: number;
  precioTotal: number;
}

export interface NotaVentaRequest {
  idCliente: number;
  detalle: NotaVentaDetalleRequest[];
  pagos: PagoCaptura[];
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
  pagos?: PagoRegistrado[];
}

export interface NotasVentaResponse {
  success: boolean;
  data: NotaVentaResumen[];
}

export interface NotaVentaResponse {
  success: boolean;
  data: NotaVentaCompleta;
}