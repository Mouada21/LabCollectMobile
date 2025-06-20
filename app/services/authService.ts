import { jwtDecode, JwtPayload } from 'jwt-decode';
import { API_BASE_URL } from '../config/keycloakConfig';
import { secureStore } from '../utils/secureStoreWeb';
const REQUEST_TIMEOUT_MS = 10000; // 10 seconds timeout

// Define custom interface for the JWT token payload
interface LabCollectJwtPayload extends JwtPayload {
  preferred_username?: string;
  email?: string;
  sub?: string;
  realm_access?: {
    roles: string[];
  };
  // Add these missing properties
  resource_access?: {
    [clientId: string]: {
      roles: string[];
    };
  };
  roles?: string[]; // For standalone roles
}

// Define interface for auth response data
interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  token_type?: string;
}

// Define Keycloak server settings - UPDATE THIS
const KEYCLOAK_SERVER = 'http://10.0.2.2:8180';
const KEYCLOAK_REALM = 'LabCollect';
const KEYCLOAK_CLIENT_ID = 'labcollect-mobile';

/**
 * Service for handling authentication with the LabCollect backend
 */
export const authService = {
  /**
   * Login with username and password
   */
  login: async (username: string, password: string) => {
  try {
    console.log(`Attempting login to ${API_BASE_URL}/api/v1/mobile-auth/login with username: ${username}`);
    
    try {
      // Add timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      
      // First try the Spring Boot backend
      const response = await fetch(`${API_BASE_URL}/api/v1/mobile-auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          username,
          password,
          grant_type: 'password',
          client_id: KEYCLOAK_CLIENT_ID
        }).toString(),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
        
        // Get full response text for better debugging
        const responseText = await response.text();
        
        // Log complete response details
        console.log('Login response:', {
          status: response.status,
          headers: Object.fromEntries([...response.headers]),
          body: responseText
        });
        
        if (response.ok && responseText) {
          // Backend authentication succeeded
          const data: AuthResponse = JSON.parse(responseText);
          
          // Log the full token payload
          console.log("FULL TOKEN PAYLOAD:", JSON.stringify(jwtDecode(data.access_token), null, 2));
          
          return processAuthResponse(data);
        } else {
          // Backend auth failed, try direct Keycloak authentication
          console.log('Backend auth failed, trying direct Keycloak authentication');
          return await directKeycloakAuth(username, password);
        }
      } catch (backendError) {
        // If backend auth throws an error, try direct Keycloak authentication
        console.log('Backend auth error, trying direct Keycloak authentication:', backendError);
        return await directKeycloakAuth(username, password);
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },
  
  /**
   * Refresh the authentication token
   */
  refreshToken: async (refreshToken: string) => {
    try {
      try {
        // First try the Spring Boot backend
        const response: Response = await fetch(`${API_BASE_URL}/api/v1/mobile-auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            refresh_token: refreshToken
          })
        });
        
        if (response.ok) {
          const data: AuthResponse = await response.json();
          
          // Store new tokens
          await secureStore.setItemAsync('auth_token', data.access_token);
          await secureStore.setItemAsync('auth_refresh_token', data.refresh_token);
          
          return {
            token: data.access_token,
            refreshToken: data.refresh_token
          };
        } else {
          // Backend refresh failed, try direct Keycloak refresh
          console.log('Backend refresh failed, trying direct Keycloak refresh');
          return await directKeycloakRefresh(refreshToken);
        }
      } catch (backendError) {
        // If backend refresh throws an error, try direct Keycloak refresh
        console.log('Backend refresh error, trying direct Keycloak refresh:', backendError);
        return await directKeycloakRefresh(refreshToken);
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      throw error;
    }
  },
  
  /**
   * Get user profile information
   */
  getUserInfo: async (token: string) => {
    try {
      try {
        // First try the Spring Boot backend
        const response: Response = await fetch(`${API_BASE_URL}/api/v1/mobile-auth/userinfo`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          return await response.json();
        } else {
          // Backend userinfo failed, try direct Keycloak userinfo
          console.log('Backend userinfo failed, trying direct Keycloak userinfo');
          return await directKeycloakUserInfo(token);
        }
      } catch (backendError) {
        // If backend userinfo throws an error, try direct Keycloak userinfo
        console.log('Backend userinfo error, trying direct Keycloak userinfo:', backendError);
        return await directKeycloakUserInfo(token);
      }
    } catch (error) {
      console.error('Get user info error:', error);
      throw error;
    }
  },
  
  /**
   * Logout the user
   */
  logout: async () => {
    // Clear all stored authentication data
    await secureStore.deleteItemAsync('auth_token');
    await secureStore.deleteItemAsync('auth_refresh_token');
    await secureStore.deleteItemAsync('auth_username');
    await secureStore.deleteItemAsync('auth_roles');
    await secureStore.deleteItemAsync('auth_user_id');
  },

  /**
   * Test connectivity to Keycloak and Spring Boot
   */
  testConnectivity: async () => {
    try {
      console.log('Testing connectivity...');
      console.log('Testing Keycloak at:', `${KEYCLOAK_SERVER}/realms/${KEYCLOAK_REALM}/.well-known/openid_configuration`);
      
      const keycloakTest = await fetch(`${KEYCLOAK_SERVER}/realms/${KEYCLOAK_REALM}/.well-known/openid_configuration`);
      console.log('Keycloak response:', keycloakTest.status);
      
      const springBootTest = await fetch(`${API_BASE_URL}/actuator/health`);
      console.log('Spring Boot response:', springBootTest.status);
      
      return { keycloak: keycloakTest.ok, springBoot: springBootTest.ok };
    } catch (error) {
      console.error('Connectivity test failed:', error);
      return { keycloak: false, springBoot: false };
    }
  }
};

