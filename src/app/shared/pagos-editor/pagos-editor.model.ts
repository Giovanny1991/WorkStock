export interface PagoCaptura {
  idFormaPago: number;
  valor: number;
  referencia: string | null;
  banco: string | null;
  observacion: string | null;
}
export interface PagoRegistrado extends PagoCaptura {
  id: number;
  formaPago: string;
  fechaPago: string;
  estado: 'REGISTRADO' | 'ANULADO';
}
