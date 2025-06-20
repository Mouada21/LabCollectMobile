import { useLocalSearchParams } from 'expo-router';
import SampleDetailScreen from '../../screens/SampleDetailScreen';

export default function SampleDetailRoute() {
  const { sampleId } = useLocalSearchParams();
  return <SampleDetailScreen sampleId={sampleId as string} />;
}