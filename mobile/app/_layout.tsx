import '../utils/suppressWarnings'; // must be first — overrides console.error before expo-notifications loads
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import * as WebBrowser from 'expo-web-browser';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { requestPermissions } from '../services/notifications';
import { setPendingSametha } from '../services/notificationState';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';

SplashScreen.preventAutoHideAsync();
WebBrowser.maybeCompleteAuthSession();

function AppShell() {
  const { isDark } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    requestPermissions();
    SplashScreen.hideAsync();

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const sametha = response.notification.request.content.data?.sametha as string | undefined;
      if (sametha) setPendingSametha(sametha);
    });

    return () => sub.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
