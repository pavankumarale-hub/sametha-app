// Suppress Expo Go SDK 53+ push notification warning.
// This warning appears because Expo Go removed remote push support in SDK 53.
// It does not affect local notifications or production APK builds.
const orig = console.error.bind(console);
console.error = (...args: unknown[]) => {
  const msg = typeof args[0] === 'string' ? args[0] : '';
  if (msg.includes('expo-notifications') && msg.includes('Expo Go')) return;
  orig(...args);
};
