import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Card, Button, Checkbox, useTheme, ProgressBar, IconButton, Divider } from 'react-native-paper';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Service {
  id: string;
  name: string;
  price: number;
  duration: string;
  category: 'promo' | 'corte' | 'barba' | 'facial';
  description: string;
}

export default function StepServiceScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { preselected } = params;

  const services: Service[] = [
    { id: '7', name: 'Combo VIP Imperial (Promo)', price: 75, duration: '50 min', category: 'promo', description: 'Corte Premium + Diseño de Barba + Exfoliación Facial Express + Bebida de cortesía.' },
    { id: '1', name: 'Corte de Cabello Signature', price: 45, duration: '35 min', category: 'corte', description: 'Lavado premium, corte según fisonomía y acabado con pomada.' },
    { id: '2', name: 'Corte de Cabello Clásico', price: 35, duration: '25 min', category: 'corte', description: 'Corte de cabello tradicional con tijera y máquina.' },
    { id: '3', name: 'Perfilado de Barba Imperial', price: 30, duration: '20 min', category: 'barba', description: 'Diseño de barba con navaja, toalla caliente y aceites hidratantes.' },
    { id: '4', name: 'Recorte de Barba Express', price: 20, duration: '15 min', category: 'barba', description: 'Recorte rápido a máquina y alineación de contornos.' },
    { id: '5', name: 'Mascarilla Carbón Activo', price: 25, duration: '20 min', category: 'facial', description: 'Limpieza profunda de impurezas and puntos negros.' },
    { id: '6', name: 'Exfoliación Facial & Hidratación', price: 20, duration: '15 min', category: 'facial', description: 'Tratamiento revitalizante para la piel del rostro.' },
  ];

  const [selectedIds, setSelectedIds] = useState<string[]>(
    preselected ? [preselected as string] : []
  );

  const handleToggleService = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const getSelectedServices = () => {
    return services.filter(s => selectedIds.includes(s.id));
  };

  const totalAmount = getSelectedServices().reduce((sum, s) => sum + s.price, 0);

  const handleNext = () => {
    if (selectedIds.length === 0) return;
    
    // Pass selected service IDs to next step
    router.push({
      pathname: '/(reservation)/2-barber',
      params: { 
        serviceIds: selectedIds.join(','),
        totalPrice: totalAmount.toString()
      }
    });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      {/* Top Header Row */}
      <View style={styles.headerRow}>
        <IconButton icon="close" size={24} onPress={() => router.replace('/(customer)/home')} />
        <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>Reservar Cita</Text>
        <View style={{ width: 48 }} />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <ProgressBar progress={0.25} color={theme.colors.primary} style={styles.progressBar} />
        <View style={styles.stepLabels}>
          <Text variant="labelMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>1. Servicios</Text>
          <Text variant="labelMedium" style={{ opacity: 0.4 }}>2. Barbero</Text>
          <Text variant="labelMedium" style={{ opacity: 0.4 }}>3. Fecha</Text>
          <Text variant="labelMedium" style={{ opacity: 0.4 }}>4. Confirmar</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.secondary }]}>
          Selecciona los servicios
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Puedes elegir uno o varios servicios para tu sesión.
        </Text>

        {/* Categories */}
        {(['promo', 'corte', 'barba', 'facial'] as const)
          .filter(category => services.some(s => s.category === category))
          .map(category => {
            const categoryServices = services.filter(s => s.category === category);
            const categoryTitle = 
              category === 'promo' ? 'Promociones' :
              category === 'corte' ? 'Cortes' : 
              category === 'barba' ? 'Barba' : 'Tratamientos Faciales';

            return (
              <View key={category} style={styles.categoryBlock}>
                <Text variant="titleMedium" style={[styles.categoryTitle, { color: theme.colors.primary }]}>
                  {categoryTitle}
                </Text>
              
              {categoryServices.map(service => {
                const isSelected = selectedIds.includes(service.id);
                return (
                  <Card 
                    key={service.id} 
                    style={[
                      styles.serviceCard, 
                      { 
                        backgroundColor: theme.colors.surface,
                        borderColor: isSelected ? theme.colors.primary : 'rgba(150, 150, 150, 0.1)',
                        borderWidth: isSelected ? 1.5 : 1
                      }
                    ]}
                    onPress={() => handleToggleService(service.id)}
                    elevation={isSelected ? 3 : 1}
                  >
                    <Card.Content style={styles.cardContent}>
                      <View style={styles.cardMain}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.secondary }}>
                            {service.name}
                          </Text>
                          <Text variant="bodySmall" style={styles.cardDesc}>
                            {service.description}
                          </Text>
                        </View>
                        <Checkbox.Android 
                          status={isSelected ? 'checked' : 'unchecked'} 
                          color={theme.colors.primary}
                          onPress={() => handleToggleService(service.id)}
                        />
                      </View>
                      
                      <Divider style={{ marginVertical: 8, opacity: 0.2 }} />
                      
                      <View style={styles.cardFooter}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <IconSymbol size={16} name="clock" color={theme.colors.outline} style={{ marginRight: 6 }} />
                          <Text variant="bodyMedium" style={styles.duration}>{service.duration}</Text>
                        </View>
                        <Text variant="titleMedium" style={[styles.price, { color: theme.colors.primary }]}>
                          S/. {service.price}
                        </Text>
                      </View>
                    </Card.Content>
                  </Card>
                );
              })}
            </View>
          );
        })}
      </ScrollView>

      {/* Persistent Footer with selection totals */}
      <View style={[styles.footer, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.footerText}>
          <Text variant="bodyMedium" style={{ opacity: 0.6 }}>Total ({selectedIds.length} selec.):</Text>
          <Text variant="titleLarge" style={[styles.footerPrice, { color: theme.colors.primary }]}>
            S/. {totalAmount}
          </Text>
        </View>
        <Button
          mode="contained"
          disabled={selectedIds.length === 0}
          onPress={handleNext}
          style={[styles.nextBtn, { backgroundColor: selectedIds.length > 0 ? theme.colors.primary : theme.colors.outline }]}
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
    paddingBottom: 110, // Avoid overlap with footer
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    opacity: 0.6,
    marginBottom: 20,
  },
  categoryBlock: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  serviceCard: {
    borderRadius: 12,
    marginBottom: 12,
  },
  cardContent: {
    padding: 14,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardDesc: {
    opacity: 0.5,
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  duration: {
    fontSize: 12,
    opacity: 0.5,
  },
  price: {
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
