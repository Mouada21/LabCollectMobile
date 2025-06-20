import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DevLoginScreen from '../screens/DevLoginScreen';
import LoginScreen from '../screens/LoginScreen';

export default function LoginRoute() {
  const [useDevLogin, setUseDevLogin] = useState(false);
  
  // If user has chosen to use dev login, show it
  if (useDevLogin) {
    return <DevLoginScreen />;
  }
  
  // Otherwise show regular login with dev option
  return (
    <View style={{ flex: 1 }}>
      <LoginScreen />
      
      {/* Dev mode switch only in development */}
      {__DEV__ && (
        <View style={styles.devContainer}>
          <TouchableOpacity 
            style={styles.devButton}
            onPress={() => setUseDevLogin(true)}
          >
            <Text style={styles.devButtonText}>
              Use Dev Login
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  devContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 8,
    padding: 3,
  },
  devButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  devButtonText: {
    color: '#fff',
    fontSize: 12,
  }
});