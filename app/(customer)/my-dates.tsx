import { auth, db } from '@/config/firebase';
import { collection, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Badge, Button, Card, Dialog, IconButton, Portal, SegmentedButtons, Snackbar, Text, useTheme } from 'react-native-paper';
import { useUserRole } from '@/context/user-role';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Appointment {
  id: string;
  service: string;
  barber: string;
  barberPhoto: string;
  date: string;
  time: string;
  price: string;
  status: 'pending' | 'paid' | 'completed' | 'cancelled';
  cancelable: boolean; // >24h
  rating?: number;
}

export default function MyDatesScreen() {
  const theme = useTheme();
  const { role, logout } = useUserRole();
  const isGuest = role === 'guest';

  const [activeTab, setActiveTab] = useState('upcoming');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Dialog visibility states
  const [payDialogVisible, setPayDialogVisible] = useState(false);
  const [cancelDialogVisible, setCancelDialogVisible] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');

  // Firestore real-time list of appointments for logged in customer
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    if (isGuest || !auth.currentUser) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'appointments'),
      where('customerId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Appointment[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const initials = data.barberName ? data.barberName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'B';
        list.push({
          id: docSnap.id,
          service: data.servicesSummary || 'Servicio de Barbería',
          barber: data.barberName || 'Barbero',
          barberPhoto: initials,
          date: data.date || '',
          time: data.time || '',
          price: `S/. ${data.totalPrice || 0}`,
          status: data.status || 'pending',
          cancelable: data.status === 'pending' || data.status === 'paid',
          rating: data.rating || 0
        });
      });
      setAppointments(list);
      setLoading(false);
    }, (err) => {
      console.error("Error al escuchar citas del cliente:", err);
      setLoading(false);
    });

    return unsubscribe;
  }, [isGuest]);

  const upcomingAppointments = appointments.filter(a => a.status === 'pending' || a.status === 'paid');
  const pastAppointments = appointments.filter(a => a.status === 'completed' || a.status === 'cancelled');

  const handlePayClick = (appt: Appointment) => {
    setSelectedAppointment(appt);
    setPayDialogVisible(true);
  };

  const handleCancelClick = (appt: Appointment) => {
    setSelectedAppointment(appt);
    setCancelDialogVisible(true);
  };

  const confirmPayment = async () => {
    if (selectedAppointment) {
      try {
        await updateDoc(doc(db, 'appointments', selectedAppointment.id), {
          status: 'paid'
        });
        setPayDialogVisible(false);
        setSnackbarMsg('¡Cita marcada como pagada con éxito!');
        setSnackbarVisible(true);
      } catch (err) {
        console.error("Error al actualizar estado del pago:", err);
        setSnackbarMsg('Error al actualizar el pago.');
        setSnackbarVisible(true);
      }
    }
  };

  const confirmCancel = async () => {
    if (selectedAppointment) {
      try {
        await updateDoc(doc(db, 'appointments', selectedAppointment.id), {
          status: 'cancelled'
        });
        setCancelDialogVisible(false);
        setSnackbarMsg('Tu cita ha sido cancelada exitosamente.');
        setSnackbarVisible(true);
      } catch (err) {
        console.error("Error al cancelar cita:", err);
        setSnackbarMsg('Error al cancelar la cita.');
        setSnackbarVisible(true);
      }
    }
  };

  const handleRate = async (apptId: string, stars: number) => {
    try {
      await updateDoc(doc(db, 'appointments', apptId), {
        rating: stars
      });
      setSnackbarMsg(`¡Gracias por calificar con ${stars} estrellas!`);
      setSnackbarVisible(true);
    } catch (err) {
      console.error("Error al enviar calificación:", err);
    }
  };

  if (isGuest) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background, justifyContent: 'center' }]}>
        <View style={styles.guestContainer}>
          <IconButton icon="calendar-lock" size={80} iconColor={theme.colors.primary} />
          <Text variant="headlineSmall" style={[styles.guestTitle, { color: theme.colors.secondary }]}>
            Mis Citas
          </Text>
          <Text variant="bodyMedium" style={styles.guestDesc}>
            Para ver tu agenda, pagar o calificar tus citas pasadas, debes iniciar sesión con una cuenta de cliente.
          </Text>
          <Button
            mode="contained"
            onPress={() => logout()}
            style={[styles.guestBtn, { backgroundColor: theme.colors.primary }]}
            labelStyle={{ color: '#121212', fontWeight: 'bold' }}
          >
            Iniciar Sesión / Registrarse
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      {/* Title */}
      <View style={styles.header}>
        <Text variant="headlineMedium" style={[styles.headerTitle, { color: theme.colors.secondary }]}>
          Mis Citas
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <SegmentedButtons
          value={activeTab}
          onValueChange={setActiveTab}
          buttons={[
            {
              value: 'upcoming',
              label: `Próximas (${upcomingAppointments.length})`,
              checkedColor: '#121212',
              style: activeTab === 'upcoming' ? { backgroundColor: theme.colors.primary } : {},
            },
            {
              value: 'past',
              label: `Historial (${pastAppointments.length})`,
              checkedColor: '#121212',
              style: activeTab === 'past' ? { backgroundColor: theme.colors.primary } : {},
            },
          ]}
          style={styles.segmented}
        />
      </View>

      {/* List */}
      <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator style={{ marginVertical: 40 }} color={theme.colors.primary} />
        ) : activeTab === 'upcoming' ? (
          upcomingAppointments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <IconButton icon="calendar-blank" size={48} iconColor={theme.colors.outline} />
              <Text variant="bodyLarge" style={{ opacity: 0.5 }}>No tienes citas programadas.</Text>
            </View>
          ) : (
            upcomingAppointments.map((item) => (
              <Card key={item.id} style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={2}>
                <Card.Content>
                  <View style={styles.cardHeader}>
                    <Badge style={[
                      styles.statusBadge,
                      { backgroundColor: item.status === 'paid' ? '#4CAF50' : theme.colors.primaryContainer,
                        color: item.status === 'paid' ? '#ffffff' : theme.colors.primary }
                    ]}>
                      {item.status === 'paid' ? 'PAGADO (PENDIENTE VALIDAR)' : 'PENDIENTE DE PAGO'}
                    </Badge>
                    <Text variant="titleSmall" style={{ opacity: 0.5 }}>#{item.id}</Text>
                  </View>

                  <Text variant="titleMedium" style={[styles.serviceTitle, { color: theme.colors.secondary }]}>
                    {item.service}
                  </Text>

                  <View style={styles.detailRow}>
                    <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>Barbero: </Text>
                    <Text variant="bodyMedium">{item.barber}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>Fecha y Hora: </Text>
                    <Text variant="bodyMedium" style={{ color: theme.colors.primary }}>
                      {item.date} - {item.time}
                    </Text>
                  </View>

                  <View style={styles.priceRow}>
                    <Text variant="titleMedium">Precio Total:</Text>
                    <Text variant="titleMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                      {item.price}
                    </Text>
                  </View>

                  <View style={styles.cardActions}>
                    {item.cancelable && (
                      <Button
                        mode="outlined"
                        onPress={() => handleCancelClick(item)}
                        style={[styles.actionBtn, { borderColor: theme.colors.error }]}
                        textColor={theme.colors.error}
                        compact
                      >
                        Cancelar
                      </Button>
                    )}
                    {item.status === 'pending' && (
                      <Button
                        mode="contained"
                        onPress={() => handlePayClick(item)}
                        style={[styles.actionBtn, { backgroundColor: theme.colors.primary }]}
                        labelStyle={{ color: '#121212', fontWeight: 'bold' }}
                        compact
                      >
                        Pagar con Yape/Plin
                      </Button>
                    )}
                  </View>
                </Card.Content>
              </Card>
            ))
          )
        ) : (
          pastAppointments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <IconButton icon="history" size={48} iconColor={theme.colors.outline} />
              <Text variant="bodyLarge" style={{ opacity: 0.5 }}>Historial vacío.</Text>
            </View>
          ) : (
            pastAppointments.map((item) => (
              <Card key={item.id} style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
                <Card.Content>
                  <View style={styles.cardHeader}>
                    <Badge style={[
                      styles.statusBadge,
                      { backgroundColor: item.status === 'cancelled' ? 'rgba(244, 67, 54, 0.15)' : 'rgba(76, 175, 80, 0.15)',
                        color: item.status === 'cancelled' ? '#F44336' : '#4CAF50' }
                    ]}>
                      {item.status === 'cancelled' ? 'CANCELADO' : 'ATENDIDO'}
                    </Badge>
                    <Text variant="titleSmall" style={{ opacity: 0.5 }}>#{item.id}</Text>
                  </View>

                  <Text variant="titleMedium" style={[styles.serviceTitle, { color: theme.colors.secondary }]}>
                    {item.service}
                  </Text>
                  
                  <Text variant="bodySmall" style={{ marginBottom: 12, opacity: 0.6 }}>
                    Atendido por {item.barber} el {item.date}
                  </Text>

                  {item.status === 'completed' && (
                    <View style={styles.ratingSection}>
                      <Text variant="bodyMedium" style={{ fontWeight: '500', marginBottom: 4 }}>
                        {item.rating && item.rating > 0 ? 'Tu Calificación:' : 'Califica el servicio:'}
                      </Text>
                      <View style={styles.starsRow}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <IconButton
                            key={star}
                            icon={star <= (item.rating || 0) ? 'star' : 'star-outline'}
                            iconColor={theme.colors.primary}
                            size={24}
                            style={{ margin: 0 }}
                            onPress={() => handleRate(item.id, star)}
                          />
                        ))}
                      </View>
                    </View>
                  )}
                </Card.Content>
              </Card>
            ))
          )
        )}
      </ScrollView>

      {/* Payment Modal with QR */}
      <Portal>
        <Dialog visible={payDialogVisible} onDismiss={() => setPayDialogVisible(false)} style={{ backgroundColor: theme.colors.surface }}>
          <Dialog.Title style={{ color: theme.colors.primary, textAlign: 'center' }}>Pago con Yape / Plin</Dialog.Title>
          <Dialog.Content style={{ alignItems: 'center' }}>
            <Text variant="bodyMedium" style={{ textAlign: 'center', marginBottom: 16 }}>
              Escanea el QR desde tu billetera digital preferida. Al finalizar, presiona "Confirmar Pago".
            </Text>
            
            {/* Visual QR Code Mock */}
            <View style={[styles.qrMock, { borderColor: theme.colors.primary }]}>
              <IconButton icon="qrcode" size={120} iconColor={theme.colors.secondary} style={{ margin: 0 }} />
              <View style={styles.qrCenterLogo}>
                <Text style={{ fontWeight: 'bold', fontSize: 10, color: theme.colors.primary }}>BARBER</Text>
              </View>
            </View>

            <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.secondary, marginTop: 12 }}>
              Monto a Pagar: {selectedAppointment?.price}
            </Text>
            <Text variant="bodySmall" style={{ opacity: 0.5, marginTop: 4 }}>
              Titular: BarberApp SAC
            </Text>
          </Dialog.Content>
          <Dialog.Actions style={{ justifyContent: 'space-between', paddingHorizontal: 16 }}>
            <Button onPress={() => setPayDialogVisible(false)} textColor={theme.colors.outline}>
              Cerrar
            </Button>
            <Button mode="contained" onPress={confirmPayment} style={{ backgroundColor: theme.colors.primary }} labelStyle={{ color: '#121212', fontWeight: 'bold' }}>
              Confirmar Pago
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Cancel Dialog */}
      <Portal>
        <Dialog visible={cancelDialogVisible} onDismiss={() => setCancelDialogVisible(false)} style={{ backgroundColor: theme.colors.surface }}>
          <Dialog.Title style={{ color: theme.colors.error }}>¿Cancelar cita?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              ¿Estás seguro de que deseas cancelar tu cita para el <Text style={{ fontWeight: 'bold' }}>{selectedAppointment?.date}</Text>?
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.error, marginTop: 8 }}>
              * Nota: Las citas se pueden cancelar sin penalización hasta 24 horas antes del servicio.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCancelDialogVisible(false)} textColor={theme.colors.outline}>
              No, mantener
            </Button>
            <Button onPress={confirmCancel} textColor={theme.colors.error} labelStyle={{ fontWeight: 'bold' }}>
              Sí, cancelar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={{ backgroundColor: theme.colors.secondary }}
      >
        <Text style={{ color: theme.colors.background, fontWeight: 'bold' }}>
          {snackbarMsg}
        </Text>
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  tabContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  segmented: {
    borderRadius: 8,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    gap: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    fontSize: 9,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  serviceTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.1)',
    paddingTop: 12,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
  actionBtn: {
    borderRadius: 6,
  },
  ratingSection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.1)',
    paddingTop: 12,
  },
  starsRow: {
    flexDirection: 'row',
    marginLeft: -8,
  },
  qrMock: {
    width: 160,
    height: 160,
    borderWidth: 3,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    position: 'relative',
  },
  qrCenterLogo: {
    position: 'absolute',
    backgroundColor: '#121212',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  guestContainer: {
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  guestTitle: {
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 10,
  },
  guestDesc: {
    textAlign: 'center',
    opacity: 0.65,
    marginBottom: 24,
    lineHeight: 20,
  },
  guestBtn: {
    width: '80%',
    paddingVertical: 4,
    borderRadius: 8,
  },
});