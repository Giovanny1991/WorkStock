
/* =====================================================
   MODELO IVA
===================================================== */

export interface IvaConfiguracion {
  Id: number;
  iva: number;
  UnicoIva: number;
}


/* =====================================================
   CONSULTAR IVA
===================================================== */

export interface IvaConsultaResponse {
  success: boolean;
  message: string;
  data: IvaConfiguracion;
}


/* =====================================================
   ACTUALIZAR IVA
===================================================== */

export interface IvaActualizarRequest {
  iva: number;
}


export interface IvaActualizarResponse {
  success: boolean;
  message: string;
  data: IvaConfiguracion;
}
