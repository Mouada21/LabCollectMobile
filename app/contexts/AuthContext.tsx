import { jwtDecode } from 'jwt-decode';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '../services/authService';
import { secureStore } from '../utils/secureStoreWeb';

// Define the shape of our auth state
interface AuthState {
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  userName: string | null;
  userRoles: string[];
  userId: string | null;
  loading: boolean;
  error: string | null;
}

// Define the shape of our context
interface AuthContextType {
  auth: AuthState;
  login: (username?: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<string | null>;
  hasRole: (requiredRoles: string[]) => boolean; // Add this line
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType>({
  auth: {
    token: null,
    refreshToken: null,
    isAuthenticated: false,
    userName: null,
    userRoles: [],
    userId: null,
    loading: true,
    error: null,
  },
  login: async () => {},
  logout: async () => {},
  refreshAuth: async () => null,
  hasRole: () => false, // Default implementation
});

// Export the hook for using our auth context
export const useAuth = () => useContext(AuthContext);

// Create the auth provider component
export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [auth, setAuth] = useState<AuthState>({
    token: null,
    refreshToken: null,
    isAuthenticated: false,
    userName: null,
    userRoles: [],
    userId: null,
    loading: true,
    error: null,
  });

  // Check for stored auth data on component mount
  useEffect(() => {
    const loadStoredAuth = async () => {
      try {
        const storedToken = await secureStore.getItemAsync('auth_token');
        const storedRefreshToken = await secureStore.getItemAsync('auth_refresh_token');
        const storedUsername = await secureStore.getItemAsync('auth_username');
        const storedRoles = await secureStore.getItemAsync('auth_roles');
        const storedUserId = await secureStore.getItemAsync('auth_user_id');
        
        if (storedToken && storedRefreshToken) {
          // Check token expiration
          try {
            const decodedToken: any = jwtDecode(storedToken);
            const currentTime = Date.now() / 1000;
            
            if (decodedToken.exp > currentTime) {
              // Token still valid
              setAuth({
                token: storedToken,
                refreshToken: storedRefreshToken,
                isAuthenticated: true,
                userName: storedUsername,
                userRoles: storedRoles ? JSON.parse(storedRoles) : [],
                userId: storedUserId,
                loading: false,
                error: null,
              });
            } else {
              // Token expired, try to refresh
              const newToken = await refreshAuth();
              if (!newToken) {
                setAuth(prev => ({ ...prev, loading: false }));
              }
            }
          } catch (error) {
            console.error('Error parsing token', error);
            // Clear invalid tokens
            await secureStore.deleteItemAsync('auth_token');
            await secureStore.deleteItemAsync('auth_refresh_token');
            setAuth(prev => ({ ...prev, loading: false }));
          }
        } else {
          setAuth(prev => ({ ...prev, loading: false }));
        }
      } catch (error) {
        console.error('Failed to load auth data', error);
        setAuth(prev => ({ 
          ...prev, 
          loading: false,
          error: 'Failed to restore authentication state'
        }));
      }
    };

    loadStoredAuth();
  }, []);

  // Add to your AuthContext.tsx before the login method
  useEffect(() => {
    if (__DEV__) {
      // Check for development bypass
      const checkDevBypass = async () => {
        const storedToken = await secureStore.getItemAsync('auth_token');
        if (storedToken) {
          try {
            // Just validate token is properly formatted
            const decoded = jwtDecode(storedToken);
            if (decoded.sub) {
              console.log("Development bypass auth detected:", decoded.sub);
            }
          } catch (e) {
            console.error("Error decoding stored token:", e);
          }
        }
      };
      
      checkDevBypass();
    }
  }, []);

  // Login function using the direct API
  const login = async (username?: string, password?: string) => {
    try {
      setAuth(prev => ({ ...prev, loading: true, error: null }));
      
      console.log("Starting direct API authentication...");
      
      if (!username || !password) {
        throw new Error("Username and password are required");
      }
      
      // Call the authentication service
      const authResult = await authService.login(username, password);
      
      console.log("Authentication successful");
      
            setAuth({
        token: authResult.token,
        refreshToken: authResult.refreshToken,
        isAuthenticated: true,
        userName: authResult.userName,
        userRoles: authResult.userRoles,
        userId: authResult.userId || null, // Convert undefined to null
        loading: false,
        error: null,
      });
      
      console.log("Auth state updated, isAuthenticated:", true);
    } catch (error) {
      console.error("Login failed", error);
      
      // Improve error display for common issues
      let errorMsg = "Authentication failed";
      
      if (error instanceof Error) {
        if (error.message.includes("network")) {
          errorMsg = "Network error. Check if server is reachable.";
        } else {
          errorMsg = error.message;
        }
      }
      
      setAuth(prev => ({ 
        ...prev, 
        loading: false, 
        error: errorMsg
      }));
    }
  };

  // Refresh token function
  const refreshAuth = async (): Promise<string | null> => {
    try {
      if (!auth.refreshToken) return null;

      const refreshResult = await authService.refreshToken(auth.refreshToken);
      
      // Store updated auth data
      await secureStore.setItemAsync('auth_token', refreshResult.token);
      await secureStore.setItemAsync('auth_refresh_token', refreshResult.refreshToken);
      
      // Decode token to get user info
      const decodedToken: any = jwtDecode(refreshResult.token);
      const roles = decodedToken.realm_access?.roles || [];
      const userName = decodedToken.preferred_username || decodedToken.email || null;
      const userId = decodedToken.sub || null;
      
      setAuth({
        token: refreshResult.token,
        refreshToken: refreshResult.refreshToken,
        isAuthenticated: true,
        userName,
        userRoles: roles,
        userId,
        loading: false,
        error: null,
      });
      
      return refreshResult.token;
    } catch (error) {
      console.error('Token refresh failed', error);
      
      // Clear auth state on refresh failure
      await logout();
      return null;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await authService.logout();
      
      setAuth({
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        userName: null,
        userRoles: [],
        userId: null,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('Logout error', error);
      // Even if logout fails, we clear local state
      setAuth({
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        userName: null,
        userRoles: [],
        userId: null,
        loading: false,
        error: 'Logout failed, but session was terminated locally',
      });
    }
  };

  // Add this function to check if user has any of the required roles
  const hasRole = (roles: string | string[]) => {
    if (!auth.isAuthenticated || !auth.userRoles.length) return false;

    // Convert to array if string
    const rolesToCheck = typeof roles === 'string' ? [roles] : roles;
    
    // First try exact match
    const hasExactRole = rolesToCheck.some(role => auth.userRoles.includes(role));
    if (hasExactRole) return true;
    
    // If no exact match, try case-insensitive
    return rolesToCheck.some(requiredRole => 
      auth.userRoles.some(userRole => 
        userRole.toLowerCase() === requiredRole.toLowerCase()
      )
    );
  };

  return (
    <AuthContext.Provider value={{ auth, login, logout, refreshAuth, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

const AuthContextExport = { AuthContext, AuthProvider, useAuth };
export default AuthContextExport;