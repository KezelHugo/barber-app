import { Stack } from 'expo-router';

export default function ReservationLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="1-service" />
      <Stack.Screen name="2-barber" />
      <Stack.Screen name="3-date" />
      <Stack.Screen name="4-confirmation" />
    </Stack>
  );
}
