import React, { useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, Card, Button, Avatar, useTheme, ProgressBar, IconButton, Badge } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Barber {
  id: string;
  name: string;
  photo: string;
  rating: number;
  reviewsCount: number;
  specialty: string;
}

export default function StepBarberScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();

  // Extract params from step 1
  const { serviceIds, totalPrice } = params;

  const barbers: Barber[] = [
    { id: '1', name: 'Carlos Mendoza', photo: 'CM', rating: 4.9, reviewsCount: 124, specialty: 'Experto en Degradados & Perfilado de Barba' },
    { id: '2', name: 'Mateo Rivas', photo: 'MR', rating: 4.8, reviewsCount: 98, specialty: 'Especialista en Cortes Clásicos y Tijeras' },
    { id: '3', name: 'Juan Perez', photo: 'JP', rating: 4.7, reviewsCount: 85, specialty: 'Afeitado Tradicional & Cuidado de la Piel' },
    { id: '0', name: 'Cualquier Barbero Disponible', photo: '??', rating: 5.0, reviewsCount: 999, specialty: 'Elige esta opción para una cita más rápida' },
  ];

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelectBarber = (id: string) => {
    setSelectedId(id);
  };

  const handleNext = () => {
    if (!selectedId) return;
    const selectedBarber = barbers.find(b => b.id === selectedId);

    // Pass everything to step 3 (date and time)
    router.push({
      pathname: '/(reservation)/3-date',
      params: { 
        serviceIds,
        totalPrice,
        barberId: selectedId,
        barberName: selectedBarber?.name
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
        <ProgressBar progress={0.5} color={theme.colors.primary} style={styles.progressBar} />
        <View style={styles.stepLabels}>
          <Text variant="labelMedium" style={{ opacity: 0.6 }}>1. Servicios</Text>
          <Text variant="labelMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>2. Barbero</Text>
          <Text variant="labelMedium" style={{ opacity: 0.4 }}>3. Fecha</Text>
          <Text variant="labelMedium" style={{ opacity: 0.4 }}>4. Confirmar</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.secondary }]}>
          Elige un barbero
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Cada uno de nuestros profesionales cuenta con certificaciones de alta barbería.
        </Text>

        <View style={styles.barbersList}>
          {barbers.map(barber => {
            const isSelected = selectedId === barber.id;
            return (
              <Card
                key={barber.id}
                style={[
                  styles.barberCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: isSelected ? theme.colors.primary : 'rgba(150, 150, 150, 0.1)',
                    borderWidth: isSelected ? 1.5 : 1
                  }
                ]}
                onPress={() => handleSelectBarber(barber.id)}
                elevation={isSelected ? 3 : 1}
              >
                <Card.Content style={styles.cardContent}>
                  <Avatar.Text
                    size={50}
                    label={barber.photo}
                    style={[
                      styles.avatar,
                      { backgroundColor: barber.id === '0' ? theme.colors.surfaceVariant : theme.colors.primary }
                    ]}
                    labelStyle={{ color: barber.id === '0' ? theme.colors.primary : '#121212', fontWeight: 'bold' }}
                  />
                  <View style={styles.infoContainer}>
                    <View style={styles.nameRow}>
                      <Text variant="titleMedium" style={[styles.barberName, { color: theme.colors.secondary }]}>
                        {barber.name}
                      </Text>
                      <View style={styles.ratingRow}>
                        <IconButton icon="star" size={14} iconColor={theme.colors.primary} style={{ margin: 0, padding: 0 }} />
                        <Text variant="bodySmall" style={styles.ratingText}>
                          {barber.rating} <Text style={{ opacity: 0.5 }}>({barber.reviewsCount})</Text>
                        </Text>
                      </View>
                    </View>
                    
                    <Text variant="bodySmall" style={styles.specialty}>
                      {barber.specialty}
                    </Text>
                  </View>
                </Card.Content>
              </Card>
            );
          })}
        </View>
      </ScrollView>

      {/* Persistent Footer */}
      <View style={[styles.footer, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.footerText}>
          <Text variant="bodySmall" style={{ opacity: 0.6 }}>Subtotal:</Text>
          <Text variant="titleLarge" style={[styles.footerPrice, { color: theme.colors.primary }]}>
            S/. {totalPrice}
          </Text>
        </View>
        <Button
          mode="contained"
          disabled={!selectedId}
          onPress={handleNext}
          style={[styles.nextBtn, { backgroundColor: selectedId ? theme.colors.primary : theme.colors.outline }]}
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
  barbersList: {
    gap: 12,
  },
  barberCard: {
    borderRadius: 12,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  avatar: {
    marginRight: 14,
  },
  infoContainer: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  barberName: {
    fontWeight: 'bold',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontWeight: 'bold',
  },
  specialty: {
    opacity: 0.6,
    fontSize: 12,
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
