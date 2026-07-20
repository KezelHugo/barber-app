import { IconSymbol } from '@/components/ui/icon-symbol';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { useTheme } from 'react-native-paper';

export default function AdminLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.outline,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.surfaceVariant,
          borderTopWidth: 1.5,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          paddingTop: 10,
          elevation: 8,
          shadowOpacity: 0.1,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: -3 },
        },
        tabBarLabelStyle: {
          fontWeight: '600',
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: 'Gestión Citas',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="calendar" color={color} />,
        }}
      />
      <Tabs.Screen
        name="catalog"
        options={{
          title: 'Catálogo',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="book.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="person.fill" color={color} />,
        }}
      />
      {/* Hidden barbers screen */}
      <Tabs.Screen
        name="barbers"
        options={{
          title: 'Barberos',
          href: null,
        }}
      />
      {/* Hidden barber detail screen */}
      <Tabs.Screen
        name="barber-detail"
        options={{
          title: 'Detalle Barbero',
          href: null,
        }}
      />
      {/* Hidden admins screen */}
      <Tabs.Screen
        name="admins"
        options={{
          title: 'Administradores',
          href: null,
        }}
      />
      {/* Hidden admin detail screen */}
      <Tabs.Screen
        name="admin-detail"
        options={{
          title: 'Detalle Administrador',
          href: null,
        }}
      />
      {/* Hidden customers screen */}
      <Tabs.Screen
        name="customers"
        options={{
          title: 'Clientes',
          href: null,
        }}
      />
      {/* Hidden customer detail screen */}
      <Tabs.Screen
        name="customer-detail"
        options={{
          title: 'Detalle Cliente',
          href: null,
        }}
      />
    </Tabs>
  );
}