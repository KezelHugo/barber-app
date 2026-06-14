import React from 'react';
import { Redirect } from 'expo-router';

export default function IndexScreen() {
  // Automatically redirect the user to the Login screen upon entering the application
  return <Redirect href="/(auth)/login" />;
}