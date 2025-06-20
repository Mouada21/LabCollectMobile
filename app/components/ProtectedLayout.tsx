import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import AccessDeniedScreen from './AccessDeniedScreen';

interface ProtectedLayoutProps {
  children: React.ReactNode;
  requiredRoles: string[];
}

const ProtectedLayout: React.FC<ProtectedLayoutProps> = ({ 
  children, 
  requiredRoles 
}) => {
  const { auth, hasRole } = useAuth();
  const router = useRouter();

  // Debug roles (this will help us see what's happening)
  useEffect(() => {
    if (auth.isAuthenticated) {
      console.log('Current user roles:', auth.userRoles);
      console.log('Required roles:', requiredRoles);
      console.log('Has required roles:', hasRole(requiredRoles));
      
      // Case-insensitive check for debugging
      const hasRoleCaseInsensitive = auth.userRoles.some(userRole => 
        requiredRoles.some(reqRole => 
          userRole.toLowerCase() === reqRole.toLowerCase()
        )
      );
      console.log('Has roles (case-insensitive):', hasRoleCaseInsensitive);
    }
  }, [auth.isAuthenticated, auth.userRoles, requiredRoles]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!auth.loading && !auth.isAuthenticated) {
      router.replace('/(auth)/login');
    }
  }, [auth.isAuthenticated, auth.loading]);

  // Show loading indicator while checking auth state
  if (auth.loading) {
    return null; // Will use the loader from _layout.tsx
  }

  // Modified role check to handle case-insensitivity
  const hasRequiredRole = auth.isAuthenticated && (
    hasRole(requiredRoles) || 
    auth.userRoles.some(userRole => 
      requiredRoles.some(reqRole => 
        userRole.toLowerCase() === reqRole.toLowerCase()
      )
    )
  );

  // If authenticated but doesn't have required role, show access denied
  if (auth.isAuthenticated && !hasRequiredRole) {
    return (
      <AccessDeniedScreen 
        requiredRole={requiredRoles.join(' or ')}
        message="You don't have permission to access the LabCollect application. This app is only available for users with sampling responsibilities."
      />
    );
  }

  // If user is authenticated and has required role, render children
  return auth.isAuthenticated ? <>{children}</> : null;
};

export default ProtectedLayout;