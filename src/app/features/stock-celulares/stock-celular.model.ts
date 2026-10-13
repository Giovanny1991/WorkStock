export interface StockCelular {
  id: number;
  idProveedor: number;
  nombreProveedor: string;
  idModelo: number;
  nombreMarca: string;
  nombreModelo: string;
  ram: string;
  almacenamiento: string;
  color: string;
  imei1: string;
  imei2: string;
  factura: string;
  precioCosto: number;
  precioVenta: number;
  margen: number;
  estadoCelular: string;
  estado: string;
  fechaIngreso: string;
}

export interface StockRequest {
  idProveedor: number;
  idModelo: number;
  imei1: string;
  imei2: string;
  factura: string;
  precioCosto: number;
  precioVenta: number;
  estadoCelular: string;
}

export interface StockResponse {
  success: boolean;
  message: string;
}

export interface StockListadoResponse {
  success: boolean;
  data: StockCelular[];
}