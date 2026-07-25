import { IconSymbol } from '@/components/ui/icon-symbol';
import { db } from '@/config/firebase';
import { useRouter } from 'expo-router';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Button, Card, Dialog, IconButton, Portal, Snackbar, Switch, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

export interface DaySchedule {
  id: string;
  dayName: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

const DEFAULT_DAYS: DaySchedule[] = [
  { id: 'monday', dayName: 'Lunes', isOpen: true, openTime: '09:00 AM', closeTime: '09:00 PM' },
  { id: 'tuesday', dayName: 'Martes', isOpen: true, openTime: '09:00 AM', closeTime: '09:00 PM' },
  { id: 'wednesday', dayName: 'Miércoles', isOpen: true, openTime: '09:00 AM', closeTime: '09:00 PM' },
  { id: 'thursday', dayName: 'Jueves', isOpen: true, openTime: '09:00 AM', closeTime: '09:00 PM' },
  { id: 'friday', dayName: 'Viernes', isOpen: true, openTime: '09:00 AM', closeTime: '09:00 PM' },
  { id: 'saturday', dayName: 'Sábado', isOpen: true, openTime: '09:00 AM', closeTime: '09:00 PM' },
  { id: 'sunday', dayName: 'Domingo', isOpen: false, openTime: '09:00 AM', closeTime: '07:00 PM' },
];

const TIME_OPTIONS = [
  '06:00 AM', '06:30 AM', '07:00 AM', '07:30 AM', '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM',
  '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM',
  '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM',
  '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM', '08:00 PM', '08:30 PM', '09:00 PM', '09:30 PM',
  '10:00 PM', '10:30 PM', '11:00 PM'
];

export default function WorkingHoursScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [days, setDays] = useState<DaySchedule[]>(DEFAULT_DAYS);
  const [loading, setLoading] = useState(true);
  const [loadingSave, setLoadingSave] = useState(false);

  // Time picker dialog state
  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [pickerField, setPickerField] = useState<'openTime' | 'closeTime'>('openTime');

  // Snackbar state
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');

