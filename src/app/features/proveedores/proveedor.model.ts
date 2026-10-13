export interface Proveedor {
  id: number;
  nombreProveedor: string;
  estado: string;
  fechaIngreso: string;
}

export interface ProveedorRequest {
  nombreProveedor: string;
}

export interface ProveedoresResponse {
  success: boolean;
  data: Proveedor[];
}

export interface ProveedorResponse {
  success: boolean;
  message: string;
}