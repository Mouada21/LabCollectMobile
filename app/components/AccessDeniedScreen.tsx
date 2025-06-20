import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

interface AccessDeniedScreenProps {
  requiredRole: string;
  message?: string;
}

const AccessDeniedScreen: React.FC<AccessDeniedScreenProps> = ({ 
  requiredRole,
  message = 'You do not have permission to access this content.' 
}) => {
  const router = useRouter();
  const { logout } = useAuth();
  
  const handleLogout = async () => {
    try {
      Alert.alert(
        'Logout',
        'Would you like to log out and try with a different account?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Logout', 
            style: 'destructive',
            onPress: async () => {
              await logout();
              router.replace('/(auth)/login');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };
  
  return (
    <View style={styles.container}>
      <Icon name="shield-alert" size={80} color="#EF4444" />
      <Text style={styles.title}>Access Denied</Text>
      <Text style={styles.message}>{message}</Text>
      <Text style={styles.roleText}>
        Required role: <Text style={styles.roleBadge}>{requiredRole}</Text>
      </Text>
      
      <TouchableOpacity
        style={styles.button}
        onPress={handleLogout}
      >
        <Icon name="logout" size={20} color="#FFFFFF" style={styles.buttonIcon} />
        <Text style={styles.buttonText}>Logout & Switch Account</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F9FAFB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 16,
    maxWidth: 300,
  },
  roleText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  roleBadge: {
    fontWeight: 'bold',
    color: '#EF4444',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4169E1',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default AccessDeniedScreen;