/**
 * Custom UUID v4 generator that works with React Native's Hermes engine
 * Since Hermes doesn't support crypto.getRandomValues()
 */
export function generateUUID(): string {
  // Create an array of random hex values
  const hexValues = [];
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      hexValues[i] = '-';
    } else if (i === 14) {
      hexValues[i] = '4'; // UUID version 4
    } else {
      // Generate a random number between 0 and 15
      const randomValue = Math.floor(Math.random() * 16);
      hexValues[i] = (i === 19 ? (randomValue & 0x3 | 0x8).toString(16) : randomValue.toString(16));
    }
  }
  return hexValues.join('');
}