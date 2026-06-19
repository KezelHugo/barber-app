import { useRouter } from 'expo-router';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { auth, db } from '../config/firebase';

export type UserRole = 'customer' | 'barber' | 'admin' | 'guest';

interface UserRoleContextType {
  role: UserRole;
  isLoggedIn: boolean;
  userEmail: string;
  userName: string;
  signIn: (email: string, password: string) => Promise<UserRole>;
  signUp: (name: string, email: string, phone: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  loginAsGuest: () => void;
  logout: () => void;
}

const UserRoleContext = createContext<UserRoleContextType | undefined>(undefined);

export const UserRoleProvider = ({ children }: { children: ReactNode }) => {
  const [role, setRole] = useState<UserRole>('guest');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>('Invitado');
  const [userEmail, setUserEmail] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  // Listen to auth state changes to persist login
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setRole(userData.role as UserRole);
            setUserName(userData.name || 'Usuario');
            setUserEmail(user.email || '');
            setIsLoggedIn(true);
          } else {
            // Fallback default
            setRole('customer');
            setUserName(user.email?.split('@')[0] || 'Usuario');
            setUserEmail(user.email || '');
            setIsLoggedIn(true);
          }
        } catch (err) {
          console.error("Error al cargar perfil de Firestore:", err);
        }
      } else {
        setRole('guest');
        setIsLoggedIn(false);
        setUserName('Invitado');
        setUserEmail('');
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string): Promise<UserRole> => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Fetch user profile from Firestore
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      throw new Error('El perfil de usuario no está registrado en la base de datos de la barbería.');
    }

    const userData = userDoc.data();
    const userRole = userData.role as UserRole;

    setRole(userRole);
    setUserName(userData.name || 'Usuario');
    setUserEmail(user.email || '');
    setIsLoggedIn(true);

    // Route reactive redirection
    if (userRole === 'customer') {
      router.replace('/(customer)/home');
    } else if (userRole === 'barber') {
      router.replace('/(barber)/home');
    } else if (userRole === 'admin') {
      router.replace('/(admin)/dashboard');
    }
    return userRole;
  };

  const signUp = async (name: string, email: string, phone: string, password: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Write user profile to Firestore
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      name,
      email,
      phone,
      role: 'customer', // by default new registrations are customers
      photoUrl: '', // Default profile image is empty
      stylePreferences: '', // Default style preferences is empty
      createdAt: new Date().toISOString()
    });

    setRole('customer');
    setUserName(name);
    setUserEmail(email);
    setIsLoggedIn(true);

    router.replace('/(customer)/home');
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const loginAsGuest = () => {
    if (auth.currentUser) {
      signOut(auth);
    }
    setRole('guest');
    setIsLoggedIn(false);
    setUserName('Invitado');
    setUserEmail('');
    router.replace('/(customer)/home');
  };

  const logout = async () => {
    await signOut(auth);
    setRole('guest');
    setIsLoggedIn(false);
    setUserName('Invitado');
    setUserEmail('');
    router.replace('/(auth)/login');
  };

  return (
    <UserRoleContext.Provider
      value={{
        role,
        isLoggedIn,
        userEmail,
        userName,
        signIn,
        signUp,
        resetPassword,
        loginAsGuest,
        logout,
      }}
    >
      {!loading && children}
    </UserRoleContext.Provider>
  );
};

export const useUserRole = () => {
  const context = useContext(UserRoleContext);
  if (!context) {
    throw new Error('useUserRole debe usarse dentro de un UserRoleProvider');
  }
  return context;
};
