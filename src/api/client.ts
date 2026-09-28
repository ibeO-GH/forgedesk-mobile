import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000/api";

interface ApiErrorResponse {
  message?: string;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await AsyncStorage.getItem("forgedesk_token");

  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error(
      "Unable to connect to ForgeDesk. Please check your connection and try again.",
    );
  }

  const contentType = response.headers.get("content-type");
  const isJson = contentType?.includes("application/json");

  let data: unknown = null;

  if (isJson) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof (data as ApiErrorResponse).message === "string"
        ? (data as ApiErrorResponse).message
        : "Something went wrong. Please try again.";

    throw new Error(message);
  }

  return data as T;
}
