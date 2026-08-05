import { getApp, getApps, initializeApp } from 'firebase/app';
// @ts-ignore
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Carga las credenciales usando variables de entorno nativas de Expo
export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Inicializa la app de Firebase previniendo duplicaciones durante el hot reload
const isNewApp = getApps().length === 0;
const app = isNewApp ? initializeApp(firebaseConfig) : getApp();

// Inicializa la autenticación con persistencia persistente en dispositivos móviles (Android/iOS)
let firebaseAuth;
if (Platform.OS === 'web') {
  firebaseAuth = getAuth(app);
} else {
  if (isNewApp) {
    firebaseAuth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } else {
    try {
      firebaseAuth = getAuth(app);
    } catch {
      firebaseAuth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    }
  }
}

export const auth = firebaseAuth;
export const db = getFirestore(app);

