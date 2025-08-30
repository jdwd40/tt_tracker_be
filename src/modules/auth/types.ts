// Auth module types based on OpenAPI contract

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface RegisterResponse {
  data: {
    user_id: string;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  data: {
    access_token: string;
    refresh_token: string;
  };
}

export interface RefreshRequest {
  refresh_token: string;
}

export interface RefreshResponse {
  data: {
    access_token: string;
  };
}

export interface LogoutRequest {
  refresh_token: string;
}

export interface LogoutResponse {
  data: {
    message: string;
  };
}

// Database types
export interface User {
  id: string;
  email: string;
  password_hash: string;
  timezone: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export type UserRole = 'user' | 'admin' | 'moderator';

export interface RefreshTokenBlacklist {
  token_hash: string;
  user_id: string;
  expires_at: string;
  created_at: string;
}

// JWT payload types
export interface AccessTokenPayload {
  user_id: string;
  email: string;
  type: 'access';
  iat: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  user_id: string;
  email: string;
  type: 'refresh';
  iat: number;
  exp?: number;
}
