import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getCurrentUser, type AuthUser } from "../api/auth";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  loginUser: (user: AuthUser, token: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function restoreSession() {
      const storedToken = await AsyncStorage.getItem("forgedesk_token");

      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const currentUser = await getCurrentUser();

        setToken(storedToken);
        setUser(currentUser);

        await AsyncStorage.setItem(
          "forgedesk_user",
          JSON.stringify(currentUser),
        );
      } catch {
        await AsyncStorage.multiRemove(["forgedesk_token", "forgedesk_user"]);

        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, []);

  async function loginUser(authUser: AuthUser, authToken: string) {
    setUser(authUser);
    setToken(authToken);

    await AsyncStorage.setItem("forgedesk_user", JSON.stringify(authUser));
    await AsyncStorage.setItem("forgedesk_token", authToken);
  }

  async function logout() {
    setUser(null);
    setToken(null);

    await AsyncStorage.multiRemove(["forgedesk_user", "forgedesk_token"]);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        loginUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
