import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useRouter } from 'expo-router';

export type UserRole = 'customer' | 'barber' | 'admin' | 'guest';

interface UserRoleContextType {
  role: UserRole;
  isLoggedIn: boolean;
  userEmail: string;
  userName: string;
  loginAs: (selectedRole: 'customer' | 'barber' | 'admin', email?: string) => void;
  loginAsGuest: () => void;
  logout: () => void;
}

const UserRoleContext = createContext<UserRoleContextType | undefined>(undefined);

export const UserRoleProvider = ({ children }: { children: ReactNode }) => {
  const [role, setRole] = useState<UserRole>('guest');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>('Invitado');
  const [userEmail, setUserEmail] = useState<string>('');
  const router = useRouter();

  const loginAs = (selectedRole: 'customer' | 'barber' | 'admin', email: string = '') => {
    setRole(selectedRole);
    setIsLoggedIn(true);
    setUserEmail(email || `${selectedRole}@barberapp.com`);
    
    // Set premium names for role display
    if (selectedRole === 'customer') {
      setUserName('Kevin Guerrero');
      router.replace('/(customer)/home');
    } else if (selectedRole === 'barber') {
      setUserName('Carlos Mendoza (Barbero)');
      router.replace('/(barber)/home');
    } else if (selectedRole === 'admin') {
      setUserName('Administrador General');
      router.replace('/(admin)/dashboard');
    }
  };

  const loginAsGuest = () => {
    setRole('guest');
    setIsLoggedIn(false);
    setUserName('Invitado');
    setUserEmail('');
    router.replace('/(customer)/home');
  };

  const logout = () => {
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
        loginAs,
        loginAsGuest,
        logout,
      }}
    >
      {children}
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
