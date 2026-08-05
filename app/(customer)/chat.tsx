import { IconSymbol } from '@/components/ui/icon-symbol';
import { auth, db } from '@/config/firebase';
import { useRouter } from 'expo-router';
import { collection, doc, getDoc, increment, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Avatar, Button, Dialog, IconButton, Portal, Text, TextInput, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderRole: 'customer' | 'admin';
  senderName: string;
  text: string;
  createdAt: string;
  edited?: boolean;
  editedAt?: string;
}

const FIVE_MINUTES_MS = 5 * 60 * 1000;

export default function CustomerChatScreen() {
  const theme = useTheme();
  const router = useRouter();
  const currentUser = auth.currentUser;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // User details
  const [userName, setUserName] = useState<string>('Cliente');
  const [userPhone, setUserPhone] = useState<string>('');

  // Edit message state
  const [editDialogVisible, setEditDialogVisible] = useState(false);
  const [editingMsg, setEditingMsg] = useState<ChatMessage | null>(null);
  const [editText, setEditText] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);

  // Fetch user profile name and phone
  useEffect(() => {
    if (!currentUser) return;
    const fetchProfile = async () => {
      try {
        const uDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (uDoc.exists()) {
          const uData = uDoc.data();
          setUserName(uData.name || currentUser.email?.split('@')[0] || 'Cliente');
          setUserPhone(uData.phone || '');
        } else {
          setUserName(currentUser.email?.split('@')[0] || 'Cliente');
        }
      } catch (err) {
        console.error("Error al obtener perfil en chat:", err);
      }
    };
    fetchProfile();
  }, [currentUser]);

  // Reset unreadCountCustomer to 0 on mount
  useEffect(() => {
    if (!currentUser) return;
    const resetUnread = async () => {
      try {
        await updateDoc(doc(db, 'chats', currentUser.uid), {
          unreadCountCustomer: 0,
        });
      } catch (err) {
        // Doc might not exist yet
      }
    };
    resetUnread();
  }, [currentUser]);

  // Subscribe to real-time messages subcollection
  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const messagesRef = collection(db, 'chats', currentUser.uid, 'messages');

    const unsub = onSnapshot(messagesRef, (snapshot) => {
      const list: ChatMessage[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          senderId: data.senderId || '',
          senderRole: data.senderRole || 'customer',
          senderName: data.senderName || 'Usuario',
          text: data.text || '',
          createdAt: data.createdAt || new Date().toISOString(),
          edited: !!data.edited,
          editedAt: data.editedAt,
        });
      });

      list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setMessages(list);
      setLoading(false);

      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }, (err) => {
      console.error("Error al escuchar mensajes de cliente:", err);
      setLoading(false);
    });

    return unsub;
  }, [currentUser]);

  const handleSend = async () => {
    if (!inputText.trim() || !currentUser) return;
    setSending(true);

    const nowIso = new Date().toISOString();
    const textToSend = inputText.trim();
    setInputText('');

    try {
      // 1. Add message to subcollection
      const msgRef = doc(collection(db, 'chats', currentUser.uid, 'messages'));
      await setDoc(msgRef, {
        id: msgRef.id,
        senderId: currentUser.uid,
        senderRole: 'customer',
        senderName: userName,
        text: textToSend,
        createdAt: nowIso,
        edited: false,
      });

      // 2. Update parent chat document
      await setDoc(doc(db, 'chats', currentUser.uid), {
        id: currentUser.uid,
        customerId: currentUser.uid,
        customerName: userName,
        customerEmail: currentUser.email || '',
        customerPhone: userPhone,
        lastMessage: textToSend,
        lastMessageTime: nowIso,
        lastSenderRole: 'customer',
        unreadCountAdmin: increment(1),
        unreadCountCustomer: 0,
        updatedAt: nowIso,
      }, { merge: true });

    } catch (err) {
      console.error("Error al enviar mensaje del cliente:", err);
    } finally {
      setSending(false);
    }
  };

  const handleOpenEdit = (msg: ChatMessage) => {
    setEditingMsg(msg);
    setEditText(msg.text);
    setEditDialogVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editingMsg || !editText.trim() || !currentUser) return;

    // 5 minutes check
    const ageMs = Date.now() - new Date(editingMsg.createdAt).getTime();
    if (ageMs > FIVE_MINUTES_MS) {
      alert("No se puede editar este mensaje porque ya transcurrieron más de 5 minutos.");
      setEditDialogVisible(false);
      return;
    }

    setSavingEdit(true);
    try {
      await updateDoc(doc(db, 'chats', currentUser.uid, 'messages', editingMsg.id), {
        text: editText.trim(),
        edited: true,
        editedAt: new Date().toISOString(),
      });

      setEditDialogVisible(false);
      setEditingMsg(null);
    } catch (err) {
      console.error("Error al editar mensaje:", err);
    } finally {
      setSavingEdit(false);
    }
  };

  const formatMessageTime = (timeStr: string) => {
    try {
      const d = new Date(timeStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.headerRow, { backgroundColor: theme.colors.surface }]}>
        <IconButton icon="arrow-left" size={24} onPress={() => router.back()} style={{ marginLeft: -8 }} />
        <Avatar.Icon
          size={38}
          icon="headset"
          style={{ backgroundColor: theme.colors.primary, marginRight: 10 }}
          color="#121212"
        />
        <View style={{ flex: 1 }}>
          <Text variant="titleMedium" numberOfLines={1} style={{ fontWeight: 'bold', color: theme.colors.secondary }}>
            Soporte & Atención al Cliente
          </Text>
          <Text variant="bodySmall" numberOfLines={1} style={{ opacity: 0.5 }}>
            Respuesta en tiempo real de nuestro equipo
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text variant="bodySmall" style={{ marginTop: 8, opacity: 0.6 }}>Cargando conversación...</Text>
          </View>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.messagesContainer}
            showsVerticalScrollIndicator={false}
          >
            {messages.length === 0 ? (
              <View style={styles.welcomeBox}>
                <IconSymbol size={40} name="bubble.left.and.bubble.right.fill" color={theme.colors.primary} />
                <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.secondary, marginTop: 10 }}>
                  ¿En qué podemos ayudarte hoy?
                </Text>
                <Text variant="bodySmall" style={{ textAlign: 'center', opacity: 0.6, marginTop: 4, paddingHorizontal: 20 }}>
                  Envíanos tus preguntas sobre servicios, citas, pagos o promociones y te responderemos a la brevedad.
                </Text>
              </View>
            ) : (
              messages.map((msg) => {
                const isCustomer = msg.senderRole === 'customer';
                const ageMs = Date.now() - new Date(msg.createdAt).getTime();
                const canEdit = isCustomer && ageMs <= FIVE_MINUTES_MS;

                return (
                  <View
                    key={msg.id}
                    style={[
                      styles.messageBubbleContainer,
                      { justifyContent: isCustomer ? 'flex-end' : 'flex-start' }
                    ]}
                  >
                    <View
                      style={[
                        styles.bubble,
                        {
                          backgroundColor: isCustomer ? theme.colors.primary : theme.colors.surfaceVariant,
                          borderBottomRightRadius: isCustomer ? 2 : 14,
                          borderBottomLeftRadius: !isCustomer ? 2 : 14,
                        }
                      ]}
                    >
                      <Text
                        style={{
                          color: isCustomer ? '#121212' : theme.colors.secondary,
                          fontSize: 14,
                          lineHeight: 20
                        }}
                      >
                        {msg.text}
                      </Text>

                      <View style={styles.bubbleFooter}>
                        {msg.edited && (
                          <Text style={[styles.editedTag, { color: isCustomer ? 'rgba(0,0,0,0.6)' : theme.colors.primary }]}>
                            (EDITADO)
                          </Text>
                        )}
                        <Text style={[styles.timeText, { color: isCustomer ? 'rgba(0,0,0,0.6)' : theme.colors.outline }]}>
                          {formatMessageTime(msg.createdAt)}
                        </Text>
                        {canEdit && (
                          <TouchableOpacity onPress={() => handleOpenEdit(msg)} style={{ marginLeft: 6 }}>
                            <IconButton icon="pencil-outline" size={14} iconColor={isCustomer ? '#121212' : theme.colors.primary} style={{ margin: 0, padding: 0 }} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        )}

        {/* Input Bar */}
        <View style={[styles.inputBar, { backgroundColor: theme.colors.surface }]}>
          <TextInput
            placeholder="Escribe tu consulta..."
            value={inputText}
            onChangeText={setInputText}
            mode="outlined"
            style={styles.textInput}
            dense
          />
          <IconButton
            icon="send"
            size={24}
            iconColor={inputText.trim() ? theme.colors.primary : theme.colors.outline}
            disabled={!inputText.trim() || sending}
            onPress={handleSend}
          />
        </View>
      </KeyboardAvoidingView>

      {/* Edit Message Dialog */}
      <Portal>
        <Dialog
          visible={editDialogVisible}
          onDismiss={() => setEditDialogVisible(false)}
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: 'rgba(212, 175, 55, 0.35)',
          }}
        >
          <Dialog.Title style={{ color: theme.colors.primary, fontWeight: 'bold', fontSize: 18, paddingBottom: 4 }}>
            Editar Mensaje
          </Dialog.Title>
          <Dialog.Content style={{ paddingTop: 4 }}>
            <Text variant="bodySmall" style={{ opacity: 0.6, marginBottom: 12 }}>
              Solo puedes editar mensajes dentro de los primeros 5 minutos de envío.
            </Text>
            <TextInput
              value={editText}
              onChangeText={setEditText}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={{ backgroundColor: theme.colors.background, minHeight: 90 }}
              contentStyle={{ textAlignVertical: 'top', paddingTop: 10, paddingBottom: 10 }}
              outlineColor="rgba(212, 175, 55, 0.3)"
              activeOutlineColor={theme.colors.primary}
            />
          </Dialog.Content>
          <Dialog.Actions style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            <Button onPress={() => setEditDialogVisible(false)} textColor={theme.colors.outline} disabled={savingEdit}>
              Cancelar
            </Button>
            <Button
              onPress={handleSaveEdit}
              loading={savingEdit}
              disabled={savingEdit || !editText.trim()}
              mode="contained"
              style={{ backgroundColor: theme.colors.primary, borderRadius: 6, marginLeft: 8 }}
              labelStyle={{ color: '#121212', fontWeight: 'bold' }}
            >
              Guardar Cambios
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.1)',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  welcomeBox: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 40,
  },
  messageBubbleContainer: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  timeText: {
    fontSize: 10,
  },
  editedTag: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.1)',
  },
  textInput: {
    flex: 1,
    fontSize: 14,
  },
});
