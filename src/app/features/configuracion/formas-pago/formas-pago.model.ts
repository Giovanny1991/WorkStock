export interface FormaPago {
  id: number;
  nombre: string;
  requiereReferencia: boolean;
  activo: boolean;
  orden: number;
  fechaRegistro: string;
}
export interface FormaPagoRequest {
  nombre: string;
  requiereReferencia: boolean;
  activo: boolean;
  orden: number;
}
export interface FormasPagoResponse { success: boolean; data: FormaPago[]; }
export interface FormaPagoResponse { success: boolean; data: FormaPago; }
export interface FormaPagoGuardarResponse { success: boolean; message: string; data?: { id: number }; }
