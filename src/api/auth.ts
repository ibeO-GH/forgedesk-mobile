import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest } from "./client";

export type UserRole = "user" | "admin";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthResponse {
  user: AuthUser;
  token: string;
}

export async function login(
  email: string,
  password: string,
): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
    }),
  });
}

export async function register(
  name: string,
  email: string,
  password: string,
): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name,
      email,
      password,
    }),
  });
}

export async function getCurrentUser(): Promise<AuthUser> {
  const token = await AsyncStorage.getItem("forgedesk_token");

  if (!token) {
    throw new Error("No authentication token");
  }

  return apiRequest<AuthUser>("/auth/me");
}