/**
 * Authenticate directly with Keycloak server
 */
async function directKeycloakAuth(username: string, password: string) {
  console.log('Authenticating directly with Keycloak');
  
  const tokenEndpoint = `${KEYCLOAK_SERVER}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`;
  
  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      username,
      password,
      grant_type: 'password',
      client_id: KEYCLOAK_CLIENT_ID
    }).toString()
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    try {
      const errorData = JSON.parse(errorText);
      throw new Error(errorData.error_description || errorData.error || `Status ${response.status}`);
    } catch (e) {
      throw new Error(`Keycloak authentication failed: ${response.status}`);
    }
  }
  
  const data: AuthResponse = await response.json();
  return processAuthResponse(data);
}

/**
 * Refresh token directly with Keycloak server
 */
async function directKeycloakRefresh(refreshToken: string) {
  console.log('Refreshing token directly with Keycloak');
  
  const tokenEndpoint = `${KEYCLOAK_SERVER}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`;
  
  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      client_id: KEYCLOAK_CLIENT_ID
    }).toString()
  });
  
  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status}`);
  }
  
  const data: AuthResponse = await response.json();
  
  // Store new tokens
  await secureStore.setItemAsync('auth_token', data.access_token);
  await secureStore.setItemAsync('auth_refresh_token', data.refresh_token);
  
  return {
    token: data.access_token,
    refreshToken: data.refresh_token
  };
}

/**
 * Get user info directly from Keycloak server
 */
async function directKeycloakUserInfo(token: string) {
  console.log('Getting user info directly from Keycloak');
  
  const userInfoEndpoint = `${KEYCLOAK_SERVER}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/userinfo`;
  
  const response = await fetch(userInfoEndpoint, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get user info: ${response.status}`);
  }
  
  return await response.json();
}

/**
 * Process authentication response and store tokens
 */
async function processAuthResponse(data: AuthResponse) {
  console.log("Authentication successful, received token");
  
  // Store tokens securely
  await secureStore.setItemAsync('auth_token', data.access_token);
  await secureStore.setItemAsync('auth_refresh_token', data.refresh_token);
  
  // Decode token to get user information
  const decodedToken: LabCollectJwtPayload = jwtDecode<LabCollectJwtPayload>(data.access_token);
  const userDisplayName = decodedToken.preferred_username || decodedToken.email || 'User';
  
  // FIXED: Get ALL possible roles from the token
  let roles: string[] = [];
  
  // Get realm roles
  if (decodedToken.realm_access?.roles) {
    roles = [...roles, ...decodedToken.realm_access.roles];
  }
  
  // Get resource roles (client-specific roles)
  // IMPORTANT: Make sure this matches the exact client ID in Keycloak
  const clientId = 'labcollect-mobile'; // MUST match the client ID in Keycloak
  if (decodedToken.resource_access && decodedToken.resource_access[clientId]?.roles) {
    roles = [...roles, ...decodedToken.resource_access[clientId].roles];
    console.log(`Found client roles for ${clientId}:`, decodedToken.resource_access[clientId].roles);
  }
  
  // Also try other possible client IDs if needed
  const alternateClientIds = ['labcollect-nextjs', 'labcollect-web'];
  for (const altClientId of alternateClientIds) {
    if (decodedToken.resource_access && decodedToken.resource_access[altClientId]?.roles) {
      roles = [...roles, ...decodedToken.resource_access[altClientId].roles];
      console.log(`Found client roles for ${altClientId}:`, decodedToken.resource_access[altClientId].roles);
    }
  }
  
  // Check for standalone roles that might be in a different format
  if (Array.isArray(decodedToken.roles)) {
    roles = [...roles, ...decodedToken.roles];
  }
  
  console.log("Final extracted roles:", roles);
  const userId = decodedToken.sub;
  
  // Store user information
  await secureStore.setItemAsync('auth_username', userDisplayName);
  await secureStore.setItemAsync('auth_roles', JSON.stringify(roles));
  if (userId) await secureStore.setItemAsync('auth_user_id', userId);
  
  return {
    token: data.access_token,
    refreshToken: data.refresh_token,
    userName: userDisplayName,
    userRoles: roles,
    userId,
  };
}

export default authService;