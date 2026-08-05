import { auth, db } from '@/config/firebase';
import { collection, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Badge, Button, Card, Dialog, IconButton, Portal, SegmentedButtons, Snackbar, Text, useTheme } from 'react-native-paper';
import { useUserRole } from '@/context/user-role';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';

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
  createdAt?: string;
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
          rating: data.rating || 0,
          createdAt: data.createdAt || ''
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

  // Sort appointments descending by creation date (most recent first)
  const upcomingAppointments = appointments
    .filter(a => a.status === 'pending' || a.status === 'paid')
    .sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return b.id.localeCompare(a.id);
    });

  const pastAppointments = appointments
    .filter(a => a.status === 'completed' || a.status === 'cancelled')
    .sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return b.id.localeCompare(a.id);
    });

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
            upcomingAppointments.map((item) => {
              const isPaid = item.status === 'paid';
              return (
                <Card
                  key={item.id}
                  style={[
                    styles.card,
                    {
                      backgroundColor: theme.colors.surface,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: isPaid ? 'rgba(76, 175, 80, 0.3)' : 'rgba(212, 175, 55, 0.25)',
                    }
                  ]}
                  elevation={2}
                >
                  <Card.Content style={{ padding: 14 }}>
                    {/* Header: Status Badge & Code */}
                    <View style={styles.cardHeader}>
                      <Badge
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: isPaid ? 'rgba(76, 175, 80, 0.15)' : 'rgba(212, 175, 55, 0.15)',
                            color: isPaid ? '#4CAF50' : theme.colors.primary,
                            borderWidth: 1,
                            borderColor: isPaid ? 'rgba(76, 175, 80, 0.3)' : 'rgba(212, 175, 55, 0.3)',
                          }
                        ]}
                      >
                        {isPaid ? '✓ PAGO REGISTRADO' : 'PENDIENTE DE PAGO'}
                      </Badge>
                      <Text variant="labelSmall" style={{ opacity: 0.5 }}>#{item.id.substring(0, 8)}</Text>
                    </View>

                    {/* Service Title */}
                    <Text variant="titleMedium" style={[styles.serviceTitle, { color: theme.colors.secondary, marginTop: 4, marginBottom: 8 }]}>
                      {item.service}
                    </Text>

                    {/* Details Box */}
                    <View style={[styles.detailsBox, { backgroundColor: theme.colors.background }]}>
                      <View style={styles.detailRow}>
                        <IconSymbol size={15} name="person.fill" color={theme.colors.primary} style={{ marginRight: 8 }} />
                        <Text variant="bodyMedium" style={{ color: theme.colors.secondary }}>
                          Barbero: <Text style={{ fontWeight: 'bold' }}>{item.barber}</Text>
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <IconSymbol size={15} name="calendar" color={theme.colors.primary} style={{ marginRight: 8 }} />
                        <Text variant="bodyMedium" style={{ color: theme.colors.secondary }}>
                          Fecha: <Text style={{ fontWeight: 'bold' }}>{item.date}</Text>
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <IconSymbol size={15} name="clock" color={theme.colors.primary} style={{ marginRight: 8 }} />
                        <Text variant="bodyMedium" style={{ color: theme.colors.secondary }}>
                          Horario: <Text style={{ fontWeight: 'bold', color: theme.colors.primary }}>{item.time}</Text>
                        </Text>
                      </View>
                    </View>

                    {/* Banner feedback */}
                    {isPaid ? (
                      <View style={[styles.paidBanner, { backgroundColor: 'rgba(76, 175, 80, 0.12)', borderColor: 'rgba(76, 175, 80, 0.3)' }]}>
                        <IconSymbol size={18} name="checkmark.circle.fill" color="#4CAF50" style={{ marginRight: 8 }} />
                        <View style={{ flex: 1 }}>
                          <Text variant="labelMedium" style={{ color: '#4CAF50', fontWeight: 'bold' }}>
                            ¡Pago registrado con Yape/Plin!
                          </Text>
                          <Text variant="bodySmall" style={{ color: theme.colors.secondary, opacity: 0.7, fontSize: 11 }}>
                            Tu cita está lista. Preséntate en la barbería en el horario agendado.
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <View style={[styles.paidBanner, { backgroundColor: 'rgba(212, 175, 55, 0.08)', borderColor: 'rgba(212, 175, 55, 0.2)' }]}>
                        <IconSymbol size={18} name="info.circle.fill" color={theme.colors.primary} style={{ marginRight: 8 }} />
                        <Text variant="bodySmall" style={{ color: theme.colors.secondary, opacity: 0.8, flex: 1, fontSize: 11 }}>
                          Puedes pagar por adelantado con Yape/Plin o directamente en el local.
                        </Text>
                      </View>
                    )}

                    {/* Price and Actions Row */}
                    <View style={styles.priceRow}>
                      <Text variant="bodyMedium" style={{ opacity: 0.7 }}>Monto Total:</Text>
                      <Text variant="titleMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                        {item.price}
                      </Text>
                    </View>

                    <View style={styles.cardActions}>
                      {item.cancelable && (
                        <Button
                          mode="outlined"
                          onPress={() => handleCancelClick(item)}
                          style={[styles.actionBtn, { borderColor: 'rgba(244, 67, 54, 0.5)' }]}
                          textColor={theme.colors.error}
                          compact
                          labelStyle={{ fontSize: 12 }}
                        >
                          Cancelar Cita
                        </Button>
                      )}
                      {!isPaid && (
                        <Button
                          mode="contained"
                          onPress={() => handlePayClick(item)}
                          style={[styles.actionBtn, { backgroundColor: theme.colors.primary, borderRadius: 6 }]}
                          labelStyle={{ color: '#121212', fontWeight: 'bold', fontSize: 12 }}
                          compact
                        >
                          Pagar con Yape/Plin
                        </Button>
                      )}
                    </View>
                  </Card.Content>
                </Card>
              );
            })
          )
        ) : (
          pastAppointments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <IconButton icon="history" size={48} iconColor={theme.colors.outline} />
              <Text variant="bodyLarge" style={{ opacity: 0.5 }}>Historial vacío.</Text>
            </View>
          ) : (
            pastAppointments.map((item) => (
              <Card
                key={item.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.colors.surface,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: 'rgba(150, 150, 150, 0.15)',
                    opacity: 0.85
                  }
                ]}
                elevation={1}
              >
                <Card.Content style={{ padding: 14 }}>
                  <View style={styles.cardHeader}>
                    <Badge
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: item.status === 'cancelled' ? 'rgba(244, 67, 54, 0.15)' : 'rgba(76, 175, 80, 0.15)',
                          color: item.status === 'cancelled' ? '#F44336' : '#4CAF50',
                          borderWidth: 1,
                          borderColor: item.status === 'cancelled' ? 'rgba(244, 67, 54, 0.3)' : 'rgba(76, 175, 80, 0.3)',
                        }
                      ]}
                    >
                      {item.status === 'cancelled' ? '✕ CANCELADO' : '✓ ATENDIDO'}
                    </Badge>
                    <Text variant="labelSmall" style={{ opacity: 0.5 }}>#{item.id.substring(0, 8)}</Text>
                  </View>

                  <Text variant="titleMedium" style={[styles.serviceTitle, { color: theme.colors.secondary, marginTop: 4, marginBottom: 6 }]}>
                    {item.service}
                  </Text>
                  
                  <Text variant="bodySmall" style={{ marginBottom: 12, opacity: 0.6 }}>
                    Atendido por {item.barber} el {item.date} a las {item.time}
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
        <Dialog
          visible={payDialogVisible}
          onDismiss={() => setPayDialogVisible(false)}
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: 'rgba(212, 175, 55, 0.35)',
            paddingVertical: 4,
          }}
        >
          <Dialog.Title style={{ color: theme.colors.primary, fontWeight: 'bold', textAlign: 'center', fontSize: 18, paddingBottom: 0 }}>
            Pago Digital (Yape / Plin)
          </Dialog.Title>
          <Dialog.Content style={{ alignItems: 'center', paddingTop: 8 }}>
            <Text variant="bodySmall" style={{ textAlign: 'center', opacity: 0.65, marginBottom: 12 }}>
              Escanea el código QR desde Yape o Plin y presiona "Confirmar Pago" al finalizar la transferencia.
            </Text>

            {/* Visual QR Code Mock */}
            <View style={[styles.qrMock, { borderColor: theme.colors.primary, backgroundColor: theme.colors.background }]}>
              <IconButton icon="qrcode" size={130} iconColor={theme.colors.secondary} style={{ margin: 0 }} />
              <View style={[styles.qrCenterBadge, { backgroundColor: theme.colors.primary }]}>
                <Text style={{ fontWeight: 'bold', fontSize: 10, color: '#121212' }}>BARBER</Text>
              </View>
            </View>

            {/* Payment Details Box */}
            <View style={[styles.payDetailsBox, { backgroundColor: theme.colors.background }]}>
              <View style={styles.payRow}>
                <Text variant="bodySmall" style={{ opacity: 0.6 }}>Monto a Pagar:</Text>
                <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
                  {selectedAppointment?.price}
                </Text>
              </View>
              <View style={styles.payRow}>
                <Text variant="bodySmall" style={{ opacity: 0.6 }}>Titular:</Text>
                <Text variant="bodyMedium" style={{ fontWeight: 'bold', color: theme.colors.secondary }}>
                  BarberApp S.A.C.
                </Text>
              </View>
              <View style={styles.payRow}>
                <Text variant="bodySmall" style={{ opacity: 0.6 }}>Número de Yape/Plin:</Text>
                <Text variant="bodyMedium" style={{ fontWeight: 'bold', color: theme.colors.secondary }}>
                  987 654 321
                </Text>
              </View>
            </View>
          </Dialog.Content>
          <Dialog.Actions style={{ justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14 }}>
            <Button onPress={() => setPayDialogVisible(false)} textColor={theme.colors.outline}>
              Cerrar
            </Button>
            <Button
              mode="contained"
              onPress={confirmPayment}
              style={{ backgroundColor: theme.colors.primary, borderRadius: 8, paddingHorizontal: 12 }}
              labelStyle={{ color: '#121212', fontWeight: 'bold' }}
            >
              Confirmar Pago
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Cancel Dialog */}
      <Portal>
        <Dialog
          visible={cancelDialogVisible}
          onDismiss={() => setCancelDialogVisible(false)}
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: 'rgba(244, 67, 54, 0.35)',
            paddingVertical: 4,
          }}
        >
          <Dialog.Title style={{ color: theme.colors.error, fontWeight: 'bold', fontSize: 18 }}>
            ¿Cancelar Cita?
          </Dialog.Title>
          <Dialog.Content style={{ paddingTop: 4 }}>
            <Text variant="bodyMedium" style={{ color: theme.colors.secondary }}>
              ¿Estás seguro de que deseas cancelar tu cita para el <Text style={{ fontWeight: 'bold', color: theme.colors.primary }}>{selectedAppointment?.date}</Text>?
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.error, marginTop: 10, opacity: 0.8 }}>
              * Puedes cancelar sin costo hasta 24 horas antes del servicio.
            </Text>
          </Dialog.Content>
          <Dialog.Actions style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            <Button onPress={() => setCancelDialogVisible(false)} textColor={theme.colors.outline}>
              No, mantener
            </Button>
            <Button
              mode="contained"
              onPress={confirmCancel}
              style={{ backgroundColor: theme.colors.error, borderRadius: 8, marginLeft: 8 }}
              labelStyle={{ color: '#FFFFFF', fontWeight: 'bold' }}
            >
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
  detailsBox: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.12)',
    marginBottom: 10,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paidBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
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
    width: 150,
    height: 150,
    borderWidth: 2,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 4,
  },
  qrCenterBadge: {
    position: 'absolute',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  payDetailsBox: {
    width: '100%',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.15)',
    marginTop: 12,
    gap: 6,
  },
  payRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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