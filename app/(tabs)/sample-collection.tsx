import { useLocalSearchParams } from 'expo-router';
import SampleCollectionScreen from '../screens/SampleCollectionScreen';

export default function SampleCollectionRoute() {
  const { sampleId } = useLocalSearchParams();
  return <SampleCollectionScreen sampleId={sampleId as string} />;
}