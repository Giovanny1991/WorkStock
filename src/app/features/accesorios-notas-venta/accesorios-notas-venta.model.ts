export interface AccesorioNotaVentaDetalleRequest {

  idProducto: number;

  cantidad: number;

  precioUnitario: number;

}


export interface CrearAccesorioNotaVentaRequest {

  idCliente: number;

  detalle:
    AccesorioNotaVentaDetalleRequest[];

}


export interface CrearAccesorioNotaVentaData {

  idNotaVenta: number;

  numeroNV: string | null;

  totalVenta: number;

}


export interface AccesorioNotaVentaResumen {

  id: number;

  numeroNV: string;

  fechaNotaVenta: string;

  idCliente: number;

  identificacion: string;

  nombreCliente: string;

  idVendedor: number;

  vendedor: string;

  totalVenta: number;

  estado: string;

}


export interface AccesorioNotaVentaDetalle {

  id: number;

  idNV: number;

  idProducto: number;

  accesorio: string;

  cantidad: number;

  precioUnitario: number;

  precioTotal: number;

}


export interface AccesorioNotaVenta
  extends AccesorioNotaVentaResumen {

  telefono:
    string | null;

  direccion:
    string | null;

  correo:
    string | null;

  detalle:
    AccesorioNotaVentaDetalle[];

}


export interface ApiResponse<T> {

  data: T;

  message?: string;

}