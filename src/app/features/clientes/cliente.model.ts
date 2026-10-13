export interface Cliente {
  id: number;
  identificacion: string;
  nombreCliente: string;
  telefono: string;
  direccion: string;
  correo: string;
  estado: string;
  fechaIngreso: string;
}

export interface ClienteRequest {
  identificacion: string;
  nombreCliente: string;
  telefono: string;
  direccion: string;
  correo: string;
}

export interface ClientesResponse {
  success: boolean;
  data: Cliente[];
}

export interface ClienteResponse {
  success: boolean;
  message: string;
  data?: Cliente;
  existente?: boolean;
}