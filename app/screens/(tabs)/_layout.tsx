import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#4169E1' },
        headerTintColor: '#fff',
        tabBarActiveTintColor: '#4169E1',
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Icon name="view-dashboard" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="samples"
        options={{
          title: 'Samples',
          tabBarIcon: ({ color, size }) => (
            <Icon name="flask" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Icon name="account-circle" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="sample-detail"
        options={{
          title: 'Sample Details',
          href: null, // Hide tab
        }}
      />
      <Tabs.Screen
        name="new-sample"
        options={{
          title: 'New Sample',
          href: null, // Hide tab
        }}
      />
    </Tabs>
  );
}