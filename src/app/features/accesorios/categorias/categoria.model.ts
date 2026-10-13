export interface Categoria {
  id: number;
  categoria: string;
  estado: string;
}


export interface CategoriasResponse {
  success: boolean;
  data: Categoria[];
}


export interface CategoriaRequest {
  categoria: string;
}


export interface CategoriaResponse {
  success: boolean;
  message: string;
}