import { useLocalSearchParams } from 'expo-router';
import SampleDetailScreen from '../screens/SampleDetailScreen';

export default function() {
  const { sampleId } = useLocalSearchParams();
  return <SampleDetailScreen sampleId={sampleId as string} />;
}