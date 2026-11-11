import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ModuloSistemaEmpresa {
  id: number;
  codigo: string;
  nombre: string;
  idModuloPadre: number | null;
  codigoPadre: string | null;
  rutaAngular: string | null;
  esAsignable: boolean | number;
  activo: boolean | number;
  orden: number;
  habilitado: boolean | number | null;
}
export interface AsignacionModulosEmpresa {
  empresa: { id: number; codigo: string; nombre: string };
  catalogo: ModuloSistemaEmpresa[];
  asignaciones: { codigo: string; habilitado: boolean | number; fechaActualizacion?: string; idUsuarioModificacion?: number | null }[];
}
export interface RespuestaModulosEmpresa {
  success: boolean;
  message?: string;
  data: AsignacionModulosEmpresa;
}

@Injectable({ providedIn: 'root' })
export class ModulosEmpresaService {
  private readonly http = inject(HttpClient);
  private readonly api = '/api/modulos-empresa';
  consultar(idEmpresa: number): Observable<RespuestaModulosEmpresa> {
    return this.http.get<RespuestaModulosEmpresa>(`${this.api}/empresas/${idEmpresa}`);
  }
  guardar(idEmpresa: number, codigosHabilitados: string[]): Observable<RespuestaModulosEmpresa> {
    return this.http.put<RespuestaModulosEmpresa>(`${this.api}/empresas/${idEmpresa}`, { codigosHabilitados });
  }
}
