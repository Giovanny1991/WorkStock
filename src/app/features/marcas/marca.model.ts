export interface Marca {
  id: number;
  nombreMarca: string;
  estado: string;
  fechaIngreso: string;
}

export interface MarcasResponse {
  success: boolean;
  data: Marca[];
}

export interface MarcaRequest {
  nombreMarca: string;
}

export interface MarcaResponse {
  success: boolean;
  message: string;
}