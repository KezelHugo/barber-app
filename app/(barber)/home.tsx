import { auth, db } from '@/config/firebase';
import { useUserRole } from '@/context/user-role';
import { useRouter } from 'expo-router';
import { collection, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Avatar, Badge, Button, Card, Snackbar, Text, useTheme } from 'react-native-paper';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SafeAreaView } from 'react-native-safe-area-context';

interface BarberAppointment {
  id: string;
  clientName: string;
  clientAvatar: string;
  clientPhone?: string;
  service: string;
  date: string;
  time: string;
  status: 'pending' | 'paid' | 'attended' | 'no_show';
  createdAt?: string;
}

export default function BarberHomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { userName } = useUserRole();

  const [appointments, setAppointments] = useState<BarberAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFinishedExpanded, setIsFinishedExpanded] = useState(false);

  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [snackbarColor, setSnackbarColor] = useState('#4CAF50');

  // Listen to appointments in Firestore for current logged-in barber
  useEffect(() => {
    const currentUid = auth.currentUser?.uid;
    const q = collection(db, 'appointments');

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: BarberAppointment[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        // Match either barberId == currentUid OR barberName matches userName
        const isMyAppointment = (currentUid && data.barberId === currentUid) ||
          (data.barberName && userName && data.barberName.toLowerCase() === userName.toLowerCase());

        if (isMyAppointment || !currentUid) {
          const initials = data.customerName
            ? data.customerName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
            : 'CL';

          let mappedStatus: 'pending' | 'paid' | 'attended' | 'no_show' = 'pending';
          if (data.status === 'paid') mappedStatus = 'paid';
          if (data.status === 'completed') mappedStatus = 'attended';
          if (data.status === 'cancelled') mappedStatus = 'no_show';

          list.push({
            id: docSnap.id,
            clientName: data.customerName || 'Cliente',
            clientAvatar: initials,
            clientPhone: data.customerPhone || '',
            service: data.servicesSummary || 'Corte / Servicio',
            date: data.date || '',
            time: data.time || '',
            status: mappedStatus,
            createdAt: data.createdAt || ''
          });
        }
      });

      setAppointments(list);
      setLoading(false);
    }, (err) => {
      console.error("Error al escuchar citas del barbero:", err);
      setLoading(false);
    });

    return unsubscribe;
  }, [userName]);

  const updateStatus = async (id: string, newStatus: 'attended' | 'no_show') => {
    const targetStatus = newStatus === 'attended' ? 'completed' : 'cancelled';
    const appt = appointments.find(a => a.id === id);

    try {
      await updateDoc(doc(db, 'appointments', id), {
        status: targetStatus
      });

      const msg = newStatus === 'attended'
        ? `¡Cita de ${appt?.clientName} marcada como Atendida!`
        : `Cita de ${appt?.clientName} marcada como No Asistió.`;
      setSnackbarMsg(msg);
      setSnackbarColor(newStatus === 'attended' ? '#4CAF50' : '#D32F2F');
      setSnackbarVisible(true);
    } catch (err) {
      console.error("Error al actualizar estado de la cita:", err);
      setSnackbarMsg("Error al actualizar estado en la base de datos.");
      setSnackbarColor('#D32F2F');
      setSnackbarVisible(true);
    }
  };

  const handleCardPress = (item: BarberAppointment) => {
    router.push({
      pathname: '/(barber)/detail' as any,
      params: {
        clientId: item.id,
        clientName: item.clientName,
        clientPhone: item.clientPhone || '',
        service: item.service,
        date: item.date,
        time: item.time,
      }
    });
  };

  const activeAppointments = appointments.filter(a => a.status === 'pending' || a.status === 'paid');
  const finishedAppointments = appointments
    .filter(a => a.status === 'attended' || a.status === 'no_show')
    .sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return b.id.localeCompare(a.id);
    });

  const renderCard = (item: BarberAppointment) => {
    const isAttended = item.status === 'attended';
    const isNoShow = item.status === 'no_show';
    const isPaid = item.status === 'paid';
    const isPending = item.status === 'pending';
    const isActive = isPending || isPaid;

    return (
      <Card
        key={item.id}
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: isAttended
              ? 'rgba(76, 175, 80, 0.3)'
              : isNoShow
              ? 'rgba(244, 67, 54, 0.3)'
              : isPaid
              ? 'rgba(76, 175, 80, 0.4)'
              : 'rgba(212, 175, 55, 0.35)',
            opacity: isActive ? 1 : 0.75,
          }
        ]}
        elevation={isActive ? 2 : 1}
        onPress={() => handleCardPress(item)}
      >
        <Card.Content style={{ padding: 14 }}>
          {/* Card Header Row */}
          <View style={styles.cardHeader}>
            <Badge
              style={[
                styles.statusBadge,
                {
                  backgroundColor: isAttended
                    ? 'rgba(76, 175, 80, 0.15)'
                    : isNoShow
                    ? 'rgba(244, 67, 54, 0.15)'
                    : isPaid
                    ? 'rgba(76, 175, 80, 0.15)'
                    : 'rgba(212, 175, 55, 0.15)',
                  color: isAttended || isPaid
                    ? '#4CAF50'
                    : isNoShow
                    ? theme.colors.error
                    : theme.colors.primary,
                  borderWidth: 1,
                  borderColor: isAttended || isPaid
                    ? 'rgba(76, 175, 80, 0.3)'
                    : isNoShow
                    ? 'rgba(244, 67, 54, 0.3)'
                    : 'rgba(212, 175, 55, 0.3)',
                }
              ]}
            >
              {isAttended
                ? '✓ ATENDIDO'
                : isNoShow
                ? '✕ NO ASISTIÓ'
                : isPaid
                ? '✓ PAGADO'
                : 'PENDIENTE'}
            </Badge>

            <Text variant="labelSmall" style={{ opacity: 0.5 }}>
              #{item.id.substring(0, 8)}
            </Text>
          </View>

          {/* Client Info */}
          <View style={styles.clientInfo}>
            <Avatar.Text
              size={46}
              label={item.clientAvatar}
              style={{ backgroundColor: theme.colors.surfaceVariant }}
              labelStyle={{ color: theme.colors.primary, fontWeight: 'bold' }}
            />
            <View style={styles.clientDetails}>
              <Text variant="titleMedium" style={[styles.clientName, { color: theme.colors.secondary }]}>
                {item.clientName}
              </Text>
              {item.clientPhone ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                  <IconSymbol size={13} name="phone.fill" color={theme.colors.primary} style={{ marginRight: 4 }} />
                  <Text variant="bodySmall" style={{ opacity: 0.6 }}>
                    {item.clientPhone}
                  </Text>
                </View>
              ) : null}
              <Text variant="bodySmall" style={[styles.serviceName, { color: theme.colors.primary, fontWeight: '500', marginTop: 2 }]}>
                {item.service}
              </Text>
            </View>
          </View>

          {/* Details Box: Día & Horario */}
          <View style={[styles.detailsBox, { backgroundColor: theme.colors.background }]}>
            <View style={styles.detailRow}>
              <IconSymbol size={15} name="calendar" color={theme.colors.primary} style={{ marginRight: 8 }} />
              <Text variant="bodyMedium" style={{ color: theme.colors.secondary }}>
                Día del Servicio: <Text style={{ fontWeight: 'bold' }}>{item.date}</Text>
              </Text>
            </View>

            <View style={styles.detailRow}>
              <IconSymbol size={15} name="clock" color={theme.colors.primary} style={{ marginRight: 8 }} />
              <Text variant="bodyMedium" style={{ color: theme.colors.secondary }}>
                Horario: <Text style={{ fontWeight: 'bold', color: theme.colors.primary }}>{item.time}</Text>
              </Text>
            </View>
          </View>

          {/* Action Buttons for Active Appointments */}
          {isActive && (
            <View style={styles.actions}>
              <Button
                mode="outlined"
                onPress={() => updateStatus(item.id, 'no_show')}
                style={[styles.actionBtn, { borderColor: 'rgba(244, 67, 54, 0.5)' }]}
                textColor={theme.colors.error}
                icon="close-circle-outline"
                compact
                labelStyle={{ fontSize: 12 }}
              >
                No Asistió
              </Button>
              <Button
                mode="contained"
                onPress={() => updateStatus(item.id, 'attended')}
                style={[styles.actionBtn, { backgroundColor: theme.colors.primary, borderRadius: 6 }]}
                labelStyle={{ color: '#121212', fontWeight: 'bold', fontSize: 12 }}
                icon="check-circle-outline"
                compact
              >
                Atendido
              </Button>
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      {/* Top Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <View>
          <Text variant="headlineSmall" style={[styles.headerTitle, { color: theme.colors.secondary }]}>
            Mi Agenda
          </Text>
          <Text variant="bodySmall" style={styles.headerSubtitle}>
            Citas asignadas registradas en el sistema
          </Text>
        </View>
        <Badge size={28} style={[styles.badge, { backgroundColor: theme.colors.primary, color: '#121212' }]}>
          {activeAppointments.length}
        </Badge>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Helper Banner */}
        <View style={[styles.helperBanner, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Text variant="bodySmall" style={{ textAlign: 'center', opacity: 0.7 }}>
            Toca una cita para ver los detalles completos del cliente.
          </Text>
        </View>

        {/* Appointments List Grouped */}
        <View style={styles.listContainer}>
          {loading ? (
            <ActivityIndicator style={{ marginVertical: 40 }} color={theme.colors.primary} />
          ) : appointments.length === 0 ? (
            <Text variant="bodyMedium" style={{ textAlign: 'center', opacity: 0.5, marginVertical: 40 }}>
              No tienes citas programadas por el momento.
            </Text>
          ) : (
            <>
              {/* 1. CITAS ACTIVAS */}
              <View style={styles.sectionHeaderRow}>
                <IconSymbol size={16} name="clock" color={theme.colors.primary} style={{ marginRight: 6 }} />
                <Text variant="labelLarge" style={[styles.sectionTitle, { color: theme.colors.primary, fontWeight: 'bold' }]}>
                  CITAS ACTIVAS ({activeAppointments.length})
                </Text>
              </View>

              {activeAppointments.length === 0 ? (
                <View style={[styles.emptySectionBox, { backgroundColor: theme.colors.surface }]}>
                  <Text variant="bodySmall" style={{ opacity: 0.5, textAlign: 'center' }}>
                    No hay citas pendientes o pagadas por atender.
                  </Text>
                </View>
              ) : (
                activeAppointments.map(item => renderCard(item))
              )}

              {/* 2. CITAS CONCLUIDAS Y CANCELADAS (DESPLEGABLE / COLLAPSIBLE BOTÓN INTERACTIVO) */}
              {finishedAppointments.length > 0 && (
                <View style={{ marginTop: 12 }}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setIsFinishedExpanded(!isFinishedExpanded)}
                    style={[
                      styles.collapsibleButton,
                      {
                        backgroundColor: isFinishedExpanded
                          ? 'rgba(212, 175, 55, 0.08)'
                          : theme.colors.surface,
                        borderColor: isFinishedExpanded
                          ? 'rgba(212, 175, 55, 0.4)'
                          : 'rgba(150, 150, 150, 0.2)',
                      }
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <IconSymbol
                        size={18}
                        name="clock"
                        color={isFinishedExpanded ? theme.colors.primary : theme.colors.outline}
                        style={{ marginRight: 8 }}
                      />
                      <Text
                        variant="labelLarge"
                        style={{
                          color: isFinishedExpanded ? theme.colors.primary : theme.colors.secondary,
                          fontWeight: 'bold',
                          letterSpacing: 0.3
                        }}
                      >
                        CONCLUIDAS Y CANCELADAS ({finishedAppointments.length})
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text
                        variant="labelSmall"
                        style={{
                          color: theme.colors.primary,
                          fontWeight: 'bold',
                          marginRight: 4
                        }}
                      >
                        {isFinishedExpanded ? 'Ocultar' : 'Ver todas'}
                      </Text>
                      <IconSymbol
                        size={16}
                        name={isFinishedExpanded ? "chevron.up" : "chevron.down"}
                        color={theme.colors.primary}
                      />
                    </View>
                  </TouchableOpacity>

                  {isFinishedExpanded && (
                    <View style={{ marginTop: 12, gap: 12 }}>
                      {finishedAppointments.map(item => renderCard(item))}
                    </View>
                  )}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={2500}
        style={{ backgroundColor: snackbarColor }}
      >
        <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  badge: {
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  helperBanner: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 16,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.1)',
  },
  cardContent: {
    padding: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  time: {
    fontWeight: 'bold',
  },
  clientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  clientDetails: {
    marginLeft: 12,
    flex: 1,
  },
  clientName: {
    fontWeight: 'bold',
  },
  serviceName: {
    opacity: 0.6,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    fontSize: 9,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    borderRadius: 4,
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    letterSpacing: 0.5,
  },
  emptySectionBox: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.1)',
    marginBottom: 12,
  },
  collapsibleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    elevation: 1,
  },
  sectionDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.1)',
    paddingTop: 10,
  },
  actionBtn: {
    borderRadius: 6,
  },
  logoutContainer: {
    paddingVertical: 10,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.1)',
  },
});