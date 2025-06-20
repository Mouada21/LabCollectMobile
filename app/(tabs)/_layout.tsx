import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import ProtectedLayout from '../components/ProtectedLayout';

export default function TabsLayout() {
  return (
    <ProtectedLayout requiredRoles={['SAMPLER']}>
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: '#4169E1' },
          headerTintColor: '#fff',
          tabBarActiveTintColor: '#4169E1',
          tabBarInactiveTintColor: '#6B7280',
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="view-dashboard" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="samples"
          options={{
            title: 'Samples',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="flask" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="account-circle" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="[...sample]"
          options={{
            href: null, // This hides it from the tab bar
          }}
        />
        <Tabs.Screen
          name="new-sample"
          options={{
            href: null, // This hides it from the tab bar
          }}
        />
      </Tabs>
    </ProtectedLayout>
  );
}