  // Fetch working hours from Firestore doc `/business_settings/working_hours`
  useEffect(() => {
    const fetchHours = async () => {
      try {
        const docRef = doc(db, 'business_settings', 'working_hours');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && data.days) {
            const daysDict = data.days;
            const updatedDays = DEFAULT_DAYS.map((defaultDay) => {
              if (daysDict[defaultDay.id]) {
                return {
                  ...defaultDay,
                  ...daysDict[defaultDay.id]
                };
              }
              return defaultDay;
            });
            setDays(updatedDays);
          }
        }
      } catch (err) {
        console.error("Error al cargar horarios de atención desde Firestore:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHours();
  }, []);

  const toggleDayOpen = (dayId: string) => {
    setDays(prevDays =>
      prevDays.map(day => (day.id === dayId ? { ...day, isOpen: !day.isOpen } : day))
    );
  };

  const openTimePicker = (dayId: string, field: 'openTime' | 'closeTime') => {
    setSelectedDayId(dayId);
    setPickerField(field);
    setPickerVisible(true);
  };

  const selectTime = (time: string) => {
    if (selectedDayId) {
      setDays(prevDays =>
        prevDays.map(day =>
          day.id === selectedDayId ? { ...day, [pickerField]: time } : day
        )
      );
    }
    setPickerVisible(false);
  };

  const handleSave = async () => {
    setLoadingSave(true);
    try {
      const daysDict = days.reduce((acc, day) => {
        acc[day.id] = day;
        return acc;
      }, {} as Record<string, DaySchedule>);

      const docRef = doc(db, 'business_settings', 'working_hours');
      await setDoc(docRef, {
        updatedAt: new Date().toISOString(),
        days: daysDict
      });

      setSnackbarMsg('Horarios de atención guardados exitosamente.');
      setSnackbarVisible(true);
    } catch (err) {
      console.error("Error al guardar horarios de atención en Firestore:", err);
      setSnackbarMsg('Error al guardar horarios. Inténtalo de nuevo.');
      setSnackbarVisible(true);
    } finally {
      setLoadingSave(false);
    }
  };

  const selectedDayObj = days.find(d => d.id === selectedDayId);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <IconButton icon="arrow-left" size={24} onPress={() => router.push('/(admin)/profile')} style={{ marginLeft: -12, marginRight: 4 }} />
          <Text variant="headlineSmall" style={[styles.headerTitle, { color: theme.colors.secondary, marginRight: 8 }]}>
            Horarios de Atención
          </Text>
          <IconSymbol size={22} name="clock.fill" color={theme.colors.primary} />
        </View>
        <Text variant="bodySmall" style={styles.headerSubtitle}>
          Configura los días laborables y rangos horarios del negocio.
        </Text>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="bodyMedium" style={{ marginTop: 12, opacity: 0.7 }}>Cargando horarios de atención...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.daysList}>
            {days.map((item) => (
              <Card
                key={item.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: item.isOpen ? 'rgba(197, 168, 128, 0.3)' : 'rgba(150, 150, 150, 0.1)',
                  }
                ]}
                elevation={1}
              >
                <Card.Content style={styles.cardContent}>
                  {/* Top Day Row */}
                  <View style={styles.dayRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.secondary }}>
                        {item.dayName}
                      </Text>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: item.isOpen ? 'rgba(76, 175, 80, 0.15)' : 'rgba(244, 67, 54, 0.15)' }
                        ]}
                      >
                        <Text
                          style={{
                            color: item.isOpen ? '#4CAF50' : theme.colors.error,
                            fontSize: 11,
                            fontWeight: 'bold'
                          }}
                        >
                          {item.isOpen ? 'ABIERTO' : 'CERRADO'}
                        </Text>
                      </View>
                    </View>

                    <Switch
                      value={item.isOpen}
                      onValueChange={() => toggleDayOpen(item.id)}
                      color={theme.colors.primary}
                    />
                  </View>

                  {/* Expanded Time Pickers Row */}
                  {item.isOpen && (
                    <View style={styles.timePickersRow}>
                      <TouchableOpacity
                        style={[styles.timeBox, { backgroundColor: 'rgba(150, 150, 150, 0.08)', borderColor: theme.colors.primary }]}
                        onPress={() => openTimePicker(item.id, 'openTime')}
                      >
                        <Text variant="labelSmall" style={styles.timeBoxLabel}>Apertura</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                          <Text variant="titleSmall" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
                            {item.openTime}
                          </Text>
                          <IconButton icon="clock-outline" size={16} iconColor={theme.colors.primary} style={{ margin: 0, padding: 0 }} />
                        </View>
                      </TouchableOpacity>

                      <Text style={{ opacity: 0.5, fontWeight: 'bold' }}>a</Text>

                      <TouchableOpacity
                        style={[styles.timeBox, { backgroundColor: 'rgba(150, 150, 150, 0.08)', borderColor: theme.colors.primary }]}
                        onPress={() => openTimePicker(item.id, 'closeTime')}
                      >
                        <Text variant="labelSmall" style={styles.timeBoxLabel}>Cierre</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                          <Text variant="titleSmall" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
                            {item.closeTime}
                          </Text>
                          <IconButton icon="clock-outline" size={16} iconColor={theme.colors.primary} style={{ margin: 0, padding: 0 }} />
                        </View>
                      </TouchableOpacity>
                    </View>
                  )}
                </Card.Content>
              </Card>
            ))}
          </View>

          {/* Action Save Button */}
          <Button
            mode="contained"
            onPress={handleSave}
            loading={loadingSave}
            disabled={loadingSave}
            style={[styles.saveBtn, { backgroundColor: theme.colors.primary }]}
            labelStyle={styles.saveBtnLabel}
          >
            {loadingSave ? 'Guardando...' : 'Guardar Horarios'}
          </Button>
        </ScrollView>
      )}

      {/* Time Picker Dialog */}
      <Portal>
        <Dialog
          visible={pickerVisible}
          onDismiss={() => setPickerVisible(false)}
          style={{ backgroundColor: theme.colors.surface, borderRadius: 12, maxHeight: 480 }}
        >
          <Dialog.Title style={{ color: theme.colors.primary, fontSize: 18, fontWeight: 'bold' }}>
            {selectedDayObj?.dayName} • {pickerField === 'openTime' ? 'Hora de Apertura' : 'Hora de Cierre'}
          </Dialog.Title>
          <Dialog.Content style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={true}>
              <View style={styles.timeGrid}>
                {TIME_OPTIONS.map((time) => {
                  const isCurrent = selectedDayObj && selectedDayObj[pickerField] === time;
                  return (
                    <TouchableOpacity
                      key={time}
                      style={[
                        styles.timeOptionItem,
                        {
                          backgroundColor: isCurrent ? theme.colors.primary : 'rgba(150, 150, 150, 0.1)',
                          borderColor: isCurrent ? theme.colors.primary : 'transparent'
                        }
                      ]}
                      onPress={() => selectTime(time)}
                    >
                      <Text
                        style={{
                          color: isCurrent ? '#121212' : theme.colors.secondary,
                          fontWeight: isCurrent ? 'bold' : '500',
                          fontSize: 13
                        }}
                      >
                        {time}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPickerVisible(false)} textColor={theme.colors.outline}>
              Cancelar
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
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  daysList: {
    gap: 12,
    marginBottom: 24,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
  },
  cardContent: {
    padding: 14,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  timePickersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.1)',
  },
  timeBox: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  timeBoxLabel: {
    opacity: 0.5,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  saveBtn: {
    borderRadius: 8,
    paddingVertical: 6,
  },
  saveBtnLabel: {
    fontWeight: 'bold',
    color: '#121212',
    fontSize: 15,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  timeOptionItem: {
    width: '31%',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
