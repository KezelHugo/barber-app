import { IconSymbol } from '@/components/ui/icon-symbol';
import { db } from '@/config/firebase';
import { useRouter } from 'expo-router';
import { collection, onSnapshot } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Avatar, Badge, Card, Searchbar, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

export interface CustomerChat {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  lastMessage: string;
  lastMessageTime: string;
  lastSenderRole: 'customer' | 'admin';
  unreadCountAdmin: number;
  updatedAt: string;
}

export default function AdminChatsScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [chats, setChats] = useState<CustomerChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Subscribe in real time to /chats collection
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'chats'), (snapshot) => {
      const list: CustomerChat[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          customerId: data.customerId || docSnap.id,
          customerName: data.customerName || 'Cliente',
          customerEmail: data.customerEmail || '',
          customerPhone: data.customerPhone || '',
          lastMessage: data.lastMessage || '',
          lastMessageTime: data.lastMessageTime || data.updatedAt || '',
          lastSenderRole: data.lastSenderRole || 'customer',
          unreadCountAdmin: Number(data.unreadCountAdmin) || 0,
          updatedAt: data.updatedAt || new Date().toISOString(),
        });
      });

      // Priority sort: Unread messages FIRST, then sorted by updatedAt descending
      list.sort((a, b) => {
        const aHasUnread = a.unreadCountAdmin > 0;
        const bHasUnread = b.unreadCountAdmin > 0;

        if (aHasUnread && !bHasUnread) return -1;
        if (!aHasUnread && bHasUnread) return 1;

        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });

      setChats(list);
      setLoading(false);
    }, (err) => {
      console.error("Error al escuchar chats en admin:", err);
      setLoading(false);
    });

    return unsub;
  }, []);

  const filteredChats = chats.filter((item) => {
    const queryLower = searchQuery.toLowerCase();
    const nameMatch = item.customerName.toLowerCase().includes(queryLower);
    const phoneMatch = item.customerPhone ? item.customerPhone.includes(queryLower) : false;
    const emailMatch = item.customerEmail ? item.customerEmail.toLowerCase().includes(queryLower) : false;
    return nameMatch || phoneMatch || emailMatch;
  });

  const formatChatTime = (timeStr: string) => {
    if (!timeStr) return '';
    try {
      const dateObj = new Date(timeStr);
      const today = new Date();
      const isToday = dateObj.toDateString() === today.toDateString();

      if (isToday) {
        return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else {
        return dateObj.toLocaleDateString([], { day: '2-digit', month: 'short' });
      }
    } catch {
      return '';
    }
  };

  const handleOpenChat = (item: CustomerChat) => {
    router.push({
      pathname: '/(admin)/chat-detail' as any,
      params: {
        customerId: item.customerId,
        customerName: item.customerName,
        customerEmail: item.customerEmail || '',
        customerPhone: item.customerPhone || '',
      }
    });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text variant="headlineSmall" style={[styles.headerTitle, { color: theme.colors.secondary }]}>
            Atención al Cliente
          </Text>
          <IconSymbol size={22} name="bubble.left.and.bubble.right.fill" color={theme.colors.primary} />
        </View>
        <Text variant="bodySmall" style={styles.headerSubtitle}>
          Canal de soporte y mensajes entrantes en tiempo real.
        </Text>
      </View>

      {/* Searchbar */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Buscar por nombre o teléfono..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={[styles.searchbar, { backgroundColor: theme.colors.surface }]}
          inputStyle={{ fontSize: 14 }}
          iconColor={theme.colors.primary}
        />
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="bodyMedium" style={{ marginTop: 12, opacity: 0.7 }}>Cargando conversaciones...</Text>
        </View>
      ) : filteredChats.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text variant="bodyLarge" style={{ opacity: 0.5 }}>
            {searchQuery ? 'No se encontraron conversaciones con la búsqueda.' : 'No hay mensajes entrantes por el momento.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredChats}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const hasUnread = item.unreadCountAdmin > 0;
            const initials = item.customerName
              ? item.customerName.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()
              : 'CL';

            return (
              <Card
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: hasUnread ? theme.colors.primary : 'rgba(150, 150, 150, 0.1)',
                    borderWidth: hasUnread ? 1.5 : 1,
                  }
                ]}
                elevation={hasUnread ? 3 : 1}
                onPress={() => handleOpenChat(item)}
              >
                <Card.Content style={styles.cardContent}>
                  <Avatar.Text
                    size={48}
                    label={initials}
                    style={{ backgroundColor: hasUnread ? theme.colors.primary : theme.colors.surfaceVariant }}
                    labelStyle={{ color: hasUnread ? '#121212' : theme.colors.primary, fontWeight: 'bold' }}
                  />

                  <View style={styles.textContent}>
                    <View style={styles.nameRow}>
                      <Text variant="titleMedium" numberOfLines={1} style={[styles.customerName, { color: theme.colors.secondary }]}>
                        {item.customerName}
                      </Text>
                      <Text variant="bodySmall" style={styles.timeText}>
                        {formatChatTime(item.lastMessageTime)}
                      </Text>
                    </View>

                    <View style={styles.messageRow}>
                      <Text
                        variant="bodyMedium"
                        numberOfLines={1}
                        style={[
                          styles.lastMessage,
                          {
                            color: hasUnread ? theme.colors.secondary : theme.colors.outline,
                            fontWeight: hasUnread ? 'bold' : 'normal'
                          }
                        ]}
                      >
                        {item.lastSenderRole === 'admin' ? 'Tú: ' : ''}{item.lastMessage || 'Conversación iniciada'}
                      </Text>

                      {hasUnread && (
                        <Badge style={[styles.unreadBadge, { backgroundColor: theme.colors.error }]}>
                          {item.unreadCountAdmin}
                        </Badge>
                      )}
                    </View>
                  </View>
                </Card.Content>
              </Card>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.1)',
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  headerSubtitle: {
    opacity: 0.5,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  searchbar: {
    borderRadius: 10,
    elevation: 2,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 10,
  },
  card: {
    borderRadius: 12,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  textContent: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  customerName: {
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  timeText: {
    opacity: 0.5,
    fontSize: 11,
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    flex: 1,
    marginRight: 8,
  },
  unreadBadge: {
    fontWeight: 'bold',
    color: '#ffffff',
  },
});
