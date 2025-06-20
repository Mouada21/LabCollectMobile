import NetInfo from '@react-native-community/netinfo';

export const isConnected = async (): Promise<boolean> => {
  const netInfo = await NetInfo.fetch();
  return netInfo.isConnected === true;
};