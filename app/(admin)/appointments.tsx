import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, FlatList, TouchableOpacity } from 'react-native';
import { Text, Card, Avatar, useTheme, IconButton, Button, Portal, Dialog, RadioButton, Snackbar, Badge, ActivityIndicator, Modal } from 'react-native-paper';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '@/config/firebase';
import { collection, doc, getDoc, updateDoc, onSnapshot, query, where } from 'firebase/firestore';

interface AdminBarber {
  id: string;
  name: string;
  initials: string;
}

interface AdminAppointment {
  id: string;
  clientName: string;
  clientPhone?: string;
  service: string;
  date: string;
  time: string;
  totalPrice: number;
  totalDuration: number;
  barberId: string;
  barberName: string;
  status: 'pending' | 'paid' | 'completed' | 'cancelled';
  createdAt?: string;
}

interface DateItem {
  id: string;
  dayName: string;
  dayNumber: string;
  month: string;
  fullString: string;
  rawDate: Date;
}

const ALL_TIME_SLOTS = [
  '06:00 AM', '06:30 AM', '07:00 AM', '07:30 AM', '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM',
  '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM',
  '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM',
  '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM', '08:00 PM', '08:30 PM', '09:00 PM', '09:30 PM',
  '10:00 PM', '10:30 PM', '11:00 PM'
];

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function parseSlotToMinutes(slotStr: string): number {
  if (!slotStr || typeof slotStr !== 'string') return 0;
  const parts = slotStr.split(' ');
  if (parts.length < 2) return 0;
  const [timePart, period] = parts;
  const [hoursStr, minutesStr] = timePart.split(':');
  let hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);

  if (isNaN(hours) || isNaN(minutes)) return 0;

  if (period === 'PM' && hours < 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }
  return hours * 60 + minutes;
}

function parseSlotToDate(slotStr: string, baseDate: Date): Date {
  const [timePart, period] = slotStr.split(' ');
  const [hoursStr, minutesStr] = timePart.split(':');
  let hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);

  if (period === 'PM' && hours < 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }

  const slotDate = new Date(baseDate);
  slotDate.setHours(hours, minutes, 0, 0);
  return slotDate;
}

function isSlotPassedOrTooSoon(slotStr: string, targetDate: Date): boolean {
  const now = new Date();
  const isToday =
    targetDate.getFullYear() === now.getFullYear() &&
    targetDate.getMonth() === now.getMonth() &&
    targetDate.getDate() === now.getDate();

  if (!isToday) return false;

  const slotDate = parseSlotToDate(slotStr, targetDate);
  const leadTimeMs = 5 * 60 * 1000;
  return slotDate.getTime() <= now.getTime() + leadTimeMs;
}

function isSlotInsufficientForDuration(
  slotStr: string,
  reqDuration: number,
  occupiedSlots: string[],
  availableDaySlots: string[]
): boolean {
  const startMins = parseSlotToMinutes(slotStr);
  const endMins = startMins + reqDuration;

  for (let m = startMins; m < endMins; m += 30) {
    const blockSlot = ALL_TIME_SLOTS.find(s => parseSlotToMinutes(s) === m);
    if (!blockSlot || !availableDaySlots.includes(blockSlot) || occupiedSlots.includes(blockSlot)) {
      return true;
    }
  }
  return false;
}

