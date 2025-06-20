import { API_BASE_URL } from '../config/keycloakConfig';
import { secureStore } from '../utils/secureStoreWeb';

// Interface for user profile response
export interface UserProfile {
  userId: string;
  authServerId: string;
  userName: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  address?: string;
  department?: string;
  position?: string;
  roles: string[];
  permissions: string[];
  active: boolean;
  preferences?: {
    theme?: string;
    notifications?: boolean;
    language?: string;
  };
  createdAt: string;
  lastLogin: string;
  profileImageUrl?: string;
  dateOfBirth?: string;
  nationalId?: string;
}

export const userService = {
  /**
   * Get user profile information
   */
  getUserProfile: async (): Promise<UserProfile> => {
    try {
      const token = await secureStore.getItemAsync('auth_token');
      
      if (!token) {
        throw new Error('No authentication token available');
      }
      
      console.log('=== USER SERVICE FETCH PROFILE ===');
      console.log('API URL:', `${API_BASE_URL}/api/v1/users/profile`);
      
      // INCREASE TIMEOUT TO 60 SECONDS
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('Request timeout reached (60s)');
        controller.abort();
      }, 60000); // 60 seconds instead of 30
      
      console.log('Making fetch request...');
      const startTime = Date.now();
      
      const response = await fetch(`${API_BASE_URL}/api/v1/users/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true' // ✅ Add this for ngrok
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`Fetch completed in ${duration}ms!`);
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Error response body:', errorData);
        throw new Error(`Failed to fetch user profile: ${response.status} - ${errorData}`);
      }
      
      console.log('Response OK, parsing JSON...');
      const profileData = await response.json();
      console.log('Profile data parsed successfully');
      
      return profileData;
    } catch (error) {
      console.error('=== USER SERVICE ERROR ===');
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out - server is taking too long to respond');
      }
      
      throw error;
    }
  },

  /**
   * Update user profile information
   */
  updateUserProfile: async (updatedProfile: Partial<UserProfile>): Promise<UserProfile> => {
    try {
      const token = await secureStore.getItemAsync('auth_token');
      
      if (!token) {
        throw new Error('No authentication token available');
      }
      
      const response = await fetch(`${API_BASE_URL}/api/v1/users/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedProfile)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update profile: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  },

  /**
   * Upload a profile image
   */
  uploadProfileImage: async (imageUri: string): Promise<UserProfile> => {
    try {
      const token = await secureStore.getItemAsync('auth_token');
      
      if (!token) {
        throw new Error('No authentication token available');
      }
      
      // Create form data for file upload
      const formData = new FormData();
      const fileNameParts = imageUri.split('/');
      const fileName = fileNameParts[fileNameParts.length - 1];
      
      formData.append('file', {
        uri: imageUri,
        name: fileName,
        type: 'image/jpeg', // Assuming JPEG, adjust if needed
      } as any);
      
      const response = await fetch(`${API_BASE_URL}/api/v1/users/profile/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Failed to upload profile image: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error uploading profile image:', error);
      throw error;
    }
  }
};

export default userService;