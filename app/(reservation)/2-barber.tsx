import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, Card, Button, Avatar, useTheme, ProgressBar, IconButton, Badge, ActivityIndicator } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '@/config/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

interface Barber {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
}

export default function StepBarberScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();

  // Extract params from step 1
  const { serviceIds, totalPrice } = params;

  // Real Firestore barbers state
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'barber'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const barbersList: Barber[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Solo mostrar barberos activos (isActive por defecto es true)
        if (data.isActive !== false) {
          barbersList.push({
            id: doc.id,
            name: data.name || '',
            description: data.description || '',
            imageUrl: data.imageUrl || '',
          });
        }
      });
      setBarbers(barbersList);
      setLoading(false);
    }, (err) => {
      console.error("Error al cargar barberos en paso de reserva:", err);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

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
          {loading ? (
            <ActivityIndicator style={{ marginVertical: 40 }} color={theme.colors.primary} />
          ) : barbers.length === 0 ? (
            <Text variant="bodyMedium" style={{ textAlign: 'center', opacity: 0.5, marginVertical: 40 }}>
              No hay barberos registrados disponibles.
            </Text>
          ) : (
            barbers.map(barber => {
              const isSelected = selectedId === barber.id;
              const initials = barber.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

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
                  <Card.Content style={[styles.cardContent, { alignItems: isSelected ? 'flex-start' : 'center' }]}>
                    {barber.imageUrl ? (
                      <Avatar.Image
                        size={50}
                        source={{ uri: barber.imageUrl }}
                        style={styles.avatar}
                      />
                    ) : (
                      <Avatar.Text
                        size={50}
                        label={initials}
                        style={[
                          styles.avatar,
                          { backgroundColor: theme.colors.primary }
                        ]}
                        labelStyle={{ color: '#121212', fontWeight: 'bold' }}
                      />
                    )}
                    <View style={styles.infoContainer}>
                      <View style={styles.nameRow}>
                        <Text variant="titleMedium" style={[styles.barberName, { color: theme.colors.secondary }]}>
                          {barber.name}
                        </Text>
                        <IconButton
                          icon={isSelected ? "chevron-up" : "chevron-down"}
                          size={18}
                          style={{ margin: 0, padding: 0 }}
                          iconColor={theme.colors.primary}
                        />
                      </View>
                      
                      <Text variant="bodySmall" style={{ opacity: 0.7, paddingRight: 4, lineHeight: 18 }} numberOfLines={isSelected ? undefined : 1}>
                        {barber.description}
                      </Text>
                    </View>
                  </Card.Content>
                </Card>
              );
            })
          )}
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
