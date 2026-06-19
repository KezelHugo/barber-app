import { getApp, getApps, initializeApp } from 'firebase/app';
// @ts-ignore
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Reemplaza estas credenciales con las de tu proyecto en la consola de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCpowU-f9Z_1RpO9AQRF8eQ0zYyZ7IczIU",
  authDomain: "barberapp-d1efb.firebaseapp.com",
  projectId: "barberapp-d1efb",
  storageBucket: "barberapp-d1efb.firebasestorage.app",
  messagingSenderId: "341672335598",
  appId: "1:341672335598:web:ec0d5adef4b649c8673bff",
  measurementId: "G-4J74G6H4FL"
};

// Inicializa la app de Firebase previniendo duplicaciones durante el hot reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Inicializa la autenticación con persistencia persistente en dispositivos móviles (Android/iOS)
let firebaseAuth;
if (Platform.OS === 'web') {
  firebaseAuth = getAuth(app);
} else {
  // Para Android e iOS, usamos persistencia persistente para que no cierre sesión al cerrar la app
  firebaseAuth = getApps().length === 0 
    ? initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })
    : getAuth(app);
}

export const auth = firebaseAuth;
export const db = getFirestore(app);

