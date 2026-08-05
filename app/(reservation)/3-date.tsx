import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, FlatList, TouchableOpacity } from 'react-native';
import { Text, Card, Button, useTheme, ProgressBar, IconButton, ActivityIndicator } from 'react-native-paper';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '@/config/firebase';
import { collection, doc, getDoc, getDocs, onSnapshot, query, where } from 'firebase/firestore';

interface DateItem {
  id: string;
  dayName: string; // e.g. "LUN"
  dayNumber: string; // e.g. "15"
  month: string; // e.g. "JUN"
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

// Convert time slot string (e.g. "09:00 AM" or "01:30 PM") into minutes from midnight (00:00)
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

// Convert time slot string (e.g. "09:00 AM" or "01:30 PM") into a Date object for a target date
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

// Check if a time slot has passed or is less than 5 minutes away on TODAY
function isSlotPassedOrTooSoon(slotStr: string, targetDate: Date): boolean {
  const now = new Date();
  const isToday =
    targetDate.getFullYear() === now.getFullYear() &&
    targetDate.getMonth() === now.getMonth() &&
    targetDate.getDate() === now.getDate();

  if (!isToday) return false;

  const slotDate = parseSlotToDate(slotStr, targetDate);
  // Disable slot if it starts in 5 minutes or less
  const leadTimeMs = 5 * 60 * 1000;
  return slotDate.getTime() <= now.getTime() + leadTimeMs;
}

// Check if starting at slotStr with reqDuration overlaps with booked slots or exceeds available day hours
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

export default function StepDateScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();

  // Extract params from step 2
  const { serviceIds, totalPrice, barberId, barberName } = params;

