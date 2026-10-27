// =====================================================
// WORKSTOCK - MODELOS DE STOCK DE CELULARES
// =====================================================
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

// =====================================================
// IMEI DE CADA EQUIPO
// =====================================================
export interface StockImeiRequest {
  imei1: string;
  imei2: string;
}

// =====================================================
// CREACIÓN DE UNO O VARIOS EQUIPOS
// =====================================================
export interface StockCrearRequest {
  idProveedor: number;
  idModelo: number;
  factura: string;
  precioCosto: number;
  precioVenta: number;
  estadoCelular: string;
  equipos: StockImeiRequest[];
}

// =====================================================
// ACTUALIZACIÓN INDIVIDUAL
// =====================================================
export interface StockActualizarRequest {
  idProveedor: number;
  idModelo: number;
  imei1: string;
  imei2: string;
  factura: string;
  precioCosto: number;
  precioVenta: number;
  estadoCelular: string;
}

// Compatibilidad con módulos existentes.
export type StockRequest = StockActualizarRequest;

// =====================================================
// RESPUESTA DE OPERACIONES
// =====================================================
export interface StockResponse {
  success: boolean;
  message: string;
  data?: {
    registrados?: number;
  };
}

// =====================================================
// RESPUESTA DE LISTADOS
// =====================================================
export interface StockListadoResponse {
  success: boolean;
  data: StockCelular[];
}