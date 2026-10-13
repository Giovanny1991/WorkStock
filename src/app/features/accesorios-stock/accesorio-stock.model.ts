export interface AccesorioStock {

  id: number;

  fechaIngreso?: string;

  fechaActualizacion?: string;

  idCategoria: number;
  categoria: string;

  idMarca: number;
  nombreMarca: string;

  descripcion: string;

  accesorio: string;

  calidad: string;

  cantidadStock: number;

  precioUnitario: number;

  precioTotal: number;

  pvp1: number;

  pvp2: number;

  estado: string;

}


export interface CategoriaAccesorio {

  id: number;

  categoria: string;

}


export interface MarcaAccesorio {

  id: number;

  nombreMarca: string;

}


export interface AccesorioStockCrear {

  idCategoria: number;

  idMarca: number;

  descripcion: string;

  calidad: string;

  cantidad: number;

  precioUnitario: number;

  precioTotal: number;

  pvp1: number;

  pvp2: number;

  recordatorio: boolean;

}


export interface AccesorioStockActualizar {

  idCategoria: number;

  idMarca: number;

  descripcion: string;

  calidad: string;

  pvp1: number;

  pvp2: number;

}


export interface AccesorioStockIngreso {

  cantidad: number;

  precioUnitario: number;

  precioTotal: number;

  pvp1: number;

  pvp2: number;

}


export interface PrecioReferenciaRequest {

  cantidad: number;

  precioTotal: number;

}


export interface PrecioReferencia {

  precioUnitarioReferencia: number;

}


export interface ApiResponse<T> {

  data: T;

  message?: string;

}


export interface ApiMessage {

  message: string;

}