  // Generate next 7 days dynamically
  const getNextDays = (): DateItem[] => {
    const days: DateItem[] = [];
    const locale = 'es-ES';
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
      const nextDate = new Date();
      nextDate.setDate(today.getDate() + i);

      const dayName = nextDate.toLocaleDateString(locale, { weekday: 'short' })
        .replace('.', '')
        .toUpperCase();
      const dayNumber = nextDate.getDate().toString();
      const month = nextDate.toLocaleDateString(locale, { month: 'short' })
        .replace('.', '')
        .toUpperCase();
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
  const [selectedDateId, setSelectedDateId] = useState<string>('0');
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Business working hours state from Firestore
  const [workingHours, setWorkingHours] = useState<any>(null);
  // Booked time slots for the selected barber and date
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [requiredDuration, setRequiredDuration] = useState<number>(30);

  const selectedDateObject = dates.find(d => d.id === selectedDateId);

  // 1. Fetch total required duration for current customer's selected services
  useEffect(() => {
    if (!serviceIds) return;
    const fetchServicesDuration = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'services'));
        const selectedIds = (serviceIds as string).split(',');
        let sumDuration = 0;
        querySnapshot.forEach((docSnap) => {
          if (selectedIds.includes(docSnap.id)) {
            sumDuration += Number(docSnap.data().duration) || 30;
          }
        });
        if (sumDuration > 0) {
          setRequiredDuration(sumDuration);
        }
      } catch (err) {
        console.error("Error al obtener duración de servicios seleccionados:", err);
      }
    };
    fetchServicesDuration();
  }, [serviceIds]);

  // 2. Fetch working hours from Firestore and auto-select Tomorrow if Today's schedule has ended
  useEffect(() => {
    const fetchHours = async () => {
      try {
        const docRef = doc(db, 'business_settings', 'working_hours');
        const docSnap = await getDoc(docRef);
        const hoursData = docSnap.exists() ? (docSnap.data()?.days || null) : null;
        setWorkingHours(hoursData);

        // Check if today (dates[0]) has any remaining valid time slot
        if (dates.length > 0) {
          const todayObj = dates[0];
          const dayOfWeekIndex = todayObj.rawDate.getDay();
          const dayKey = DAY_KEYS[dayOfWeekIndex];

          let todayHasValidSlot = false;
          if (hoursData && hoursData[dayKey]) {
            const config = hoursData[dayKey];
            if (config.isOpen) {
              const openIdx = ALL_TIME_SLOTS.indexOf(config.openTime);
              const closeIdx = ALL_TIME_SLOTS.indexOf(config.closeTime);

              if (openIdx !== -1 && closeIdx !== -1 && openIdx < closeIdx) {
                const todaySlots = ALL_TIME_SLOTS.slice(openIdx, closeIdx + 1);
                todayHasValidSlot = todaySlots.some(
                  (slot) => !isSlotPassedOrTooSoon(slot, todayObj.rawDate)
                );
              }
            }
          } else {
            // Fallback 09:00 AM to 09:00 PM
            const fallbackSlots = ALL_TIME_SLOTS.slice(6, 31);
            todayHasValidSlot = fallbackSlots.some(
              (slot) => !isSlotPassedOrTooSoon(slot, todayObj.rawDate)
            );
          }

          // If today is closed or all slots for today have passed (or < 5 min remaining), auto-select Tomorrow (id '1')
          if (!todayHasValidSlot) {
            setSelectedDateId('1');
          }
        }
      } catch (err) {
        console.error("Error al obtener horarios de atención:", err);
      } finally {
        setLoadingSchedule(false);
      }
    };
    fetchHours();
  }, []);

  // 3. Fetch booked appointments for selected barber & date in real-time, calculating interval overlaps
  useEffect(() => {
    if (!selectedDateObject || !barberId) return;

    const q = query(
      collection(db, 'appointments'),
      where('barberId', '==', barberId),
      where('date', '==', selectedDateObject.fullString)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const occupied: string[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        // Only consider active (non-cancelled) appointments
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
      setBookedTimes(occupied);
    }, (err) => {
      console.error("Error al escuchar citas reservadas:", err);
    });

    return unsubscribe;
  }, [selectedDateId, barberId, selectedDateObject?.fullString]);

  // Determine if selected day is open and calculate available time slots
  const getDayInfo = () => {
    if (!selectedDateObject) return { isOpen: true, slots: ALL_TIME_SLOTS };

    const dayOfWeekIndex = selectedDateObject.rawDate.getDay(); // 0 is Sunday, 1 is Monday, etc.
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

    // Default fallback if working hours not yet created
    return { isOpen: true, slots: ALL_TIME_SLOTS.slice(6, 31) }; // 09:00 AM to 09:00 PM
  };

  const { isOpen: isSelectedDayOpen, slots: availableSlots } = getDayInfo();

  const handleNext = () => {
    if (!selectedTime || !selectedDateObject) return;

    // Pass all parameters to step 4
    router.push({
      pathname: '/(reservation)/4-confirmation',
      params: { 
        serviceIds,
        totalPrice,
        barberId,
        barberName,
        date: selectedDateObject.fullString,
        time: selectedTime
      }
    });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      {/* Top Header Row */}
      <View style={styles.headerRow}>
        <IconButton icon="arrow-left" size={24} onPress={() => router.back()} />
        <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>Reservar Cita</Text>
        <IconButton icon="close" size={24} onPress={() => router.replace('/(customer)/home')} />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <ProgressBar progress={0.75} color={theme.colors.primary} style={styles.progressBar} />
        <View style={styles.stepLabels}>
          <Text variant="labelMedium" style={{ opacity: 0.6 }}>1. Servicios</Text>
          <Text variant="labelMedium" style={{ opacity: 0.6 }}>2. Barbero</Text>
          <Text variant="labelMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>3. Fecha</Text>
          <Text variant="labelMedium" style={{ opacity: 0.4 }}>4. Confirmar</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.secondary }]}>
          Fecha y horario
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Elige el día y la hora de tu preferencia para la cita.
        </Text>

        {/* Horizontal Date Selector */}
        <Text style={[styles.sectionLabel, { color: theme.colors.primary }]} variant="labelLarge">
          SELECCIONAR DÍA
        </Text>
        
        <FlatList
          data={dates}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.dateList}
          renderItem={({ item }) => {
            const isSelected = selectedDateId === item.id;
            return (
              <Card
                style={[
                  styles.dateCard,
                  {
                    backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
                    borderColor: isSelected ? theme.colors.primary : 'rgba(150, 150, 150, 0.1)',
                    borderWidth: 1
                  }
                ]}
                onPress={() => setSelectedDateId(item.id)}
                elevation={isSelected ? 4 : 1}
              >
                <Card.Content style={styles.dateCardContent}>
                  <Text style={[styles.dateTextLabel, { color: isSelected ? '#121212' : theme.colors.outline }]} variant="labelSmall">
                    {item.dayName}
                  </Text>
                  <Text style={[styles.dateNumber, { color: isSelected ? '#121212' : theme.colors.secondary }]} variant="titleLarge">
                    {item.dayNumber}
                  </Text>
                  <Text style={[styles.dateTextLabel, { color: isSelected ? '#121212' : theme.colors.outline }]} variant="labelSmall">
                    {item.month}
                  </Text>
                </Card.Content>
              </Card>
            );
          }}
        />

        {/* Selected date & duration visualizer */}
        <View style={[styles.selectedDateBanner, { backgroundColor: theme.colors.surfaceVariant }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <IconSymbol size={18} name="calendar" color={theme.colors.primary} style={{ marginRight: 6 }} />
              <Text variant="bodyMedium" style={{ fontWeight: '500', color: theme.colors.secondary }}>
                Día elegido: <Text style={{ fontWeight: 'bold', color: theme.colors.primary }}>{selectedDateObject?.fullString}</Text>
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}>
              <IconSymbol size={15} name="clock" color={theme.colors.primary} style={{ marginRight: 4 }} />
              <Text variant="bodySmall" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
                {requiredDuration} min
              </Text>
            </View>
          </View>
        </View>

        {/* Time Slots Grid */}
        <Text style={[styles.sectionLabel, { color: theme.colors.primary, marginTop: 16 }]} variant="labelLarge">
          HORARIOS DISPONIBLES
        </Text>

        {loadingSchedule ? (
          <ActivityIndicator style={{ marginVertical: 30 }} color={theme.colors.primary} />
        ) : !isSelectedDayOpen ? (
          <View style={[styles.closedBanner, { backgroundColor: 'rgba(244, 67, 54, 0.12)', borderColor: theme.colors.error }]}>
            <IconButton icon="calendar-remove" size={32} iconColor={theme.colors.error} style={{ margin: 0 }} />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text variant="titleMedium" style={{ color: theme.colors.error, fontWeight: 'bold' }}>
                La barbería está cerrada este día
              </Text>
              <Text variant="bodySmall" style={{ opacity: 0.7, marginTop: 2 }}>
                Elige otro día de la semana para consultar los horarios disponibles.
              </Text>
            </View>
          </View>
        ) : availableSlots.length === 0 ? (
          <Text variant="bodyMedium" style={{ textAlign: 'center', opacity: 0.5, marginVertical: 30 }}>
            No hay horarios disponibles para la fecha seleccionada.
          </Text>
        ) : availableSlots.every(time => isSlotPassedOrTooSoon(time, selectedDateObject?.rawDate || new Date())) ? (
          <View style={[styles.closedBanner, { backgroundColor: 'rgba(212, 175, 55, 0.12)', borderColor: theme.colors.primary }]}>
            <IconButton icon="clock-alert-outline" size={32} iconColor={theme.colors.primary} style={{ margin: 0 }} />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text variant="titleMedium" style={{ color: theme.colors.secondary, fontWeight: 'bold' }}>
                Horarios finalizados por hoy
              </Text>
              <Text variant="bodySmall" style={{ opacity: 0.7, marginTop: 2 }}>
                Los turnos de atención para el día de hoy ya han concluido. Te invitamos a seleccionar la fecha de mañana u otro día.
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.grid}>
            {availableSlots.map((time) => {
              const isSelected = selectedTime === time;
              const isOccupied = bookedTimes.includes(time);
              const isPassed = isSlotPassedOrTooSoon(time, selectedDateObject?.rawDate || new Date());
              const isInsufficient = isSlotInsufficientForDuration(time, requiredDuration, bookedTimes, availableSlots);
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
                  onPress={() => setSelectedTime(time)}
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
                      fontSize: 13,
                      textDecorationLine: (isPassed || isInsufficient) ? 'line-through' : 'none'
                    }}
                  >
                    {time}
                  </Text>
                  {isOccupied && (
                    <Text style={{ fontSize: 9, color: theme.colors.error, fontWeight: 'bold', marginTop: 2 }}>
                      OCUPADO
                    </Text>
                  )}
                  {isPassed && !isOccupied && (
                    <Text style={{ fontSize: 9, color: theme.colors.outline, fontWeight: 'bold', marginTop: 2 }}>
                      PASADO
                    </Text>
                  )}
                  {isInsufficient && !isOccupied && !isPassed && (
                    <Text style={{ fontSize: 8, color: theme.colors.outline, fontWeight: 'bold', marginTop: 2 }}>
                      SIN TIEMPO
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Persistent Footer */}
      <View style={[styles.footer, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.footerText}>
          <Text variant="bodySmall" style={{ opacity: 0.6 }}>Hora elegida:</Text>
          <Text variant="titleMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
            {selectedTime || 'Ninguna'}
          </Text>
        </View>
        <Button
          mode="contained"
          disabled={!selectedTime}
          onPress={handleNext}
          style={[styles.nextBtn, { backgroundColor: selectedTime ? theme.colors.primary : theme.colors.outline }]}
          labelStyle={{ color: '#121212', fontWeight: 'bold' }}
        >
          Continuar
        </Button>
      </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.1)',
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  stepLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 110,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    opacity: 0.6,
    marginBottom: 20,
  },
  sectionLabel: {
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  dateList: {
    paddingBottom: 8,
    gap: 10,
  },
  dateCard: {
    width: 70,
    borderRadius: 12,
  },
  dateCardContent: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 0,
  },
  dateTextLabel: {
    fontWeight: 'bold',
    fontSize: 9,
  },
  dateNumber: {
    fontWeight: 'bold',
    marginVertical: 4,
  },
  selectedDateBanner: {
    padding: 12,
    borderRadius: 8,
    marginVertical: 16,
  },
  closedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginVertical: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  gridItem: {
    width: '31%',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(150, 150, 150, 0.1)',
    elevation: 10,
  },
  footerText: {
    flexDirection: 'column',
  },
  footerPrice: {
    fontWeight: 'bold',
  },
  nextBtn: {
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 4,
  },
});
