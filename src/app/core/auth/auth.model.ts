// Sesión autenticada contra Node.js (JWT en cookie HttpOnly).
export type TipoCuenta = 'PLATAFORMA' | 'EMPRESA';

export interface EmpresaSesion {
  id: number;
  codigo: string;
  nombre: string;
}

export interface Usuario {
  id: number;
  nombre: string;
  rol: string;
  tipoCuenta: TipoCuenta;
  esSuperAdmin: boolean;
  idEmpresa: number | null;
  empresa: EmpresaSesion | null;
  empresaOperativa?: boolean;
}

export interface LoginRequest {
  login: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  usuario: Usuario;
}

export interface MeResponse {
  success: boolean;
  usuario: Usuario;
}

export interface CsrfResponse {
  success: boolean;
  csrfToken: string;
}
