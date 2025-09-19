export interface User {
  id: string;
  email: string;
  role: string;
  full_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AuthSession {
  user: User;
  token: string;
  role: string;
}