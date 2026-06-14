import React, { useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, Card, Avatar, useTheme, IconButton, Button, Portal, Dialog, RadioButton, Snackbar } from 'react-native-paper';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

interface AdminAppointment {
  id: string;
  clientName: string;
  service: string;
  time: string;
  barberId: string;
  barberName: string;
}

export default function AdminAppointmentsScreen() {
  const theme = useTheme();
  const router = useRouter();

  // List of active barbers
  const barbers = [
    { id: '1', name: 'Carlos Mendoza', initials: 'CM' },
    { id: '2', name: 'Mateo Rivas', initials: 'MR' },
    { id: '3', name: 'Juan Perez', initials: 'JP' },
  ];

  // Master list of daily appointments
  const [appointments, setAppointments] = useState<AdminAppointment[]>([
    { id: '1', clientName: 'Kevin Guerrero', service: 'Corte Signature', time: '09:00 AM', barberId: '1', barberName: 'Carlos Mendoza' },
    { id: '2', clientName: 'Luis Flores', service: 'Perfilado de Barba Premium', time: '10:30 AM', barberId: '1', barberName: 'Carlos Mendoza' },
    { id: '3', clientName: 'Andres Silva', service: 'Combo Corte & Barba', time: '12:00 PM', barberId: '2', barberName: 'Mateo Rivas' },
    { id: '4', clientName: 'Diego Torres', service: 'Tratamiento Facial Exfoliante', time: '02:30 PM', barberId: '3', barberName: 'Juan Perez' },
    { id: '5', clientName: 'Sebastian Rivas', service: 'Corte de Cabello Clásico', time: '04:00 PM', barberId: '2', barberName: 'Mateo Rivas' },
    { id: '6', clientName: 'Martin Paz', service: 'Exfoliación Facial Express', time: '05:30 PM', barberId: '1', barberName: 'Carlos Mendoza' },
  ]);

  const [selectedFilterBarberId, setSelectedFilterBarberId] = useState<string>('1'); // Defaults to Carlos
  
  // Reassignment states
  const [reassignDialogVisible, setReassignDialogVisible] = useState(false);
  const [apptToReassign, setApptToReassign] = useState<AdminAppointment | null>(null);
  const [newBarberId, setNewBarberId] = useState<string>('');
  
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');

  const filteredAppointments = appointments.filter(a => a.barberId === selectedFilterBarberId);

  const handleReassignClick = (appt: AdminAppointment) => {
    setApptToReassign(appt);
    setNewBarberId(appt.barberId); // Default to current
    setReassignDialogVisible(true);
  };

  const confirmReassignment = () => {
    if (apptToReassign && newBarberId) {
      const selectedBarber = barbers.find(b => b.id === newBarberId);
      if (!selectedBarber) return;

      // Update state
      setAppointments(prev =>
        prev.map(a => 
          a.id === apptToReassign.id 
            ? { ...a, barberId: newBarberId, barberName: selectedBarber.name } 
            : a
        )
      );

      setReassignDialogVisible(false);
      setSnackbarMsg(`Cita de ${apptToReassign.clientName} reasignada con éxito a ${selectedBarber.name}.`);
      setSnackbarVisible(true);
    }
  };

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
          Reasigna y gestiona citas entre barberos
        </Text>
      </View>

      {/* Barber Filter Strip */}
      <View style={styles.filterContainer}>
        <Text variant="labelLarge" style={[styles.filterLabel, { color: theme.colors.primary }]}>
          FILTRAR POR BARBERO:
        </Text>
        <View style={styles.chipsRow}>
          {barbers.map((barber) => {
            const isSelected = selectedFilterBarberId === barber.id;
            return (
              <Button
                key={barber.id}
                mode={isSelected ? 'contained' : 'outlined'}
                onPress={() => setSelectedFilterBarberId(barber.id)}
                style={styles.chipBtn}
                labelStyle={{ fontSize: 12, color: isSelected ? '#121212' : theme.colors.secondary, fontWeight: 'bold' }}
                compact
              >
                {barber.name}
              </Button>
            );
          })}
        </View>
      </View>

      {/* Appointments List for selected barber */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {filteredAppointments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <IconButton icon="calendar-blank-outline" size={48} iconColor={theme.colors.outline} />
            <Text variant="bodyLarge" style={{ opacity: 0.5 }}>No hay citas asignadas para hoy.</Text>
          </View>
        ) : (
          filteredAppointments.map((item) => (
            <Card key={item.id} style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={2}>
              <Card.Content style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <IconSymbol size={16} name="clock" color={theme.colors.primary} style={{ marginRight: 6 }} />
                    <Text variant="titleMedium" style={[styles.timeText, { color: theme.colors.primary }]}>
                      {item.time}
                    </Text>
                  </View>
                  <Text style={{ opacity: 0.4 }} variant="bodySmall">ID: #{item.id}</Text>
                </View>

                <View style={styles.clientRow}>
                  <Avatar.Text 
                    size={40} 
                    label={item.clientName.split(' ').map(n => n[0]).join('')} 
                    style={{ backgroundColor: theme.colors.surfaceVariant }}
                    labelStyle={{ color: theme.colors.primary, fontWeight: 'bold' }}
                  />
                  <View style={styles.clientText}>
                    <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.secondary }}>
                      {item.clientName}
                    </Text>
                    <Text variant="bodySmall" style={{ opacity: 0.6 }}>
                      {item.service}
                    </Text>
                  </View>
                </View>

                <View style={styles.actions}>
                  <Button 
                    mode="contained" 
                    onPress={() => handleReassignClick(item)}
                    style={[styles.reassignBtn, { backgroundColor: theme.colors.primary }]}
                    labelStyle={{ color: '#121212', fontWeight: 'bold' }}
                    icon="swap-horizontal"
                    compact
                  >
                    Reasignar Barbero
                  </Button>
                </View>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>

      {/* Reassign Dialog */}
      <Portal>
        <Dialog visible={reassignDialogVisible} onDismiss={() => setReassignDialogVisible(false)} style={{ backgroundColor: theme.colors.surface }}>
          <Dialog.Title style={{ color: theme.colors.primary }}>Reasignar Barbero</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ marginBottom: 16 }}>
              Selecciona el nuevo barbero para la cita de <Text style={{ fontWeight: 'bold' }}>{apptToReassign?.clientName}</Text> ({apptToReassign?.time}):
            </Text>

            <RadioButton.Group onValueChange={value => setNewBarberId(value)} value={newBarberId}>
              {barbers.map((b) => (
                <View key={b.id} style={styles.radioRow}>
                  <RadioButton.Android value={b.id} color={theme.colors.primary} />
                  <Text variant="bodyLarge" style={{ color: theme.colors.secondary }}>{b.name}</Text>
                </View>
              ))}
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setReassignDialogVisible(false)} textColor={theme.colors.outline}>
              Cancelar
            </Button>
            <Button onPress={confirmReassignment} textColor={theme.colors.primary} labelStyle={{ fontWeight: 'bold' }}>
              Confirmar
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
    flexDirection: 'row',
    gap: 8,
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
    paddingVertical: 60,
  },
  card: {
    borderRadius: 12,
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
  timeText: {
    fontWeight: 'bold',
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
  actions: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.1)',
    paddingTop: 10,
    alignItems: 'flex-end',
  },
  reassignBtn: {
    borderRadius: 6,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
});
