import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, FlatList, TouchableOpacity } from 'react-native';
import { Text, Card, Button, useTheme, ProgressBar, IconButton, ActivityIndicator } from 'react-native-paper';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '@/config/firebase';
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';

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

  const selectedDateObject = dates.find(d => d.id === selectedDateId);

  // 1. Fetch working hours from Firestore
  useEffect(() => {
    const fetchHours = async () => {
      try {
        const docRef = doc(db, 'business_settings', 'working_hours');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setWorkingHours(docSnap.data()?.days || null);
        }
      } catch (err) {
        console.error("Error al obtener horarios de atención:", err);
      } finally {
        setLoadingSchedule(false);
      }
    };
    fetchHours();
  }, []);

  // 2. Fetch booked appointments for selected barber & date in real-time
  useEffect(() => {
    if (!selectedDateObject || !barberId) return;

    const q = query(
      collection(db, 'appointments'),
      where('barberId', '==', barberId),
      where('date', '==', selectedDateObject.fullString)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const occupied: string[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Only consider active (non-cancelled) appointments
        if (data.status !== 'cancelled' && data.time) {
          occupied.push(data.time);
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

        {/* Selected date visualizer */}
        <View style={[styles.selectedDateBanner, { backgroundColor: theme.colors.surfaceVariant }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <IconSymbol size={18} name="calendar" color={theme.colors.primary} style={{ marginRight: 6 }} />
            <Text variant="bodyMedium" style={{ fontWeight: '500', color: theme.colors.secondary }}>
              Día elegido: <Text style={{ fontWeight: 'bold', color: theme.colors.primary }}>{selectedDateObject?.fullString}</Text>
            </Text>
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
        ) : (
          <View style={styles.grid}>
            {availableSlots.map((time) => {
              const isSelected = selectedTime === time;
              const isOccupied = bookedTimes.includes(time);

              return (
                <TouchableOpacity
                  key={time}
                  disabled={isOccupied}
                  style={[
                    styles.gridItem,
                    {
                      backgroundColor: isOccupied
                        ? 'rgba(150, 150, 150, 0.08)'
                        : isSelected
                        ? theme.colors.primary
                        : theme.colors.surface,
                      borderColor: isOccupied
                        ? 'rgba(244, 67, 54, 0.3)'
                        : isSelected
                        ? theme.colors.primary
                        : 'rgba(150, 150, 150, 0.1)',
                      borderWidth: 1,
                      opacity: isOccupied ? 0.6 : 1
                    }
                  ]}
                  onPress={() => setSelectedTime(time)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={{
                      color: isOccupied
                        ? theme.colors.error
                        : isSelected
                        ? '#121212'
                        : theme.colors.secondary,
                      fontWeight: isSelected || isOccupied ? 'bold' : 'normal',
                      fontSize: 13
                    }}
                  >
                    {time}
                  </Text>
                  {isOccupied && (
                    <Text style={{ fontSize: 9, color: theme.colors.error, fontWeight: 'bold', marginTop: 2 }}>
                      OCUPADO
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
