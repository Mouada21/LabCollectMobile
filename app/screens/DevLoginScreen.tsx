import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Button, StyleSheet, Text, View } from 'react-native';
import { secureStore } from '../utils/secureStoreWeb';

export default function DevLoginScreen() {
  const router = useRouter();
  
  const handleDevLogin = async () => {
    try {
      console.log('Using development login bypass');
      
      // Create mock tokens with extended expiration
      const mockToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjMjQ3MzcyNS03OTRiLTQ5OWMtOWE1NS1kMzVhNGQ2OGRkMDQiLCJuYW1lIjoiU2FtcGxlciBVc2VyIiwicm9sZXMiOlsiU0FNUExFUiJdLCJyZWFsbV9hY2Nlc3MiOnsicm9sZXMiOlsiU0FNUExFUiJdfSwicHJlZmVycmVkX3VzZXJuYW1lIjoic2FtcGxlciIsImV4cCI6OTk5OTk5OTk5OSwiaWF0IjoxNTE2MjM5MDIyfQ.fake-signature";
      const mockRefreshToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjMjQ3MzcyNS03OTRiLTQ5OWMtOWE1NS1kMzVhNGQ2OGRkMDQiLCJyZWZyZXNoIjp0cnVlLCJleHAiOjk5OTk5OTk5OTksImlhdCI6MTUxNjIzOTAyMn0.fake-signature";
      
      // Store tokens and user info in secure storage
      await secureStore.setItemAsync('auth_token', mockToken);
      await secureStore.setItemAsync('auth_refresh_token', mockRefreshToken);
      await secureStore.setItemAsync('auth_username', 'Sampler');
      await secureStore.setItemAsync('auth_roles', JSON.stringify(['SAMPLER']));
      await secureStore.setItemAsync('auth_user_id', 'c2473725-794b-499c-9a55-d35a4d68dd04');
      
      Alert.alert('DEV Mode', 'Login successful! Redirecting to dashboard...');
      
      // Navigate to dashboard after tokens are stored
      setTimeout(() => {
        router.replace('/(tabs)/dashboard');
      }, 500);
    } catch (error) {
      console.error('Dev login error:', error);
      Alert.alert('Error', 'Development login failed');
    }
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>LabCollect Mobile</Text>
      <Text style={styles.subtitle}>Development Mode</Text>
      
      <View style={styles.card}>
        <Text style={styles.cardText}>
          Connection to authentication server failed. Use the development login instead.
        </Text>
        
        <Button 
          title="Login as Sampler (DEV)" 
          onPress={handleDevLogin} 
          color="#4169E1"
        />
      </View>
      
      <Text style={styles.note}>
        Note: This screen appears because authentication is not working in development mode.
        The development login uses hardcoded credentials for testing.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 30,
    color: '#666',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 30,
  },
  cardText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  note: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
});