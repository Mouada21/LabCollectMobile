import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';

// Must be exported as default
export default function App() {
  return <ExpoRoot context={require.context('.')} />;
}

registerRootComponent(App);