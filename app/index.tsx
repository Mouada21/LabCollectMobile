import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from './contexts/AuthContext';

export default function Index() {
  const { auth, hasRole } = useAuth();

  if (auth.loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4169E1" />
      </View>
    );
  }

  if (auth.isAuthenticated) {
    // Only redirect to dashboard if user has SAMPLER role
    if (hasRole(['SAMPLER'])) {
      return <Redirect href="/(tabs)/dashboard" />;
    } else {
      // Otherwise, render the AccessDenied screen in (tabs)
      return <Redirect href="/(tabs)" />;
    }
  } else {
    return <Redirect href="/(auth)/login" />;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});