import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, FlatList, TouchableOpacity } from 'react-native';
import { Text, Card, Button, useTheme, ProgressBar, IconButton } from 'react-native-paper';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

interface DateItem {
  id: string;
  dayName: string; // e.g. "Lun"
  dayNumber: string; // e.g. "15"
  month: string; // e.g. "Jun"
  fullString: string;
}

export default function StepDateScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();

  // Extract params from step 2
  const { serviceIds, totalPrice, barberId, barberName } = params;

  // Generate next 7 days dynamically
  const getNextDays = (): DateItem[] => {
    const days = [];
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
        fullString
      });
    }
    return days;
  };

  const dates = getNextDays();
  const [selectedDateId, setSelectedDateId] = useState<string>('0');
  
  // Available slots
  const timeSlots = [
    '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
    '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM',
    '06:00 PM', '07:00 PM', '08:00 PM'
  ];
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const selectedDateObject = dates.find(d => d.id === selectedDateId);

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

        <View style={styles.grid}>
          {timeSlots.map((time) => {
            const isSelected = selectedTime === time;
            return (
              <TouchableOpacity
                key={time}
                style={[
                  styles.gridItem,
                  {
                    backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
                    borderColor: isSelected ? theme.colors.primary : 'rgba(150, 150, 150, 0.1)',
                    borderWidth: 1
                  }
                ]}
                onPress={() => setSelectedTime(time)}
                activeOpacity={0.8}
              >
                <Text style={{ color: isSelected ? '#121212' : theme.colors.secondary, fontWeight: isSelected ? 'bold' : 'normal' }} variant="bodyMedium">
                  {time}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
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
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
