import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Support multiple environment configurations
const getHostUri = () => {
  // In development mode, provide direct fallback options
  if (__DEV__) {
    // For Android emulator
    if (Platform.OS === 'android' && !Constants.isDevice) {
      return '192.168.1.13'; // Special IP for Android emulator to reach host
    }
    
    // For iOS simulator
    if (Platform.OS === 'ios' && !Constants.isDevice) {
      return 'localhost';
    }
    
    // For physical devices, use your computer's actual IP address
    if (Constants.isDevice) {
      return '192.168.1.13'; // Your actual WiFi IP address
    }
    
    // Try to get from manifest
    try {
      const { manifest } = Constants;
      if (manifest && manifest.debuggerHost) {
        return manifest.debuggerHost.split(':')[0];
      }
    } catch (e) {
      console.log('Could not get debugger host from manifest');
    }
  }
  
  // Fallback to your actual development machine IP
  return '192.168.1.13'; // Your actual WiFi IP address
};

const hostUri = getHostUri();

// Export with consistent IP addresses
export const API_BASE_URL = `https://db27-41-249-222-216.ngrok-free.app`;
export const KEYCLOAK_SERVER = `http://${hostUri}:8180`;
export const KEYCLOAK_REALM = 'LabCollect';
export const KEYCLOAK_CLIENT_ID = 'labcollect-mobile';