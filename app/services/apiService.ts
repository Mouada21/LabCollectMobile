import { API_BASE_URL } from '../config/keycloakConfig';
import { useAuth } from '../contexts/AuthContext';

// Create an authenticated API client
export const createApiClient = () => {
  const { auth, refreshAuth } = useAuth();
  
  const apiClient = {
    fetch: async (endpoint: string, options: RequestInit = {}) => {
      // Ensure we have a token
      if (!auth.token) {
        throw new Error('No authentication token available');
      }
      
      // Create headers with auth token
      const headers = {
        'Authorization': `Bearer ${auth.token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      };
      
      try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          headers,
        });
        
        // Handle 401 Unauthorized - try to refresh token and retry
        if (response.status === 401) {
          // Try to refresh the token
          const newToken = await refreshAuth();
          
          if (newToken) {
            // Retry with new token
            headers['Authorization'] = `Bearer ${newToken}`;
            return fetch(`${API_BASE_URL}${endpoint}`, {
              ...options,
              headers,
            });
          } else {
            throw new Error('Session expired. Please log in again.');
          }
        }
        
        return response;
      } catch (error) {
        console.error(`API request failed for ${endpoint}:`, error);
        throw error;
      }
    },
    
    // Convenience methods
    get: async (endpoint: string) => {
      return apiClient.fetch(endpoint, { method: 'GET' });
    },
    
    post: async (endpoint: string, data: any) => {
      return apiClient.fetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    
    put: async (endpoint: string, data: any) => {
      return apiClient.fetch(endpoint, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    
    delete: async (endpoint: string) => {
      return apiClient.fetch(endpoint, { method: 'DELETE' });
    },
  };
  
  return apiClient;
};

// Add this default export
export default { createApiClient };