export default function AdminAppointmentsScreen() {
  const theme = useTheme();
  const router = useRouter();

  // Firestore Real-time States
  const [barbers, setBarbers] = useState<AdminBarber[]>([]);
  const [appointments, setAppointments] = useState<AdminAppointment[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Selected barber filter ('all' or barber.id)
  const [selectedFilterBarberId, setSelectedFilterBarberId] = useState<string>('all');

  // Modals Visibility & Selected Item States
  const [cancelDialogVisible, setCancelDialogVisible] = useState(false);
  const [reassignDialogVisible, setReassignDialogVisible] = useState(false);
  const [rescheduleModalVisible, setRescheduleModalVisible] = useState(false);

  const [selectedAppt, setSelectedAppt] = useState<AdminAppointment | null>(null);

  // Reassign Modal State
  const [newBarberId, setNewBarberId] = useState<string>('');
  const [loadingReassign, setLoadingReassign] = useState(false);

  // Cancel Modal State
  const [loadingCancel, setLoadingCancel] = useState(false);

  // Reschedule Modal States (Matching 3-date.tsx)
  const [rescheduleDateId, setRescheduleDateId] = useState<string>('0');
  const [rescheduleTime, setRescheduleTime] = useState<string | null>(null);
  const [workingHours, setWorkingHours] = useState<any>(null);
  const [rescheduleBookedTimes, setRescheduleBookedTimes] = useState<string[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [loadingRescheduleSave, setLoadingRescheduleSave] = useState(false);

  // Feedback Snackbar State
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [snackbarColor, setSnackbarColor] = useState('#4CAF50');

  // Generate next 7 days dynamically
  const getNextDays = (): DateItem[] => {
    const days: DateItem[] = [];
    const locale = 'es-ES';
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
      const nextDate = new Date();
      nextDate.setDate(today.getDate() + i);

      const dayName = nextDate.toLocaleDateString(locale, { weekday: 'short' }).replace('.', '').toUpperCase();
      const dayNumber = nextDate.getDate().toString();
      const month = nextDate.toLocaleDateString(locale, { month: 'short' }).replace('.', '').toUpperCase();
      const fullString = nextDate.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });

      days.push({
        id: i.toString(),
        dayName: dayName.substring(0, 3),
        dayNumber,
        month,
        fullString,
        rawDate: nextDate
      });
    }
    return days;
  };

  const dates = getNextDays();
  const selectedRescheduleDateObj = dates.find(d => d.id === rescheduleDateId);

  // 1. Listen to barbers (users with role 'barber') in real-time
  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'barber'));
    const unsub = onSnapshot(q, (snapshot) => {
      const list: AdminBarber[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.isActive !== false) {
          const initials = data.name
            ? data.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
            : 'B';
          list.push({
            id: docSnap.id,
            name: data.name || 'Barbero',
            initials
          });
        }
      });
      setBarbers(list);
    }, (err) => {
      console.error("Error al escuchar usuarios barberos:", err);
    });

    return unsub;
  }, []);

  // 2. Listen to appointments collection in real-time
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'appointments'), (snapshot) => {
      const list: AdminAppointment[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          clientName: data.customerName || 'Cliente',
          clientPhone: data.customerPhone || '',
          service: data.servicesSummary || 'Servicio de Barbería',
          date: data.date || '',
          time: data.time || '',
          totalPrice: Number(data.totalPrice) || 0,
          totalDuration: Number(data.totalDuration) || 30,
          barberId: data.barberId || '',
          barberName: data.barberName || 'Barbero',
          status: data.status || 'pending',
          createdAt: data.createdAt || ''
        });
      });

      // Sort by creation date descending (most recent first)
      list.sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        return b.id.localeCompare(a.id);
      });

      setAppointments(list);
      setLoadingData(false);
    }, (err) => {
      console.error("Error al escuchar citas de administración:", err);
      setLoadingData(false);
    });

    return unsub;
  }, []);

  // 3. Fetch business working hours when reschedule modal opens
  useEffect(() => {
    if (!rescheduleModalVisible) return;
    const fetchHours = async () => {
      setLoadingSchedule(true);
      try {
        const docRef = doc(db, 'business_settings', 'working_hours');
        const docSnap = await getDoc(docRef);
        const hoursData = docSnap.exists() ? (docSnap.data()?.days || null) : null;
        setWorkingHours(hoursData);
      } catch (err) {
        console.error("Error al obtener horarios para reprogramación:", err);
      } finally {
        setLoadingSchedule(false);
      }
    };
    fetchHours();
  }, [rescheduleModalVisible]);

  // 4. Fetch booked times for barber & date in real-time during reschedule
  useEffect(() => {
    if (!rescheduleModalVisible || !selectedRescheduleDateObj || !selectedAppt) return;

    const q = query(
      collection(db, 'appointments'),
      where('barberId', '==', selectedAppt.barberId),
      where('date', '==', selectedRescheduleDateObj.fullString)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const occupied: string[] = [];
      snapshot.forEach((docSnap) => {
        // Exclude current appointment being edited from collision check
        if (docSnap.id === selectedAppt.id) return;

        const data = docSnap.data();
        if (data.status !== 'cancelled' && data.time) {
          const apptStartMins = parseSlotToMinutes(data.time);
          const apptDuration = Number(data.totalDuration) || 30;
          const apptEndMins = apptStartMins + apptDuration;

          ALL_TIME_SLOTS.forEach((slot) => {
            const slotMins = parseSlotToMinutes(slot);
            if (slotMins >= apptStartMins && slotMins < apptEndMins) {
              if (!occupied.includes(slot)) {
                occupied.push(slot);
              }
            }
          });
        }
      });
      setRescheduleBookedTimes(occupied);
    }, (err) => {
      console.error("Error al escuchar ocupación de citas para reprogramar:", err);
    });

    return unsub;
  }, [rescheduleModalVisible, rescheduleDateId, selectedAppt?.barberId, selectedRescheduleDateObj?.fullString, selectedAppt?.id]);

  // Helper to match appointment with barber by ID or name
  const isApptOfBarber = (appt: AdminAppointment, barber: AdminBarber) => {
    if (appt.barberId && appt.barberId === barber.id) return true;
    if (appt.barberName && barber.name && appt.barberName.trim().toLowerCase() === barber.name.trim().toLowerCase()) return true;
    return false;
  };

  const selectedBarberObj = barbers.find(b => b.id === selectedFilterBarberId);

  // Filtered list by selected barber
  const filteredAppointments = selectedFilterBarberId === 'all'
    ? appointments
    : appointments.filter(a => selectedBarberObj ? isApptOfBarber(a, selectedBarberObj) : a.barberId === selectedFilterBarberId);

  // Handlers to open modals
  const handleCancelClick = (appt: AdminAppointment) => {
    setSelectedAppt(appt);
    setCancelDialogVisible(true);
  };

  const handleReassignClick = (appt: AdminAppointment) => {
    setSelectedAppt(appt);
    setNewBarberId(appt.barberId);
    setReassignDialogVisible(true);
  };

  const handleRescheduleClick = (appt: AdminAppointment) => {
    setSelectedAppt(appt);

    const datesList = getNextDays();
    const matchingIdx = datesList.findIndex(d => d.fullString === appt.date);

    if (matchingIdx !== -1) {
      setRescheduleDateId(matchingIdx.toString());
    } else {
      const today = datesList[0].rawDate;
      const isTodayOver = ALL_TIME_SLOTS.every(s => isSlotPassedOrTooSoon(s, today));
      setRescheduleDateId(isTodayOver ? '1' : '0');
    }

    setRescheduleTime(appt.time);
    setRescheduleModalVisible(true);
  };

  // Confirm Actions
  const confirmCancel = async () => {
    if (!selectedAppt) return;
    setLoadingCancel(true);
    try {
      await updateDoc(doc(db, 'appointments', selectedAppt.id), {
        status: 'cancelled'
      });
      setCancelDialogVisible(false);
      setSnackbarMsg(`Cita de ${selectedAppt.clientName} cancelada exitosamente.`);
      setSnackbarColor('#D32F2F');
      setSnackbarVisible(true);
    } catch (err) {
      console.error("Error al cancelar cita:", err);
      setSnackbarMsg("Error al cancelar cita en la base de datos.");
      setSnackbarColor('#D32F2F');
      setSnackbarVisible(true);
    } finally {
      setLoadingCancel(false);
    }
  };

  const confirmReassignment = async () => {
    if (!selectedAppt || !newBarberId) return;
    const targetBarber = barbers.find(b => b.id === newBarberId);
    if (!targetBarber) return;

    setLoadingReassign(true);
    try {
      await updateDoc(doc(db, 'appointments', selectedAppt.id), {
        barberId: targetBarber.id,
        barberName: targetBarber.name
      });
      setReassignDialogVisible(false);
      setSnackbarMsg(`Cita de ${selectedAppt.clientName} reasignada a ${targetBarber.name}.`);
      setSnackbarColor('#4CAF50');
      setSnackbarVisible(true);
    } catch (err) {
      console.error("Error al reasignar barbero:", err);
      setSnackbarMsg("Error al reasignar barbero en la base de datos.");
      setSnackbarColor('#D32F2F');
      setSnackbarVisible(true);
    } finally {
      setLoadingReassign(false);
    }
  };

  const confirmReschedule = async () => {
    if (!selectedAppt || !rescheduleTime || !selectedRescheduleDateObj) return;

    setLoadingRescheduleSave(true);
    try {
      await updateDoc(doc(db, 'appointments', selectedAppt.id), {
        date: selectedRescheduleDateObj.fullString,
        time: rescheduleTime
      });
      setRescheduleModalVisible(false);
      setSnackbarMsg(`Cita de ${selectedAppt.clientName} reprogramada para ${selectedRescheduleDateObj.fullString} a las ${rescheduleTime}.`);
      setSnackbarColor('#4CAF50');
      setSnackbarVisible(true);
    } catch (err) {
      console.error("Error al reprogramar cita:", err);
      setSnackbarMsg("Error al actualizar fecha y hora en la base de datos.");
      setSnackbarColor('#D32F2F');
      setSnackbarVisible(true);
    } finally {
      setLoadingRescheduleSave(false);
    }
  };

  // Helper for working hours of selected day in reschedule modal
  const getRescheduleDayInfo = () => {
    if (!selectedRescheduleDateObj) return { isOpen: true, slots: ALL_TIME_SLOTS };

    const dayOfWeekIndex = selectedRescheduleDateObj.rawDate.getDay();
    const dayKey = DAY_KEYS[dayOfWeekIndex];

    if (workingHours && workingHours[dayKey]) {
      const config = workingHours[dayKey];
      if (!config.isOpen) {
        return { isOpen: false, slots: [] };
      }

      const openIdx = ALL_TIME_SLOTS.indexOf(config.openTime);
      const closeIdx = ALL_TIME_SLOTS.indexOf(config.closeTime);

      if (openIdx !== -1 && closeIdx !== -1 && openIdx < closeIdx) {
        return { isOpen: true, slots: ALL_TIME_SLOTS.slice(openIdx, closeIdx + 1) };
      }
    }

    return { isOpen: true, slots: ALL_TIME_SLOTS.slice(6, 31) }; // Fallback 09:00 AM to 09:00 PM
  };

  const { isOpen: isRescheduleDayOpen, slots: availableRescheduleSlots } = getRescheduleDayInfo();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text variant="headlineSmall" style={[styles.headerTitle, { color: theme.colors.secondary, marginRight: 8 }]}>
            Calendario Maestro
          </Text>
          <IconSymbol size={22} name="calendar" color={theme.colors.primary} />
        </View>
        <Text variant="bodySmall" style={styles.headerSubtitle}>
          Gestión integral de citas, horarios y reasignación de barberos
        </Text>
      </View>

      {/* Barber Filter Strip */}
      <View style={styles.filterContainer}>
        <Text variant="labelLarge" style={[styles.filterLabel, { color: theme.colors.primary }]}>
          FILTRAR POR BARBERO:
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          <Button
            mode={selectedFilterBarberId === 'all' ? 'contained' : 'outlined'}
            onPress={() => setSelectedFilterBarberId('all')}
            style={styles.chipBtn}
            labelStyle={{ fontSize: 12, color: selectedFilterBarberId === 'all' ? '#121212' : theme.colors.secondary, fontWeight: 'bold' }}
            compact
          >
            TODOS ({appointments.length})
          </Button>

          {barbers.map((barber) => {
            const isSelected = selectedFilterBarberId === barber.id;
            const count = appointments.filter(a => isApptOfBarber(a, barber)).length;
            return (
              <Button
                key={barber.id}
                mode={isSelected ? 'contained' : 'outlined'}
                onPress={() => setSelectedFilterBarberId(barber.id)}
                style={styles.chipBtn}
                labelStyle={{ fontSize: 12, color: isSelected ? '#121212' : theme.colors.secondary, fontWeight: 'bold' }}
                compact
              >
                {barber.name} ({count})
              </Button>
            );
          })}
        </ScrollView>
      </View>

      {/* Appointments List */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loadingData ? (
          <ActivityIndicator style={{ marginVertical: 40 }} color={theme.colors.primary} />
        ) : filteredAppointments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <IconButton icon="calendar-blank-outline" size={48} iconColor={theme.colors.outline} />
            <Text variant="bodyLarge" style={{ opacity: 0.5 }}>
              No hay citas registradas para la selección actual.
            </Text>
          </View>
        ) : (
          filteredAppointments.map((item) => {
            const isCancelled = item.status === 'cancelled';
            const isCompleted = item.status === 'completed';
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
                    borderColor: isCompleted
                      ? 'rgba(76, 175, 80, 0.3)'
                      : isCancelled
                      ? 'rgba(244, 67, 54, 0.3)'
                      : isPaid
                      ? 'rgba(76, 175, 80, 0.4)'
                      : 'rgba(212, 175, 55, 0.35)',
                    opacity: isActive ? 1 : 0.75,
                  }
                ]}
                elevation={isActive ? 2 : 1}
              >
                <Card.Content style={{ padding: 14 }}>
                  {/* Card Header Row */}
                  <View style={styles.cardHeader}>
                    <Badge
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: isCompleted
                            ? 'rgba(76, 175, 80, 0.15)'
                            : isCancelled
                            ? 'rgba(244, 67, 54, 0.15)'
                            : isPaid
                            ? 'rgba(76, 175, 80, 0.15)'
                            : 'rgba(212, 175, 55, 0.15)',
                          color: isCompleted || isPaid
                            ? '#4CAF50'
                            : isCancelled
                            ? theme.colors.error
                            : theme.colors.primary,
                          borderWidth: 1,
                          borderColor: isCompleted || isPaid
                            ? 'rgba(76, 175, 80, 0.3)'
                            : isCancelled
                            ? 'rgba(244, 67, 54, 0.3)'
                            : 'rgba(212, 175, 55, 0.3)',
                        }
                      ]}
                    >
                      {isCompleted
                        ? '✓ COMPLETADO'
                        : isCancelled
                        ? '✕ CANCELADO'
                        : isPaid
                        ? '✓ PAGADO'
                        : 'PENDIENTE'}
                    </Badge>

                    <Text variant="labelSmall" style={{ opacity: 0.5 }}>
                      #{item.id.substring(0, 8)}
                    </Text>
                  </View>

                  {/* Client Info Row */}
                  <View style={styles.clientRow}>
                    <Avatar.Text
                      size={44}
                      label={item.clientName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                      style={{ backgroundColor: theme.colors.surfaceVariant }}
                      labelStyle={{ color: theme.colors.primary, fontWeight: 'bold' }}
                    />
                    <View style={styles.clientText}>
                      <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.secondary }}>
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
                      <Text variant="bodySmall" style={{ color: theme.colors.primary, fontWeight: '500', marginTop: 2 }}>
                        {item.service}
                      </Text>
                    </View>
                  </View>

                  {/* Details Box: Barber, Date & Time */}
                  <View style={[styles.detailsBox, { backgroundColor: theme.colors.background }]}>
                    <View style={styles.detailRow}>
                      <IconSymbol size={15} name="person.fill" color={theme.colors.primary} style={{ marginRight: 8 }} />
                      <Text variant="bodyMedium" style={{ color: theme.colors.secondary }}>
                        Barbero Asignado: <Text style={{ fontWeight: 'bold', color: theme.colors.primary }}>{item.barberName}</Text>
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
                        Horario: <Text style={{ fontWeight: 'bold', color: theme.colors.primary }}>{item.time}</Text> ({item.totalDuration} min)
                      </Text>
                    </View>
                  </View>

                  {/* Action Buttons (3 Actions for Active Appointments) */}
                  {isActive && (
                    <View style={styles.actionGroup}>
                      <Button
                        mode="outlined"
                        onPress={() => handleCancelClick(item)}
                        style={[styles.actionBtn, { borderColor: 'rgba(244, 67, 54, 0.5)' }]}
                        textColor={theme.colors.error}
                        icon="close-circle-outline"
                        compact
                        labelStyle={{ fontSize: 11 }}
                      >
                        Cancelar
                      </Button>

                      <Button
                        mode="outlined"
                        onPress={() => handleRescheduleClick(item)}
                        style={[styles.actionBtn, { borderColor: 'rgba(212, 175, 55, 0.5)' }]}
                        textColor={theme.colors.primary}
                        icon="calendar-clock"
                        compact
                        labelStyle={{ fontSize: 11 }}
                      >
                        Cambiar Fecha
                      </Button>

                      <Button
                        mode="contained"
                        onPress={() => handleReassignClick(item)}
                        style={[styles.actionBtn, { backgroundColor: theme.colors.primary }]}
                        labelStyle={{ color: '#121212', fontWeight: 'bold', fontSize: 11 }}
                        icon="swap-horizontal"
                        compact
                      >
                        Reasignar
                      </Button>
                    </View>
                  )}
                </Card.Content>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* 1. MODAL CANCELAR CITA */}
      <Portal>
        <Dialog
          visible={cancelDialogVisible}
          onDismiss={() => !loadingCancel && setCancelDialogVisible(false)}
          style={{ backgroundColor: theme.colors.surface, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(244, 67, 54, 0.35)' }}
        >
          <View style={{ alignItems: 'center', paddingTop: 16 }}>
            <IconButton icon="close-circle-outline" size={36} iconColor={theme.colors.error} style={{ backgroundColor: 'rgba(244, 67, 54, 0.12)', margin: 0 }} />
          </View>
          <Dialog.Title style={{ color: theme.colors.error, textAlign: 'center', fontWeight: 'bold', fontSize: 20, paddingTop: 8 }}>
            Cancelar Cita
          </Dialog.Title>
          <Dialog.Content style={{ paddingHorizontal: 20 }}>
            <View style={{ backgroundColor: theme.colors.background, padding: 14, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(150, 150, 150, 0.12)' }}>
              <Text variant="bodyMedium" style={{ textAlign: 'center', lineHeight: 20, color: theme.colors.secondary }}>
                ¿Estás seguro de que deseas cancelar la cita de <Text style={{ fontWeight: 'bold', color: theme.colors.primary }}>{selectedAppt?.clientName}</Text> agendada para el <Text style={{ fontWeight: 'bold' }}>{selectedAppt?.date}</Text> a las <Text style={{ fontWeight: 'bold' }}>{selectedAppt?.time}</Text>?
              </Text>
            </View>
          </Dialog.Content>
          <Dialog.Actions style={{ paddingHorizontal: 20, paddingBottom: 16, justifyContent: 'space-between', gap: 10 }}>
            <Button mode="outlined" onPress={() => setCancelDialogVisible(false)} textColor={theme.colors.outline} disabled={loadingCancel} style={{ flex: 1, borderRadius: 8 }}>
              Volver
            </Button>
            <Button mode="contained" onPress={confirmCancel} style={{ backgroundColor: theme.colors.error, flex: 1, borderRadius: 8 }} labelStyle={{ color: '#FFFFFF', fontWeight: 'bold' }} loading={loadingCancel} disabled={loadingCancel}>
              Confirmar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* 2. MODAL REASIGNAR BARBERO */}
      <Portal>
        <Dialog
          visible={reassignDialogVisible}
          onDismiss={() => !loadingReassign && setReassignDialogVisible(false)}
          style={{ backgroundColor: theme.colors.surface, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.35)' }}
        >
          <View style={{ alignItems: 'center', paddingTop: 16 }}>
            <IconButton icon="swap-horizontal" size={36} iconColor={theme.colors.primary} style={{ backgroundColor: 'rgba(212, 175, 55, 0.12)', margin: 0 }} />
          </View>
          <Dialog.Title style={{ color: theme.colors.primary, textAlign: 'center', fontWeight: 'bold', fontSize: 20, paddingTop: 8 }}>
            Reasignar Barbero
          </Dialog.Title>
          <Dialog.Content style={{ paddingHorizontal: 20 }}>
            <Text variant="bodySmall" style={{ opacity: 0.65, textAlign: 'center', marginBottom: 12 }}>
              Selecciona el nuevo barbero para atender la cita de <Text style={{ fontWeight: 'bold', color: theme.colors.primary }}>{selectedAppt?.clientName}</Text>:
            </Text>

            <RadioButton.Group onValueChange={value => setNewBarberId(value)} value={newBarberId}>
              {barbers.map((b) => (
                <TouchableOpacity
                  key={b.id}
                  activeOpacity={0.8}
                  onPress={() => setNewBarberId(b.id)}
                  style={[
                    styles.radioRow,
                    {
                      backgroundColor: newBarberId === b.id ? 'rgba(212, 175, 55, 0.1)' : theme.colors.background,
                      borderColor: newBarberId === b.id ? theme.colors.primary : 'rgba(150, 150, 150, 0.12)',
                    }
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Avatar.Text size={32} label={b.initials} style={{ backgroundColor: theme.colors.surfaceVariant, marginRight: 10 }} labelStyle={{ color: theme.colors.primary, fontWeight: 'bold', fontSize: 12 }} />
                    <Text variant="bodyLarge" style={{ color: theme.colors.secondary, fontWeight: newBarberId === b.id ? 'bold' : 'normal' }}>
                      {b.name}
                    </Text>
                  </View>
                  <RadioButton.Android value={b.id} color={theme.colors.primary} />
                </TouchableOpacity>
              ))}
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions style={{ paddingHorizontal: 20, paddingBottom: 16, justifyContent: 'space-between', gap: 10 }}>
            <Button mode="outlined" onPress={() => setReassignDialogVisible(false)} textColor={theme.colors.outline} disabled={loadingReassign} style={{ flex: 1, borderRadius: 8 }}>
              Cancelar
            </Button>
            <Button mode="contained" onPress={confirmReassignment} style={{ backgroundColor: theme.colors.primary, flex: 1, borderRadius: 8 }} labelStyle={{ color: '#121212', fontWeight: 'bold' }} loading={loadingReassign} disabled={loadingReassign}>
              Reasignar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* 3. MODAL CAMBIAR FECHA Y HORA (CON REGLAS Y RESTRICCIONES DE 3-DATE) */}
      <Portal>
        <Modal
          visible={rescheduleModalVisible}
          onDismiss={() => !loadingRescheduleSave && setRescheduleModalVisible(false)}
          contentContainerStyle={[styles.modalContentContainer, { backgroundColor: theme.colors.surface }]}
        >
          <View style={[styles.modalInnerBorder, { borderColor: 'rgba(212, 175, 55, 0.35)' }]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <IconSymbol size={22} name="calendar" color={theme.colors.primary} style={{ marginRight: 8 }} />
                  <Text variant="titleLarge" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                    Cambiar Fecha y Hora
                  </Text>
                </View>
                <IconButton icon="close" size={20} onPress={() => setRescheduleModalVisible(false)} disabled={loadingRescheduleSave} />
              </View>
              <Text variant="bodySmall" style={{ opacity: 0.6, marginTop: 2 }}>
                Reprogramación de cita para <Text style={{ fontWeight: 'bold', color: theme.colors.secondary }}>{selectedAppt?.clientName}</Text> ({selectedAppt?.barberName})
              </Text>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
              {/* Date Selector Strip */}
              <Text style={[styles.sectionLabel, { color: theme.colors.primary }]} variant="labelLarge">
                SELECCIONAR NUEVA FECHA
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10, marginVertical: 10 }}
              >
                {dates.map((item) => {
                  const isSelected = rescheduleDateId === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.8}
                      onPress={() => {
                        setRescheduleDateId(item.id);
                        setRescheduleTime(null);
                      }}
                      style={{
                        backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
                        borderColor: isSelected ? theme.colors.primary : 'rgba(150, 150, 150, 0.15)',
                        borderWidth: 1,
                        borderRadius: 10,
                        width: 68,
                        paddingVertical: 10,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ color: isSelected ? '#121212' : theme.colors.outline, fontSize: 10, fontWeight: 'bold' }}>
                        {item.dayName}
                      </Text>
                      <Text style={{ color: isSelected ? '#121212' : theme.colors.secondary, fontSize: 18, fontWeight: 'bold', marginVertical: 2 }}>
                        {item.dayNumber}
                      </Text>
                      <Text style={{ color: isSelected ? '#121212' : theme.colors.outline, fontSize: 10, fontWeight: 'bold' }}>
                        {item.month}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Selected date & duration banner */}
              <View style={[styles.selectedDateBanner, { backgroundColor: theme.colors.surfaceVariant }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <IconSymbol size={16} name="calendar" color={theme.colors.primary} style={{ marginRight: 6 }} />
                    <Text variant="bodySmall" style={{ fontWeight: '500', color: theme.colors.secondary }}>
                      Fecha: <Text style={{ fontWeight: 'bold', color: theme.colors.primary }}>{selectedRescheduleDateObj?.fullString}</Text>
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}>
                    <IconSymbol size={14} name="clock" color={theme.colors.primary} style={{ marginRight: 4 }} />
                    <Text variant="bodySmall" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
                      {selectedAppt?.totalDuration || 30} min
                    </Text>
                  </View>
                </View>
              </View>

              {/* Time slots grid */}
              <Text style={[styles.sectionLabel, { color: theme.colors.primary, marginTop: 14 }]} variant="labelLarge">
                HORARIOS DISPONIBLES
              </Text>

              {loadingSchedule ? (
                <ActivityIndicator style={{ marginVertical: 20 }} color={theme.colors.primary} />
              ) : !isRescheduleDayOpen ? (
                <View style={[styles.closedBanner, { backgroundColor: 'rgba(244, 67, 54, 0.12)', borderColor: theme.colors.error }]}>
                  <IconButton icon="calendar-remove" size={28} iconColor={theme.colors.error} style={{ margin: 0 }} />
                  <Text variant="bodyMedium" style={{ color: theme.colors.error, fontWeight: 'bold', marginLeft: 8 }}>
                    La barbería está cerrada este día. Elige otra fecha.
                  </Text>
                </View>
              ) : (
                <View style={styles.grid}>
                  {availableRescheduleSlots.map((time) => {
                    const isSelected = rescheduleTime === time;
                    const isOccupied = rescheduleBookedTimes.includes(time);
                    const isPassed = isSlotPassedOrTooSoon(time, selectedRescheduleDateObj?.rawDate || new Date());
                    const isInsufficient = isSlotInsufficientForDuration(time, selectedAppt?.totalDuration || 30, rescheduleBookedTimes, availableRescheduleSlots);
                    const isDisabled = isOccupied || isPassed || isInsufficient;

                    return (
                      <TouchableOpacity
                        key={time}
                        disabled={isDisabled}
                        style={[
                          styles.gridItem,
                          {
                            backgroundColor: isDisabled
                              ? 'rgba(150, 150, 150, 0.08)'
                              : isSelected
                              ? theme.colors.primary
                              : theme.colors.surface,
                            borderColor: isOccupied
                              ? 'rgba(244, 67, 54, 0.3)'
                              : (isPassed || isInsufficient)
                              ? 'rgba(150, 150, 150, 0.15)'
                              : isSelected
                              ? theme.colors.primary
                              : 'rgba(150, 150, 150, 0.1)',
                            borderWidth: 1,
                            opacity: isDisabled ? 0.45 : 1
                          }
                        ]}
                        onPress={() => setRescheduleTime(time)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={{
                            color: isOccupied
                              ? theme.colors.error
                              : (isPassed || isInsufficient)
                              ? theme.colors.outline
                              : isSelected
                              ? '#121212'
                              : theme.colors.secondary,
                            fontWeight: isSelected || isOccupied ? 'bold' : 'normal',
                            fontSize: 12,
                            textDecorationLine: (isPassed || isInsufficient) ? 'line-through' : 'none'
                          }}
                        >
                          {time}
                        </Text>
                        {isOccupied && (
                          <Text style={{ fontSize: 8, color: theme.colors.error, fontWeight: 'bold', marginTop: 1 }}>
                            OCUPADO
                          </Text>
                        )}
                        {isPassed && !isOccupied && (
                          <Text style={{ fontSize: 8, color: theme.colors.outline, fontWeight: 'bold', marginTop: 1 }}>
                            PASADO
                          </Text>
                        )}
                        {isInsufficient && !isOccupied && !isPassed && (
                          <Text style={{ fontSize: 8, color: theme.colors.outline, fontWeight: 'bold', marginTop: 1 }}>
                            SIN TIEMPO
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <Button
                mode="outlined"
                onPress={() => setRescheduleModalVisible(false)}
                style={{ borderColor: 'rgba(150, 150, 150, 0.3)', borderRadius: 8, flex: 1 }}
                textColor={theme.colors.outline}
                disabled={loadingRescheduleSave}
              >
                Cancelar
              </Button>
              <Button
                mode="contained"
                disabled={!rescheduleTime || loadingRescheduleSave}
                onPress={confirmReschedule}
                style={{ backgroundColor: rescheduleTime ? theme.colors.primary : theme.colors.outline, flex: 1.2, borderRadius: 8 }}
                labelStyle={{ color: '#121212', fontWeight: 'bold' }}
                loading={loadingRescheduleSave}
              >
                Confirmar
              </Button>
            </View>
          </View>
        </Modal>
      </Portal>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
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
  filterContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  filterLabel: {
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 8,
  },
  chipsRow: {
    gap: 8,
    paddingRight: 20,
  },
  chipBtn: {
    borderRadius: 8,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  card: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    fontSize: 9,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  clientText: {
    marginLeft: 12,
    flex: 1,
  },
  detailsBox: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.12)',
    marginBottom: 12,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.1)',
    paddingTop: 10,
  },
  actionBtn: {
    borderRadius: 6,
    flex: 1,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  modalContentContainer: {
    padding: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    height: '82%',
    maxHeight: '85%',
  },
  modalInnerBorder: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalHeader: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.1)',
  },
  sectionLabel: {
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  selectedDateBanner: {
    padding: 10,
    borderRadius: 8,
    marginVertical: 4,
  },
  closedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '31%',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.1)',
  },
});
