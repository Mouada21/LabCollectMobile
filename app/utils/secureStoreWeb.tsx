import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Check if running on web
const isWeb = typeof document !== 'undefined';

// Create web-compatible SecureStore implementations
const secureStoreUtils = {
  getItemAsync: async (key: string): Promise<string | null> => {
    if (isWeb) {
      return localStorage.getItem(key);
    } else {
      return SecureStore.getItemAsync(key);
    }
  },
  
  setItemAsync: async (key: string, value: string): Promise<void> => {
    if (isWeb) {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  
  deleteItemAsync: async (key: string): Promise<void> => {
    if (isWeb) {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  }
};

// Create a component for Expo Router compatibility
export default function SecureStoreWebPage() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Secure Storage Utilities</Text>
      <Text style={styles.text}>
        This is a utility module for secure storage.
        It&apos;s not meant to be accessed directly as a page.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  text: {
    textAlign: 'center',
    color: '#666',
  }
});

// Export the secureStore utilities for use in other files
export const secureStore = secureStoreUtils;