import { API_BASE_URL } from '../config/keycloakConfig';
import { secureStore } from './secureStoreWeb';

/**
 * Returns the appropriate image source based on the URL format
 * Works with both base64 images and server file paths
 */
export function getImageSource(imageUrl: string | undefined | null) {
  if (!imageUrl) return null;
  
  // If it's a base64 data URL, use it directly
  if (imageUrl.startsWith('data:image') || imageUrl.startsWith('/9j/')) {
    return { uri: imageUrl.startsWith('data:image') ? imageUrl : `data:image/jpeg;base64,${imageUrl}` };
  }
  
  // If it's a relative URL (from our backend), prepend the API base URL
  if (imageUrl.startsWith('/api/')) {
    return { uri: `${API_BASE_URL}${imageUrl}` };
  }
  
  // Otherwise, use it as-is (might be a full URL)
  return { uri: imageUrl };
}

// Add this method for authenticated image fetching
export async function fetchAuthenticatedImage(url: string): Promise<string> {
  try {
    const token = await secureStore.getItemAsync('auth_token');
    
    if (!token) {
      throw new Error('No authentication token available');
    }
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Error fetching authenticated image:', error);
    return '';
  }
}