// import { NavigationContainer } from '@react-navigation/native';
// import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { Text, View } from 'react-native';

// Define types for stack navigation (keep for reference)
export type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  Samples: undefined;
  SampleDetail: { sampleId: string };
  Profile: undefined;
  NewSample: undefined;
};

// Simple placeholder component - this entire file is deprecated
const AppNavigator = () => {
  return (
    <View style={{ padding: 20 }}>
      <Text>Using Expo Router instead of this navigator</Text>
    </View>
  );
};

export default AppNavigator;