import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { MD3LightTheme, MD3DarkTheme, PaperProvider } from 'react-native-paper';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { UserRoleProvider } from '@/context/user-role';

export const unstable_settings = {
  initialRouteName: 'index',
};

// Premium Gold/Charcoal themes
const customLightTheme = {
  ...MD3LightTheme,
  roundness: 12,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#C5A880',      // Soft Luxury Gold
    primaryContainer: '#F3ECE0',
    secondary: '#1A1A1A',    // Dark Charcoal
    secondaryContainer: '#EAEAEA',
    background: '#FDFBF7',   // Cream White
    surface: '#FFFFFF',
    surfaceVariant: '#F5F2EC',
    outline: '#CCCCCC',
    error: '#BA1A1A',
    backdrop: 'rgba(0, 0, 0, 0.70)', // Atenuado profundo para destacar el modal
  },
};

const customDarkTheme = {
  ...MD3DarkTheme,
  roundness: 12,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#D4AF37',      // Bright Luxury Gold
    primaryContainer: '#3E341B',
    secondary: '#ECEDEE',    // Light text/elements
    secondaryContainer: '#2D2D2D',
    background: '#121212',   // Premium Dark Carbon
    surface: '#1E1E1E',      // Card backgrounds
    surfaceVariant: '#2A2A2A',
    outline: '#444444',
    error: '#FFB4AB',
    backdrop: 'rgba(0, 0, 0, 0.85)', // Atenuado cinematográfico en modo oscuro
  },
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const paperTheme = isDark ? customDarkTheme : customLightTheme;
  const navTheme = isDark ? DarkTheme : DefaultTheme;

  // Sync navTheme colors with our premium design
  const customNavTheme = {
    ...navTheme,
    colors: {
      ...navTheme.colors,
      primary: paperTheme.colors.primary,
      background: paperTheme.colors.background,
      card: paperTheme.colors.surface,
      text: isDark ? '#ECEDEE' : '#11181C',
      border: paperTheme.colors.outline,
    },
  };

  return (
    <UserRoleProvider>
      <PaperProvider theme={paperTheme}>
        <ThemeProvider value={customNavTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(customer)" />
            <Stack.Screen name="(barber)" />
            <Stack.Screen name="(admin)" />
            <Stack.Screen name="(reservation)" options={{ presentation: 'modal' }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </PaperProvider>
    </UserRoleProvider>
  );
}