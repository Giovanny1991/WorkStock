export interface Empresa {
  id: number;
  codigo: string;
  nombreEmpresa: string;
  ruc: string | null;
  estado: 'ACTIVA' | 'INACTIVA';
  operativaHabilitada: boolean;
  fechaRegistro: string;
  totalUsuarios?: number;
}

export interface EmpresaActual {
  id: number | null;
  codigo: string | null;
  nombre: string;
  operativaHabilitada: boolean;
  esSuperAdmin?: boolean;
}

export interface UsuarioEmpresa {
  id: number;
  idEmpresa: number;
  nombreUsuario: string;
  login: string;
  rol: 'ADMINISTRADOR' | 'VENDEDOR';
  estado: 'ACTIVO' | 'INACTIVO';
  esSuperAdmin: boolean;
}

export interface RespuestaApi<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface EmpresaGuardar {
  codigo?: string;
  nombreEmpresa: string;
  ruc: string | null;
}

export interface UsuarioCrear {
  nombreUsuario: string;
  login: string;
  password: string;
  rol: 'ADMINISTRADOR' | 'VENDEDOR';
}

export interface UsuarioActualizar {
  nombreUsuario: string;
  rol: 'ADMINISTRADOR' | 'VENDEDOR';
  estado: 'ACTIVO' | 'INACTIVO';
}
