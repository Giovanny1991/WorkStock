export interface Modelo {
  id: number;
  idMarca: number;
  nombreMarca: string;
  nombreModelo: string;
  ram: string;
  almacenamiento: string;
  color: string;
  estado: string;
  fechaIngreso: string;
}

export interface ModeloRequest {
  idMarca: number;
  nombreModelo: string;
  ram: string;
  almacenamiento: string;
  color: string;
}

export interface ModelosResponse {
  success: boolean;
  data: Modelo[];
}

export interface ModeloResponse {
  success: boolean;
  message: string;
}