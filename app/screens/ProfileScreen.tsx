import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { API_BASE_URL } from '../config/keycloakConfig';
import { useAuth } from '../contexts/AuthContext';
import { UserProfile, userService } from '../services/userService';
import { secureStore } from '../utils/secureStoreWeb';

const ProfileScreen = () => {
  const { auth, logout } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<UserProfile>>({});
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Get user profile data
  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const userProfile = await userService.getUserProfile();
      setProfile(userProfile);
      setEditedProfile(userProfile); // Initialize edited profile with current data
    } catch (error) {
      console.error('Failed to load profile:', error);
      Alert.alert('Error', 'Failed to load user profile. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  useEffect(() => {
    fetchUserProfile();
  }, []);
  
  const handleRefresh = () => {
    setRefreshing(true);
    fetchUserProfile();
  };
  
  const handleLogout = async () => {
    try {
      Alert.alert(
        'Logout',
        'Are you sure you want to logout?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Logout', 
            style: 'destructive',
            onPress: async () => {
              await logout();
              // Navigation is handled automatically by the root component
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Logout Error', 'There was an error logging out. Please try again.');
    }
  };
  
  const handleEditProfile = () => {
    setEditMode(true);
  };
  
  const handleCancelEdit = () => {
    setEditMode(false);
    // Reset edited profile to current profile
    if (profile) {
      setEditedProfile(profile);
    }
  };
  
  const handleSaveProfile = async () => {
    if (!profile) return;
    
    try {
      setSaving(true);
      
      // Send update to server
      const updatedProfile = await userService.updateUserProfile(editedProfile);
      
      // Update local state
      setProfile(updatedProfile);
      setEditMode(false);
      setSaving(false);
      
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
      setSaving(false);
    }
  };
  
  const handleInputChange = (field: string, value: string) => {
    setEditedProfile(prev => ({ ...prev, [field]: value }));
  };
  
  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'You need to grant permission to access your photos');
      return;
    }
    
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        await uploadProfileImage(selectedImage.uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const uploadProfileImage = async (imageUri: string) => {
  try {
    const token = await secureStore.getItemAsync('auth_token');
    
    if (!token) {
      throw new Error('No authentication token available');
    }
    
    // Create form data for the file upload
    const formData = new FormData();
    
    // Extract filename from URI
    const filename = imageUri.split('/').pop() || '';
    
    // Determine file type (usually jpg from most phone cameras)
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    
    // Append the file to form data
    formData.append('file', {
      uri: imageUri,
      name: filename || 'profile.jpg',
      type,
    } as unknown as Blob);
    
    // Important: Use the mobile-specific endpoint
    const response = await fetch(
      `${API_BASE_URL}/api/v1/mobile/samples/profile-image`, 
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to upload profile image: ${response.status}`);
    }
    
    const data = await response.json();
    return data.imageUrl;
  } catch (error) {
    console.error('Error uploading profile image:', error);
    throw error;
  }
};
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };
  
  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };
  
  if (loading && !profile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4169E1" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }
  
  // Add this test function
  const testProfileEndpoint = async () => {
    try {
      const token = await secureStore.getItemAsync('auth_token');
      
      if (!token) {
        Alert.alert('Error', 'No authentication token available');
        return;
      }

      console.log('=== PROFILE ENDPOINT TEST ===');
      console.log('API URL:', `${API_BASE_URL}/api/v1/users/profile`);
      console.log('Token length:', token.length);
      console.log('Token (first 100 chars):', token.substring(0, 100) + '...');
      
      // Test with a timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      console.log('Making request...');
      const response = await fetch(`${API_BASE_URL}/api/v1/users/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log('Response received!');
      console.log('Response status:', response.status);
      console.log('Response statusText:', response.statusText);
      console.log('Response headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));
      
      if (response.ok) {
        console.log('Response is OK, parsing JSON...');
        const data = await response.json();
        console.log('Profile data received:', JSON.stringify(data, null, 2));
        Alert.alert('Success', `Profile loaded successfully!\n\nUser: ${data.firstName} ${data.lastName}\nEmail: ${data.email}`);
        
        // Update the profile state with the received data
        setProfile(data);
      } else {
        console.log('Response is NOT OK, getting error text...');
        const errorText = await response.text();
        console.error('Error response body:', errorText);
        Alert.alert('Error', `Failed to fetch profile: ${response.status}\n\nError: ${errorText}`);
      }
    } catch (error) {
      console.error('Profile test error:', error);
      
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('Request timed out');
        Alert.alert('Timeout', 'The request timed out. Your server might be slow or unreachable.');
      } else {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        console.error('Error details:', errorMessage);
        Alert.alert('Network Error', `Error: ${errorMessage}`);
      }
    }
  };

  // Add this function to ProfileScreen.tsx
const checkTokenValidity = async () => {
  try {
    const token = await secureStore.getItemAsync('auth_token');
    
    if (!token) {
      Alert.alert('Error', 'No token found');
      return;
    }
    
    // Decode the token to check expiry
    const decoded = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    const exp = decoded.exp;
    
    console.log('Token expiry:', new Date(exp * 1000));
    console.log('Current time:', new Date(now * 1000));
    console.log('Token expired:', exp < now);
    
    if (exp < now) {
      Alert.alert('Token Expired', 'Your authentication token has expired. Please log in again.');
    } else {
      Alert.alert('Token Valid', `Token expires at: ${new Date(exp * 1000).toLocaleString()}`);
    }
  } catch (error) {
    console.error('Token check error:', error);
    Alert.alert('Error', 'Failed to check token validity');
  }
};

  // Add this test function
  const testConnectivity = async () => {
    try {
      console.log('=== CONNECTIVITY TEST ===');
      
      // Test 1: Basic ping endpoint (should be fast)
      console.log('Testing ping endpoint...');
      const pingResponse = await fetch(`http://192.168.1.13:9090/api/public/mobile/ping`);
      console.log('Ping response:', pingResponse.status, pingResponse.ok);
      
      if (pingResponse.ok) {
        const pingData = await pingResponse.json();
        console.log('Ping data:', pingData);
      }
      
      // Test 2: Test with authentication token
      const token = await secureStore.getItemAsync('auth_token');
      if (token) {
        console.log('Testing authenticated health endpoint...');
        const healthResponse = await fetch(`http://192.168.1.13:9090/actuator/health`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });
        console.log('Health response:', healthResponse.status, healthResponse.ok);
      }
      
      Alert.alert(
        'Connectivity Test', 
        `Ping: ${pingResponse.ok ? 'OK' : 'Failed'}\nServer is reachable but profile endpoint may be slow.`
      );
    } catch (error) {
      console.error('Connectivity test error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      Alert.alert('Connectivity Test', `Error: ${errorMessage}`);
    }
  };

  // Add this comprehensive test function
  const runComprehensiveTest = async () => {
    console.log('=== COMPREHENSIVE CONNECTIVITY TEST ===');
    
    try {
      const token = await secureStore.getItemAsync('auth_token');
      
      // Test 1: Basic server connectivity
      console.log('Test 1: Basic server connectivity...');
      try {
        const basicResponse = await fetch('http://192.168.1.13:9090', {
          method: 'GET',
          headers: { 'Accept': 'text/html' }
        });
        console.log('Basic server response:', basicResponse.status, basicResponse.ok);
      } catch (error) {
        if (error instanceof Error) {
          console.error('Basic server test failed:', error.message);
        } else {
          console.error('Basic server test failed:', error);
        }
      }
      
      // Test 2: Public ping endpoint (should be fast)
      console.log('Test 2: Public ping endpoint...');
      try {
        const startTime = Date.now();
        const pingResponse = await fetch('http://192.168.1.13:9090/api/public/mobile/ping');
        const endTime = Date.now();
        console.log(`Ping response: ${pingResponse.status} (${endTime - startTime}ms)`);
        
        if (pingResponse.ok) {
          const pingData = await pingResponse.json();
          console.log('Ping data:', pingData);
        }
      } catch (error) {
        if (error instanceof Error) {
          console.error('Ping test failed:', error.message);
        } else {
          console.error('Ping test failed:', error);
        }
      }
      
      // Test 3: Health endpoint without auth
      console.log('Test 3: Health endpoint...');
      try {
        const healthResponse = await fetch('http://192.168.1.13:9090/actuator/health');
        console.log('Health response:', healthResponse.status, healthResponse.ok);
      } catch (error) {
        if (error instanceof Error) {
          console.error('Health test failed:', error.message);
        } else {
          console.error('Health test failed:', error);
        }
      }
      
      // Test 4: Profile endpoint with very long timeout
      if (token) {
        console.log('Test 4: Profile endpoint with extended timeout...');
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes!
          
          const startTime = Date.now();
          console.log('Starting profile request...');
          
          const profileResponse = await fetch('http://192.168.1.13:9090/api/v1/users/profile', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          const endTime = Date.now();
          const duration = endTime - startTime;
          
          console.log(`Profile response: ${profileResponse.status} (${duration}ms)`);
          
          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            console.log('Profile data received successfully!');
            console.log('User:', profileData.firstName, profileData.lastName);
            
            // Update the actual profile if successful
            setProfile(profileData);
            Alert.alert('Success!', `Profile loaded in ${duration}ms\n\nUser: ${profileData.firstName} ${profileData.lastName}`);
          } else {
            const errorText = await profileResponse.text();
            console.error('Profile error response:', errorText);
            Alert.alert('Profile Error', `Status: ${profileResponse.status}\n\nError: ${errorText}`);
          }
        } catch (error) {
          if (error instanceof Error) {
            console.error('Profile test failed:', error.message);
          } else {
            console.error('Profile test failed:', error);
          }
          
          if (error instanceof Error && error.name === 'AbortError') {
            Alert.alert('Timeout', 'Profile request timed out after 2 minutes. There may be a server performance issue.');
          } else {
            if (error instanceof Error) {
              Alert.alert('Profile Error', `Error: ${error.message}`);
            } else {
              Alert.alert('Profile Error', 'An unknown error occurred');
            }
          }
        }
      }
      
      // Test 5: Different API endpoint variants
      console.log('Test 5: Testing endpoint variants...');
      const endpointsToTest = [
        'http://192.168.1.13:9090/api/v1/users/profile',
        'http://192.168.1.13:9090/api/users/profile',
        'http://192.168.1.13:9090/users/profile'
      ];
      
      for (const endpoint of endpointsToTest) {
        try {
          console.log(`Testing: ${endpoint}`);
          const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json'
            }
          });
          console.log(`${endpoint}: ${response.status}`);
        } catch (error) {
          if (error instanceof Error) {
            console.log(`${endpoint}: Error - ${error.message}`);
          } else {
            console.log(`${endpoint}: Error - An unknown error occurred`);
          }
        }
      }
      
    } catch (error) {
      console.error('Comprehensive test failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      Alert.alert('Test Failed', errorMessage);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.header}>
          {/* Profile Image with Upload Option */}
          <TouchableOpacity 
            style={styles.avatarContainer} 
            onPress={handlePickImage}
            disabled={uploadingImage}
          >
            {uploadingImage ? (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="small" color="#FFFFFF" />
              </View>
            ) : (
              <>
                {profile?.profileImageUrl ? (
                  <Image 
                    source={{ uri: profile.profileImageUrl }} 
                    style={styles.avatar} 
                  />
                ) : (
                  <Icon name="account" size={60} color="#FFFFFF" />
                )}
                <View style={styles.editIconContainer}>
                  <Icon name="camera" size={18} color="#FFFFFF" />
                </View>
              </>
            )}
          </TouchableOpacity>
          
          <Text style={styles.userName}>
            {profile?.firstName && profile?.lastName
              ? `${profile.firstName} ${profile.lastName}`
              : profile?.userName || auth.userName || 'User'}
          </Text>
          <Text style={styles.userEmail}>{profile?.email || 'No email available'}</Text>
          
          {profile?.position && profile?.department && (
            <Text style={styles.userPosition}>
              {profile.position} • {profile.department}
            </Text>
          )}
          
          {/* Edit/Save Buttons */}
          {!editMode ? (
            <TouchableOpacity 
              style={styles.editButton} 
              onPress={handleEditProfile}
            >
              <Icon name="account-edit" size={16} color="#FFFFFF" />
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.editActions}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={handleCancelEdit}
              >
                <Icon name="close" size={16} color="#4169E1" />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveButton} 
                onPress={handleSaveProfile}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Icon name="content-save" size={16} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>Save</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <View style={styles.infoCard}>
            <Text style={styles.fieldLabel}>First Name</Text>
            {editMode ? (
              <TextInput
                style={styles.input}
                value={editedProfile.firstName || ''}
                onChangeText={(text) => handleInputChange('firstName', text)}
                placeholder="Enter first name"
              />
            ) : (
              <Text style={styles.fieldValue}>{profile?.firstName || 'Not provided'}</Text>
            )}
            
            <View style={styles.separator} />
            
            <Text style={styles.fieldLabel}>Last Name</Text>
            {editMode ? (
              <TextInput
                style={styles.input}
                value={editedProfile.lastName || ''}
                onChangeText={(text) => handleInputChange('lastName', text)}
                placeholder="Enter last name"
              />
            ) : (
              <Text style={styles.fieldValue}>{profile?.lastName || 'Not provided'}</Text>
            )}
            
            <View style={styles.separator} />
            
            <Text style={styles.fieldLabel}>Email</Text>
            {editMode ? (
              <TextInput
                style={styles.input}
                value={editedProfile.email || ''}
                onChangeText={(text) => handleInputChange('email', text)}
                placeholder="Enter email"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            ) : (
              <Text style={styles.fieldValue}>{profile?.email || 'Not provided'}</Text>
            )}
            
            <View style={styles.separator} />
            
            <Text style={styles.fieldLabel}>Phone Number</Text>
            {editMode ? (
              <TextInput
                style={styles.input}
                value={editedProfile.phoneNumber || ''}
                onChangeText={(text) => handleInputChange('phoneNumber', text)}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.fieldValue}>{profile?.phoneNumber || 'Not provided'}</Text>
            )}
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Work Details</Text>
          
          <View style={styles.infoCard}>
            <Text style={styles.fieldLabel}>Department</Text>
            {editMode ? (
              <TextInput
                style={styles.input}
                value={editedProfile.department || ''}
                onChangeText={(text) => handleInputChange('department', text)}
                placeholder="Enter department"
              />
            ) : (
              <Text style={styles.fieldValue}>{profile?.department || 'Not provided'}</Text>
            )}
            
            <View style={styles.separator} />
            
            <Text style={styles.fieldLabel}>Position</Text>
            {editMode ? (
              <TextInput
                style={styles.input}
                value={editedProfile.position || ''}
                onChangeText={(text) => handleInputChange('position', text)}
                placeholder="Enter position"
              />
            ) : (
              <Text style={styles.fieldValue}>{profile?.position || 'Not provided'}</Text>
            )}
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Icon name="account-key" size={22} color="#4169E1" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Username</Text>
                <Text style={styles.infoValue}>{profile?.userName || 'N/A'}</Text>
              </View>
            </View>
            
            <View style={styles.separator} />
            
            <View style={styles.infoRow}>
              <Icon name="shield-account" size={22} color="#4169E1" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Roles</Text>
                <Text style={styles.infoValue}>
                  {profile?.roles?.length ? profile.roles.join(', ') : 
                   auth.userRoles?.length ? auth.userRoles.join(', ') : 
                   'No roles assigned'}
                </Text>
              </View>
            </View>
            
            <View style={styles.separator} />
            
            <View style={styles.infoRow}>
              <Icon name="account-check" size={22} color="#4169E1" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Account Status</Text>
                <Text style={[
                  styles.infoValue, 
                  { color: profile?.active ? '#10B981' : '#EF4444' }
                ]}>
                  {profile?.active ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleLogout}>
            <Icon name="logout" size={22} color="#EF4444" />
            <Text style={styles.actionButtonText}>Logout</Text>
            <Icon name="chevron-right" size={22} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>LabCollect Mobile App v1.0.0</Text>
        </View>
        
        {/* Add both test buttons */}
        {__DEV__ && (
          <View style={{margin: 10}}>
            <TouchableOpacity 
              style={{backgroundColor: '#FF0000', padding: 10, marginBottom: 5}}
              onPress={testProfileEndpoint}
            >
              <Text style={{color: 'white'}}>TEST PROFILE ENDPOINT</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={{backgroundColor: '#0066FF', padding: 10, marginBottom: 5}}
              onPress={testConnectivity}
            >
              <Text style={{color: 'white'}}>TEST CONNECTIVITY</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Add this button to your render method */}
        {__DEV__ && (
  <View style={{margin: 10}}>
    <TouchableOpacity 
      style={{backgroundColor: '#FF6600', padding: 10, marginBottom: 5}}
      onPress={runComprehensiveTest}
    >
      <Text style={{color: 'white'}}>RUN COMPREHENSIVE TEST</Text>
    </TouchableOpacity>
  </View>
)}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    color: '#4B5563',
    fontSize: 16,
  },
  header: {
    backgroundColor: '#4169E1',
    paddingVertical: 30,
    alignItems: 'center',
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 2,
  },
  userPosition: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    marginBottom: 16,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
    marginLeft: 6,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4169E1',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    marginLeft: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
    marginLeft: 6,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  cancelButtonText: {
    color: '#4169E1',
    fontWeight: '500',
    marginLeft: 6,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4B5563',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  fieldLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  fieldValue: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    padding: 10,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#F9FAFB',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 16,
    color: '#111827',
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  actionButtonText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '500',
  },
  footer: {
    marginTop: 40,
    marginBottom: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});

export default ProfileScreen;