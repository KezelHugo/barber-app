import { IconSymbol } from '@/components/ui/icon-symbol';
import { db } from '@/config/firebase';
import { Tabs } from 'expo-router';
import { collection, onSnapshot } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useTheme } from 'react-native-paper';

export default function AdminLayout() {
  const theme = useTheme();
  const [unreadTotal, setUnreadTotal] = useState(0);

  // Subscribe to all chats to sum unreadCountAdmin
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'chats'), (snapshot) => {
      let sum = 0;
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.unreadCountAdmin && typeof data.unreadCountAdmin === 'number') {
          sum += data.unreadCountAdmin;
        }
      });
      setUnreadTotal(sum);
    }, (err) => {
      console.error("Error al escuchar unreadCountAdmin en admin layout:", err);
    });

    return unsub;
  }, []);

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
        name="chats"
        options={{
          title: 'Chats',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="bubble.left.and.bubble.right.fill" color={color} />,
          tabBarBadge: unreadTotal > 0 ? unreadTotal : undefined,
          tabBarBadgeStyle: {
            backgroundColor: theme.colors.error,
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: 'bold',
          },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="person.fill" color={color} />,
        }}
      />
      {/* Hidden chat detail screen */}
      <Tabs.Screen
        name="chat-detail"
        options={{
          title: 'Detalle de Chat',
          href: null,
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
      {/* Hidden working hours screen */}
      <Tabs.Screen
        name="working-hours"
        options={{
          title: 'Horarios de Atención',
          href: null,
        }}
      />
    </Tabs>
  );
}