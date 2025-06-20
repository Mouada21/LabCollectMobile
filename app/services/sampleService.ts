import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { API_BASE_URL } from '../config/keycloakConfig';
import { DashboardData, Sample, SampleStatus, SampledData } from '../models/sample';
import { isConnected } from '../utils/networkUtils';
import { secureStore } from '../utils/secureStoreWeb';

/**
 * Service for handling Sample API calls
 */
export const sampleService = {
  /**
   * Get samples assigned to the current user
   */
  getAssignedSamples: async (): Promise<Sample[]> => {
  try {
    const token = await secureStore.getItemAsync('auth_token');
    
    if (!token) {
      throw new Error('No authentication token available');
    }
    
    // Use the new endpoint that should work reliably
    const response = await fetch(
      `${API_BASE_URL}/api/v1/mobile/samples/get-samples`, 
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      console.error('API Error:', response.status, response.statusText);
      throw new Error(`Failed to fetch samples: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('API Response data:', JSON.stringify(data).substring(0, 200) + '...');
    
    return data.samples || [];
  } catch (error) {
    console.error('Error in getAssignedSamples:', error);
    throw error;
  }
},
  
  /**
   * Get sample details by ID
   */
  getSampleById: async (sampleId: string): Promise<Sample> => {
    try {
      const token = await secureStore.getItemAsync('auth_token');
      
      if (!token) {
        throw new Error('No authentication token available');
      }
      
      // Use the correct API endpoint for getting a single sample
      const response = await fetch(`${API_BASE_URL}/api/v1/samples/${sampleId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch sample details: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching sample details:', error);
      throw error;
    }
  },

  /**
   * Extract the user ID from JWT token
   */
  getCurrentUserIdFromToken: async (token: string): Promise<string> => {
    try {
      // Try to get user ID from secure storage first
      const storedUserId = await secureStore.getItemAsync('user_id');
      if (storedUserId) {
        return storedUserId;
      }
      
      // If not available, try to decode the JWT token to get the user ID
      // This is a simplified example - in reality you might want to use a proper JWT decoder
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      const payload = JSON.parse(jsonPayload);
      return payload.sub || 'c2473725-794b-499c-9a55-d35a4d68dd04'; // Default to sampler ID if unable to extract
    } catch (error) {
      console.error('Error extracting user ID from token:', error);
      // Default to the sampler ID provided in the example
      return 'c2473725-794b-499c-9a55-d35a4d68dd04';
    }
  },
  
  /**
   * Update a sample's status
   */
  updateSampleStatus: async (sampleId: string, status: SampleStatus, notes?: string): Promise<Sample> => {
    try {
      const token = await secureStore.getItemAsync('auth_token');
      const userId = await secureStore.getItemAsync('auth_user_id');
      
      if (!token) {
        throw new Error('No authentication token available');
      }
      
      console.log(`Updating sample ${sampleId} status to ${status}`, notes ? `with notes: ${notes}` : '');
      
      const formData = new URLSearchParams();
      formData.append('status', status);
      if (notes) formData.append('notes', notes);
      
      // Add explicit userId parameter if your backend supports it
      if (userId) {
        formData.append('userId', userId);
      }
      
      const response = await fetch(`${API_BASE_URL}/api/v1/mobile/samples/${sampleId}/update-status`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData.toString()
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error response:', errorText);
        throw new Error(`Failed to update sample status: ${response.status}`);
      }
      
      return await sampleService.getSampleById(sampleId);
    } catch (error) {
      console.error('Error updating sample status:', error);
      
      // Store failed request for offline handling
      await sampleService.saveOfflineAction('updateSampleStatus', {
        sampleId,
        status,
        notes
      });
      
      throw error;
    }
  },

  /**
   * Get dashboard data for the current user
   */
  getDashboardData: async (): Promise<DashboardData> => {
    try {
      const token = await secureStore.getItemAsync('auth_token');
      
      if (!token) {
        throw new Error('No authentication token available');
      }
      
      const response = await fetch(`${API_BASE_URL}/api/v1/mobile/samples/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard data: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw error;
    }
  },

  /**
   * Submit sampling data for a collected sample
   */
  submitSamplingData: async (
  sampleId: string, 
  sampledData: SampledData
): Promise<Sample> => {
  try {
    // Check for network connectivity first
    const networkAvailable = await isConnected();
    
    // If offline, skip the API call entirely and save offline
    if (!networkAvailable) {
      console.log('No network connection, saving sample data for offline sync');
      await sampleService.saveOfflineAction('submitSamplingData', {
        sampleId,
        sampledData
      });
      
      // Also save in "local_samples" for immediate access
      await sampleService.saveLocalSampleData(sampleId, sampledData);
      
      // Return a mock success response
      return {
        id: sampleId,
        // Include whatever basic information we have
        status: SampleStatus.IN_PROGRESS,
        sampledData: sampledData,
        // Other required fields with placeholder values
        sampleCode: 'OFFLINE-' + sampleId.substring(0, 8),
        client: { id: '', name: 'Offline Mode' },
        sampler: { id: '', userName: '', firstName: '', lastName: '', email: '', active: true, fullName: 'Offline User' },
        missionDate: new Date().toISOString().split('T')[0],
        results: [],
        createdAt: new Date().toISOString(),
        updatedAt: null
      } as Sample;
    }
    
    // Online mode - try to get a fresh token
    let token;
    try {
      token = await sampleService.ensureValidToken();
    } catch (tokenError) {
      // If token refresh fails but we're online, try to get any token
      token = await secureStore.getItemAsync('auth_token');
      if (!token) {
        throw new Error('No authentication token available');
      }
    }
    
    // Rest of your function remains the same...
    if (!sampledData.gpsCoordinates) {
      sampledData.gpsCoordinates = {
        latitude: '0',
        longitude: '0',
        accuracy: 'unknown'
      };
    }
    
    if (!sampledData.samplingDateTime) {
      sampledData.samplingDateTime = new Date().toISOString();
    }
    
    // Before submitting, also save locally for immediate access
    await sampleService.saveLocalSampleData(sampleId, sampledData);
    
    // Submit sampling data
    const response = await fetch(`${API_BASE_URL}/api/v1/mobile/samples/${sampleId}/data`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sampledData)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to submit sample data: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error submitting sample data:', error);
    
    // Before giving up, save the data locally so it's not lost
    await sampleService.saveLocalSampleData(sampleId, sampledData);
    
    // Also store for offline sync
    await sampleService.saveOfflineAction('submitSamplingData', {
      sampleId,
      sampledData
    });
    
    throw error;
  }
},

// Add this new method for local storage of sample data
saveLocalSampleData: async (sampleId: string, sampledData: SampledData): Promise<void> => {
  try {
    // Get existing local samples
    const localSamplesJson = await AsyncStorage.getItem('local_samples');
    const localSamples = localSamplesJson ? JSON.parse(localSamplesJson) : {};
    
    // Add this sample's data
    localSamples[sampleId] = {
      sampledData,
      savedAt: new Date().toISOString()
    };
    
    // Save back to storage
    await AsyncStorage.setItem('local_samples', JSON.stringify(localSamples));
    console.log(`Saved sample data locally for sample ${sampleId}`);
  } catch (error) {
    console.error('Error saving sample data locally:', error);
  }
},

  /**
   * Upload a photo for the sample
   */
  uploadSamplePhoto: async (
    sampleId: string, 
    photoUri: string, 
    photoType: 'sample' | 'location' | 'label' = 'sample'
  ): Promise<{ photoUrl: string }> => {
    try {
      const token = await secureStore.getItemAsync('auth_token');
      
      if (!token) {
        throw new Error('No authentication token available');
      }
      
      // Create form data for file upload
      const formData = new FormData();
      
      // Add the photo file
      const fileNameParts = photoUri.split('/');
      const fileName = fileNameParts[fileNameParts.length - 1];
      
      formData.append('file', {
        uri: photoUri,
        name: fileName,
        type: 'image/jpeg', // Assuming JPEG, adjust if needed
      } as any);
      
      // Add photo type if specified
      formData.append('photoType', photoType);
      
      const response = await fetch(`${API_BASE_URL}/api/v1/samples/${sampleId}/photo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Failed to upload sample photo: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error uploading sample photo:', error);
      
      // Store the photo locally for later sync
      const offlinePhotoPath = await sampleService.storePhotoLocally(sampleId, photoUri, photoType);
      
      // Store failed request for offline handling
      await sampleService.saveOfflineAction('uploadSamplePhoto', {
        sampleId,
        photoUri: offlinePhotoPath,
        photoType
      });
      
      throw error;
    }
  },

  /**
   * Submit a signature to complete sample collection
   */
  submitSampleSignature: async (sampleId: any, signatureData: { signedBy: any; signatureImageBase64: any; }) => {
  try {
    // Network connectivity check
    const networkAvailable = await isConnected();
    if (!networkAvailable) {
      console.log('No network connection, saving signature for offline sync');
      await sampleService.saveOfflineAction('submitSampleSignature', {
        sampleId,
        signatureData
      });
      throw new Error('No network connection available');
    }
    
    // Get a fresh token
    let token;
    try {
      token = await sampleService.ensureValidToken();
    } catch (tokenError) {
      token = await secureStore.getItemAsync('auth_token');
      if (!token) {
        throw new Error('No authentication token available');
      }
    }
    
    const signature = {
      signedBy: signatureData.signedBy,
      signedAt: new Date().toISOString(),
      signatureImageUrl: signatureData.signatureImageBase64
    };
    
    // IMPORTANT: Use the mobile-specific signature endpoint
    const endpoint = `${API_BASE_URL}/api/v1/mobile/samples/${sampleId}/signature`;
    console.log(`Submitting signature for sample ${sampleId}, endpoint: ${endpoint}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ signature }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Signature submission error: Status ${response.status}, Response: ${errorText}`);
      throw new Error(`Failed to submit signature: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error submitting signature:', error);
    await sampleService.saveOfflineAction('submitSampleSignature', {
      sampleId,
      signatureData
    });
    throw error;
  }
},

  /**
   * Complete sample collection - handles both signature and status update
   */
  completeSampleCollection: async (
    sampleId: string,
    signatureData: {
      signedBy: string;
      signatureImageBase64: string;
    },
    notes: string
  ): Promise<Sample> => {
    try {
      // Check for network connectivity
      const networkAvailable = await isConnected();
      if (!networkAvailable) {
        console.log('No network connection, saving for offline sync');
        await sampleService.saveOfflineAction('completeSampleCollection', {
          sampleId,
          signatureData,
          notes
        });
        
        // Save success message to show to user
        await AsyncStorage.setItem(`sample_${sampleId}_collection_completed`, 'true');
        
        // Return a mock success response
        return {
          id: sampleId,
          status: SampleStatus.COLLECTED, // Simulate collected status for UI
          // Other required fields with placeholder values
          sampleCode: 'OFFLINE-' + sampleId.substring(0, 8),
          client: { id: '', name: 'Offline Mode' },
          sampler: { id: '', userName: '', firstName: '', lastName: '', email: '', active: true, fullName: 'Offline User' },
          missionDate: new Date().toISOString().split('T')[0],
          sampledData: {
            signature: {
              signedBy: signatureData.signedBy,
              signedAt: new Date().toISOString(),
              signatureImageUrl: 'offline'
            }
          },
          results: [],
          createdAt: new Date().toISOString(),
          updatedAt: null
        } as Sample;
      }
      
      // Get a valid token
      await sampleService.ensureValidToken();
      
      // Submit the signature
      await sampleService.submitSampleSignature(sampleId, signatureData);
      
      // Update the status to COLLECTED
      return await sampleService.updateSampleStatus(
        sampleId,
        SampleStatus.COLLECTED,
        notes
      );
    } catch (error) {
      console.error('Error completing sample collection:', error);
      
      // Store failed request for offline handling
      await sampleService.saveOfflineAction('completeSampleCollection', {
        sampleId,
        signatureData,
        notes
      });
      
      throw error;
    }
  },

  /**
   * Get samples assigned to the current user that haven't been collected yet
   */
  getPendingSamples: async (): Promise<Sample[]> => {
    try {
      const samples = await sampleService.getAssignedSamples();
      return samples.filter(sample => 
        sample.status === SampleStatus.PLANNED || 
        sample.status === SampleStatus.IN_PROGRESS
      );
    } catch (error) {
      console.error('Error fetching pending samples:', error);
      throw error;
    }
  },

  /**
   * Update multiple samples' status at once
   */
  updateMultipleSamplesStatus: async (
    sampleIds: string[],
    status: SampleStatus,
    notes?: string
  ): Promise<{ successCount: number; failedIds: string[] }> => {
    const successIds: string[] = [];
    const failedIds: string[] = [];
    
    for (const sampleId of sampleIds) {
      try {
        await sampleService.updateSampleStatus(sampleId, status, notes);
        successIds.push(sampleId);
      } catch (error) {
        console.error(`Failed to update sample ${sampleId}:`, error);
        failedIds.push(sampleId);
      }
    }
    
    return {
      successCount: successIds.length,
      failedIds
    };
  },

  /**
   * Copy sampling data from one sample to another
   */
  copySampleData: async (sourceSampleId: string, targetSampleId: string): Promise<Sample> => {
    try {
      // Get the source sample data
      const sourceSample = await sampleService.getSampleById(sourceSampleId);
      
      if (!sourceSample.sampledData) {
        throw new Error('Source sample has no sampling data to copy');
      }
      
      // Copy the data to the target sample
      const result = await sampleService.submitSamplingData(
        targetSampleId,
        {
          ...sourceSample.sampledData,
          // Reset signature and specific values that shouldn't be copied
          signature: undefined,
          barcode: undefined,
          samplingDateTime: new Date().toISOString(),
          remarks: sourceSample.sampledData.remarks ? 
            `Copied from ${sourceSample.sampleCode}. ${sourceSample.sampledData.remarks}` : 
            `Copied from ${sourceSample.sampleCode}`
        }
      );
      
      return result;
    } catch (error) {
      console.error('Error copying sample data:', error);
      throw error;
    }
  },

  /**
   * Store a photo locally for offline use
   */
  storePhotoLocally: async (
    sampleId: string, 
    photoUri: string, 
    photoType: string
  ): Promise<string> => {
    try {
      // Create a directory for offline photos if it doesn't exist
      const offlineDir = FileSystem.documentDirectory + 'offline_photos/';
      const dirInfo = await FileSystem.getInfoAsync(offlineDir);
      
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(offlineDir, { intermediates: true });
      }
      
      // Generate a unique filename for the photo
      const timestamp = new Date().getTime();
      const newFileName = `${sampleId}_${photoType}_${timestamp}.jpg`;
      const newFilePath = offlineDir + newFileName;
      
      // Copy the photo to our offline storage
      await FileSystem.copyAsync({
        from: photoUri,
        to: newFilePath
      });
      
      return newFilePath;
    } catch (error) {
      console.error('Error storing photo locally:', error);
      return photoUri; // Return original if failed
    }
  },

  /**
   * Store an offline action for later sync
   */
  saveOfflineAction: async (actionType: string, data: any): Promise<void> => {
    try {
      // Get existing offline actions
      const offlineActionsJson = await AsyncStorage.getItem('offline_actions');
      const offlineActions = offlineActionsJson ? JSON.parse(offlineActionsJson) : [];
      
      // Add new action
      offlineActions.push({
        id: Date.now().toString(),
        actionType,
        data,
        timestamp: new Date().toISOString()
      });
      
      // Save back to storage
      await AsyncStorage.setItem('offline_actions', JSON.stringify(offlineActions));
      
      console.log(`Saved offline action: ${actionType}`);
    } catch (error) {
      console.error('Error saving offline action:', error);
    }
  },

  /**
   * Synchronize all stored offline actions
   */
  syncOfflineActions: async (): Promise<{
    successful: number;
    failed: number;
    remaining: number;
  }> => {
    try {
      // Check for internet connectivity first
      const netInfo = { isConnected: true }; // Replace with actual network check
      
      if (!netInfo.isConnected) {
        throw new Error('No internet connection available for sync');
      }
      
      // Get stored offline actions
      const offlineActionsJson = await AsyncStorage.getItem('offline_actions');
      
      if (!offlineActionsJson) {
        return { successful: 0, failed: 0, remaining: 0 };
      }
      
      const offlineActions = JSON.parse(offlineActionsJson);
      const successful: string[] = [];
      const failed: string[] = [];
      
      // Process each action
      for (const action of offlineActions) {
        try {
          switch (action.actionType) {
            case 'updateSampleStatus':
              await sampleService.updateSampleStatus(
                action.data.sampleId,
                action.data.status,
                action.data.notes
              );
              break;
              
            case 'submitSamplingData':
              await sampleService.submitSamplingData(
                action.data.sampleId,
                action.data.sampledData
              );
              break;
              
            case 'uploadSamplePhoto':
              await sampleService.uploadSamplePhoto(
                action.data.sampleId,
                action.data.photoUri,
                action.data.photoType
              );
              break;
              
            case 'submitSampleSignature':
              await sampleService.submitSampleSignature(
                action.data.sampleId,
                action.data.signatureData
              );
              break;
              
            case 'completeSampleCollection':
              await sampleService.completeSampleCollection(
                action.data.sampleId,
                action.data.signatureData,
                action.data.notes
              );
              break;
              
            default:
              console.warn(`Unknown offline action type: ${action.actionType}`);
              failed.push(action.id);
              continue;
          }
          
          successful.push(action.id);
        } catch (error) {
          console.error(`Failed to sync offline action ${action.id}:`, error);
          failed.push(action.id);
        }
      }
      
      // Remove successful actions
      const remainingActions = offlineActions.filter(
        (action: OfflineAction) => !successful.includes(action.id)
      );
      
      // Save remaining actions back to storage
      await AsyncStorage.setItem('offline_actions', JSON.stringify(remainingActions));
      
      return {
        successful: successful.length,
        failed: failed.length,
        remaining: remainingActions.length
      };
    } catch (error) {
      console.error('Error syncing offline actions:', error);
      throw error;
    }
  },

  /**
   * Check if there are offline actions pending sync
   */
  hasPendingOfflineActions: async (): Promise<boolean> => {
    try {
      const offlineActionsJson = await AsyncStorage.getItem('offline_actions');
      const offlineActions = offlineActionsJson ? JSON.parse(offlineActionsJson) : [];
      return offlineActions.length > 0;
    } catch (error) {
      console.error('Error checking for offline actions:', error);
      return false;
    }
  },

  /**
   * Get the product catalog for sample collection
   */
  getProductCatalog: async (): Promise<any> => {
    const CATALOG_CACHE_KEY = 'product_catalog';
    const CATALOG_CACHE_EXPIRY = 'product_catalog_expiry';
    const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    try {
      // Try to get from cache first
      const cachedData = await AsyncStorage.getItem(CATALOG_CACHE_KEY);
      const cacheExpiry = await AsyncStorage.getItem(CATALOG_CACHE_EXPIRY);
      
      // If cache is valid, use it
      if (cachedData && cacheExpiry && Date.now() < parseInt(cacheExpiry)) {
        return JSON.parse(cachedData);
      }
      
      // If not cached or expired, fetch from server
      const token = await secureStore.getItemAsync('auth_token');
      
      if (!token) {
        throw new Error('No authentication token available');
      }
      
      console.log('Fetching catalog from API...');
      // Get catalog
      const response = await fetch(`${API_BASE_URL}/api/v1/catalog`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch product catalog: ${response.status}`);
      }
      
      const catalog = await response.json();
      
      // Transform the API response into the format expected by the app
      const transformedCatalog = transformCatalogForApp(catalog);
      
      // Cache the transformed result
      await AsyncStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(transformedCatalog));
      await AsyncStorage.setItem(CATALOG_CACHE_EXPIRY, (Date.now() + CACHE_TTL).toString());
      
      return transformedCatalog;
    } catch (error) {
      console.error('Error fetching product catalog:', error);
      
      // Try to get cached catalog even if expired
      try {
        const cachedCatalog = await AsyncStorage.getItem(CATALOG_CACHE_KEY);
        if (cachedCatalog) {
          return JSON.parse(cachedCatalog);
        }
      } catch (cacheError) {
        console.error('Error retrieving cached catalog:', cacheError);
      }
      
      // If all else fails, return default catalog
      return getDefaultCatalog();
    }
  },

  /**
   * Refresh the auth token if needed
   */
 ensureValidToken: async (): Promise<string> => {
  try {
    const token = await secureStore.getItemAsync('auth_token');
    const tokenExpiry = await secureStore.getItemAsync('auth_token_expiry');
    
    // If token is still valid, return it
    if (token && tokenExpiry && Date.now() < parseInt(tokenExpiry) - 30000) {
      return token;
    }
    
    console.log('Token expired or missing, refreshing...');
    
    // Get refresh token
    let refreshToken = await secureStore.getItemAsync('refresh_token');
    if (!refreshToken) {
      refreshToken = await secureStore.getItemAsync('auth_refresh_token');
    }
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    // Check for network connectivity
    const networkAvailable = await isConnected();
    if (!networkAvailable) {
      throw new Error('No network connection available for token refresh');
    }
    
    // Try our refreshTokenUsingMobileEndpoint method first
    try {
      console.log('Using mobile endpoint for token refresh');
      const tokenData = await sampleService.refreshTokenUsingMobileEndpoint(refreshToken);
      
      // Save the new tokens
      await secureStore.setItemAsync('auth_token', tokenData.access_token);
      await secureStore.setItemAsync('refresh_token', tokenData.refresh_token);
      await secureStore.setItemAsync('auth_refresh_token', tokenData.refresh_token);
      
      // Calculate and store expiry time
      const expiryTime = Date.now() + (tokenData.expires_in * 1000);
      await secureStore.setItemAsync('auth_token_expiry', expiryTime.toString());
      
      return tokenData.access_token;
    } catch (mobileRefreshError) {
      console.error('Mobile endpoint refresh failed:', mobileRefreshError);
      
      // Fall back to Keycloak direct refresh
      const keycloakResponse = await fetch(`${API_BASE_URL.replace('/api/v1', '')}/realms/LabCollect/protocol/openid-connect/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          'grant_type': 'refresh_token',
          'refresh_token': refreshToken,
          'client_id': 'labcollect-mobile'
        }).toString()
      });
      
      if (!keycloakResponse.ok) {
        const errorText = await keycloakResponse.text();
        console.error('Keycloak refresh error:', errorText);
        throw new Error(`Keycloak refresh failed: ${keycloakResponse.status}`);
      }
      
      const keycloakData = await keycloakResponse.json();
      
      // Save the new tokens
      await secureStore.setItemAsync('auth_token', keycloakData.access_token);
      await secureStore.setItemAsync('refresh_token', keycloakData.refresh_token);
      await secureStore.setItemAsync('auth_refresh_token', keycloakData.refresh_token);
      
      // Calculate and store expiry time
      const expiryTime = Date.now() + (keycloakData.expires_in * 1000);
      await secureStore.setItemAsync('auth_token_expiry', expiryTime.toString());
      
      return keycloakData.access_token;
    }
  } catch (error) {
    console.error('Token refresh error:', error);
    // If we have an existing token, return it even if expired for offline operations
    const token = await secureStore.getItemAsync('auth_token');
    if (token) {
      console.log('Using expired token for offline operations');
      return token;
    }
    throw error;
  }
},

  /**
   * Refresh token using the mobile endpoint
   */
  refreshTokenUsingMobileEndpoint: async (refreshToken: string) => {
  try {
    // Correctly use form URL encoded for the mobile endpoint
    const formData = new URLSearchParams();
    formData.append('refreshToken', refreshToken);
    
    console.log(`Attempting to refresh token using mobile endpoint: ${API_BASE_URL}/api/v1/mobile/samples/refresh-token`);
    
    const response = await fetch(`${API_BASE_URL}/api/v1/mobile/samples/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Token refresh error: ${response.status}`, errorText);
      throw new Error(`Token refresh failed: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Token refresh successful');
    return data;
  } catch (error) {
    console.error('Mobile token refresh failed:', error);
    throw error;
  }
}
};

export default sampleService;

/**
 * Interface for offline actions
 */
interface OfflineAction {
  id: string;
  actionType: string;
  data: any; // You can make this more specific if needed
  timestamp: string;
}

// Define interfaces for API response types
interface ContainerType {
  code: string;
  name: string;
}

interface StorageCondition {
  code: string;
  name: string;
}

interface StorageTemperature {
  code: string;
  name: string;
}

interface Category {
  code: string;
  name: string;
}

interface Parameter {
  code: string;
  name: string;
  unit?: string;
  minValue?: number;
  maxValue?: number;
}

interface ApiCatalog {
  containerTypes: ContainerType[];
  storageConditions: StorageCondition[];
  storageTemperatures: StorageTemperature[];
  categories: Record<string, Category[]>;
  parameters: Parameter[];
  productTypes: { code: string; name: string }[];
  analysisTypes: { code: string; name: string }[];
}

interface AppCatalog {
  categories: string[];
  containerTypes: string[];
  storageTemperatures: string[];
  storageConditions: string[];
  analyses: string[];
}

/**
 * Transform the catalog API response to the format expected by the app
 */
const transformCatalogForApp = (apiCatalog: ApiCatalog): AppCatalog => {
  // Extract all container types as simple strings
  const containerTypes = apiCatalog.containerTypes.map((item: ContainerType) => item.name);
  
  // Extract storage conditions as simple strings
  const storageConditions = apiCatalog.storageConditions.map((item: StorageCondition) => item.name);
  
  // Extract storage temperatures as simple strings
  const storageTemperatures = apiCatalog.storageTemperatures.map((item: StorageTemperature) => item.name);
  
  // Extract all product categories across all product types
  const allCategories: string[] = [];
  Object.values(apiCatalog.categories).forEach((categoryList: Category[]) => {
    categoryList.forEach((category: Category) => {
      allCategories.push(category.name);
    });
  });
  
  // Extract parameter names for analyses
  const analyses = apiCatalog.parameters.map((param: Parameter) => param.name);
  
  return {
    categories: allCategories,
    containerTypes,
    storageTemperatures,
    storageConditions,
    analyses
  };
};

/**
 * Get default catalog when API fails
 */
const getDefaultCatalog = (): AppCatalog => {
  return {
    categories: ['Municipal', 'Bottled', 'Industrial', 'Environmental', 'Other'],
    containerTypes: ['Plastic Bottle', 'Glass Bottle', 'Sterile Bag', 'Petri Dish', 'Tube'],
    storageTemperatures: ['Ambient (15-25°C)', 'Cold (2-8°C)', 'Frozen (-20°C)', 'Ultra-Low (-80°C)'],
    storageConditions: ['Ambient', 'Refrigerated (2-8°C)', 'Frozen (-20°C)', 'Deep Frozen (-80°C)', 'Protected from Light'],
    analyses: ['pH', 'Temperature', 'Turbidity', 'Conductivity', 'Dissolved Oxygen']
  };
};