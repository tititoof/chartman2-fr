// types/Auth.ts

export interface User {
  id: number;
  email: string;
  name?: string;
  // Ajoute ici les champs spécifiques à ton modèle User Rails
}

export interface AuthResponse {
  token: string;
  user: User;
}