export interface FacturaDetalleRequest {
  idProducto: number;
  precioTotal: number;
}

export interface FacturaRequest {
  idCliente: number;
  detalle: FacturaDetalleRequest[];
}

export interface FacturaCreadaResponse {
  success: boolean;
  message: string;
  data: {
    idFactura: number;
    totalVenta: number;
  };
}

export interface IvaResponse {
  success: boolean;
  data: {
    iva: number;
  };
}

export interface FacturaResumen {
  id: number;
  numeroFactura: string;
  fechaFactura: string;
  idCliente: number;
  identificacion: string;
  nombreCliente: string;
  subTotal: number;
  iva: number;
  totalVenta: number;
  estado: string;
  ivaAplicado: number;
  vendedor: string;
}

export interface FacturaDetalle {
  id: number;
  idProducto: number;
  nombreModelo: string;
  nombreMarca: string;
  ram: string;
  almacenamiento: string;
  color: string;
  imei1: string;
  imei2: string;
  cantidad: number;
  precioCosto: number;
  subTotal: number;
  iva: number;
  precioTotal: number;
}

export interface FacturaCompleta {
  id: number;
  numeroFactura: string;
  fechaFactura: string;
  idCliente: number;
  identificacion: string;
  nombreCliente: string;
  telefono: string;
  direccion: string;
  correo: string;
  subTotal: number;
  iva: number;
  totalVenta: number;
  estado: string;
  ivaAplicado: number;
  vendedor: string;
  detalle: FacturaDetalle[];
}

export interface FacturasResponse {
  success: boolean;
  data: FacturaResumen[];
}

export interface FacturaResponse {
  success: boolean;
  data: FacturaCompleta;
}