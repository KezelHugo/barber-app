import React, { useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, Card, Button, useTheme, ProgressBar, IconButton, Divider, Portal, Dialog } from 'react-native-paper';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function StepConfirmationScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();

  // Extract all parameters from previous steps
  const { serviceIds, totalPrice, barberId, barberName, date, time } = params;

  const [confirmDialogVisible, setConfirmDialogVisible] = useState(false);

  // Mock mapping of service names
  const serviceList = [
    { id: '1', name: 'Corte de Cabello Signature', price: 45, duration: '35 min' },
    { id: '2', name: 'Corte de Cabello Clásico', price: 35, duration: '25 min' },
    { id: '3', name: 'Perfilado de Barba Imperial', price: 30, duration: '20 min' },
    { id: '4', name: 'Recorte de Barba Express', price: 20, duration: '15 min' },
    { id: '5', name: 'Mascarilla Carbón Activo', price: 25, duration: '20 min' },
    { id: '6', name: 'Exfoliación Facial & Hidratación', price: 20, duration: '15 min' },
  ];

  // Filter selected services based on passed comma-separated string of IDs
  const selectedServiceIds = serviceIds ? (serviceIds as string).split(',') : [];
  const selectedServices = serviceList.filter(s => selectedServiceIds.includes(s.id));

  const handleConfirm = () => {
    setConfirmDialogVisible(true);
  };

  const handleFinish = () => {
    setConfirmDialogVisible(false);
    // Redirect to customer appointments tab
    router.replace('/(customer)/my-dates');
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
        <ProgressBar progress={1.0} color={theme.colors.primary} style={styles.progressBar} />
        <View style={styles.stepLabels}>
          <Text variant="labelMedium" style={{ opacity: 0.6 }}>1. Servicios</Text>
          <Text variant="labelMedium" style={{ opacity: 0.6 }}>2. Barbero</Text>
          <Text variant="labelMedium" style={{ opacity: 0.6 }}>3. Fecha</Text>
          <Text variant="labelMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>4. Confirmar</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.secondary }]}>
          Resumen de tu cita
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Verifica los datos de tu reserva antes de confirmar.
        </Text>

        {/* 1. DateTime Details Card */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={2}>
          <Card.Content style={styles.cardContent}>
            <View style={styles.dateTimeHeader}>
              <IconButton icon="calendar-check" size={36} iconColor={theme.colors.primary} style={{ margin: 0 }} />
              <View style={styles.dateTimeText}>
                <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.secondary }}>
                  {date}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <IconSymbol size={16} name="clock" color={theme.colors.primary} style={{ marginRight: 6 }} />
                  <Text variant="bodyMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                    {time}
                  </Text>
                </View>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* 2. Barber Details */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={2}>
          <Card.Content style={styles.cardContent}>
            <Text variant="labelSmall" style={[styles.sectionTitleLabel, { color: theme.colors.primary }]}>
              BARBERO SELECCIONADO
            </Text>
            <View style={styles.barberRow}>
              <IconButton icon="account" size={32} iconColor={theme.colors.secondary} style={{ backgroundColor: theme.colors.surfaceVariant, margin: 0 }} />
              <View style={{ marginLeft: 12 }}>
                <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.secondary }}>
                  {barberName}
                </Text>
                <Text variant="bodySmall" style={{ opacity: 0.5 }}>
                  Atención en sede principal
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* 3. Services Summary Details */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={2}>
          <Card.Content style={styles.cardContent}>
            <Text variant="labelSmall" style={[styles.sectionTitleLabel, { color: theme.colors.primary }]}>
              SERVICIOS SELECCIONADOS
            </Text>
            
            <View style={styles.servicesList}>
              {selectedServices.map(service => (
                <View key={service.id} style={styles.serviceItem}>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium" style={{ fontWeight: 'bold', color: theme.colors.secondary }}>
                      {service.name}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                      <IconSymbol size={13} name="clock" color="#888888" style={{ marginRight: 4 }} />
                      <Text variant="bodySmall" style={{ opacity: 0.5 }}>
                        {service.duration}
                      </Text>
                    </View>
                  </View>
                  <Text variant="bodyMedium" style={{ fontWeight: 'bold', color: theme.colors.secondary }}>
                    S/. {service.price}
                  </Text>
                </View>
              ))}
            </View>

            <Divider style={styles.divider} />

            <View style={styles.totalRow}>
              <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>Total a pagar:</Text>
              <Text variant="titleLarge" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
                S/. {totalPrice}
              </Text>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Persistent Footer */}
      <View style={[styles.footer, { backgroundColor: theme.colors.surface }]}>
        <Button
          mode="contained"
          onPress={handleConfirm}
          style={[styles.confirmBtn, { backgroundColor: theme.colors.primary }]}
          labelStyle={{ color: '#121212', fontWeight: 'bold', fontSize: 16 }}
        >
          Confirmar Reserva
        </Button>
      </View>

      {/* Success Dialog */}
      <Portal>
        <Dialog visible={confirmDialogVisible} dismissable={false} style={{ backgroundColor: theme.colors.surface }}>
          <Dialog.Content style={styles.successDialogContent}>
            <IconButton icon="check-circle" size={80} iconColor="#4CAF50" style={{ margin: 0, marginBottom: 16 }} />
            <Text variant="headlineSmall" style={[styles.successTitle, { color: theme.colors.secondary }]}>
              ¡Cita Reservada!
            </Text>
            <Text variant="bodyMedium" style={styles.successDesc}>
              Tu cita con <Text style={{ fontWeight: 'bold' }}>{barberName}</Text> ha sido agendada con éxito para el <Text style={{ fontWeight: 'bold' }}>{date}</Text> a las <Text style={{ fontWeight: 'bold', color: theme.colors.primary }}>{time}</Text>.
            </Text>
            <Text variant="bodySmall" style={styles.successNote}>
              * Puedes pagar por adelantado con Yape/Plin o al finalizar tu atención.
            </Text>
          </Dialog.Content>
          <Dialog.Actions style={{ justifyContent: 'center', paddingBottom: 16 }}>
            <Button
              mode="contained"
              onPress={handleFinish}
              style={{ backgroundColor: theme.colors.primary, width: '80%' }}
              labelStyle={{ color: '#121212', fontWeight: 'bold' }}
            >
              Ver Mis Citas
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
    gap: 16,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    opacity: 0.6,
    marginBottom: 10,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.1)',
  },
  cardContent: {
    padding: 16,
  },
  dateTimeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateTimeText: {
    marginLeft: 14,
    flex: 1,
  },
  sectionTitleLabel: {
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  barberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  servicesList: {
    gap: 12,
    marginBottom: 16,
  },
  serviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  divider: {
    opacity: 0.15,
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(150, 150, 150, 0.1)',
    elevation: 10,
  },
  confirmBtn: {
    width: '100%',
    paddingVertical: 6,
    borderRadius: 8,
  },
  successDialogContent: {
    alignItems: 'center',
    paddingTop: 16,
  },
  successTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  successDesc: {
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.8,
  },
  successNote: {
    textAlign: 'center',
    opacity: 0.5,
    fontSize: 12,
    marginTop: 12,
  },
});
