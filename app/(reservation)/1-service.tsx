import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Card, Button, Checkbox, useTheme, ProgressBar, IconButton, Divider, ActivityIndicator, Searchbar, Menu } from 'react-native-paper';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '@/config/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

interface Service {
  id: string;
  name: string;
  price: number;
  promoPrice?: number;
  duration: number; // en minutos
  category: 'promocion' | 'cortes' | 'barba' | 'faciales';
  description: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  promocion: 'Promoción',
  cortes: 'Cortes',
  barba: 'Barba',
  faciales: 'Faciales'
};

export default function StepServiceScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { preselected } = params;

  // Real database services state
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);

  // Combined filter logic
  const filteredServices = services.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'services'), (snapshot) => {
      const servicesList: Service[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        servicesList.push({
          id: doc.id,
          name: data.name || '',
          price: Number(data.price) || 0,
          promoPrice: data.promoPrice !== undefined ? Number(data.promoPrice) : undefined,
          duration: Number(data.duration) || 0,
          category: data.category || 'cortes',
          description: data.description || '',
        });
      });
      setServices(servicesList);
      setLoading(false);
    }, (err) => {
      console.error("Error al cargar servicios en paso de reserva:", err);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

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

  const totalAmount = getSelectedServices().reduce((sum, s) => {
    const servicePrice = s.category === 'promocion' && s.promoPrice !== undefined ? s.promoPrice : s.price;
    return sum + servicePrice;
  }, 0);

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

      {/* Filter Bar */}
      {!loading && services.length > 0 && (
        <View style={styles.filterBar}>
          <Searchbar
            placeholder="Buscar servicio..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchbar}
            inputStyle={styles.searchbarInput}
            iconColor={theme.colors.outline}
            rippleColor="rgba(197, 168, 128, 0.2)"
          />
          <Menu
            visible={filterMenuVisible}
            onDismiss={() => setFilterMenuVisible(false)}
            anchor={
              <Button
                mode="outlined"
                onPress={() => setFilterMenuVisible(true)}
                style={styles.filterButton}
                icon="filter-variant"
                textColor={theme.colors.primary}
                contentStyle={{ flexDirection: 'row-reverse' }}
              >
                {categoryFilter === 'all' ? 'Todas' : CATEGORY_LABELS[categoryFilter]}
              </Button>
            }
          >
            <Menu.Item onPress={() => { setCategoryFilter('all'); setFilterMenuVisible(false); }} title="Todas" />
            <Menu.Item onPress={() => { setCategoryFilter('promocion'); setFilterMenuVisible(false); }} title="Promociones" />
            <Menu.Item onPress={() => { setCategoryFilter('cortes'); setFilterMenuVisible(false); }} title="Cortes" />
            <Menu.Item onPress={() => { setCategoryFilter('barba'); setFilterMenuVisible(false); }} title="Barba" />
            <Menu.Item onPress={() => { setCategoryFilter('faciales'); setFilterMenuVisible(false); }} title="Faciales" />
          </Menu>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.secondary }]}>
          Selecciona los servicios
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Puedes elegir uno o varios servicios para tu sesión.
        </Text>

        {/* Categories */}
        {loading ? (
          <ActivityIndicator style={{ marginVertical: 40 }} color={theme.colors.primary} />
        ) : filteredServices.length === 0 ? (
          <View style={styles.emptyContainer}>
            <IconSymbol size={48} name="magnifyingglass" color={theme.colors.outline} style={{ marginBottom: 12 }} />
            <Text variant="bodyLarge" style={{ opacity: 0.5, textAlign: 'center' }}>
              No se encontraron servicios con los filtros aplicados.
            </Text>
          </View>
        ) : (
          (['promocion', 'cortes', 'barba', 'faciales'] as const)
            .filter(category => filteredServices.some(s => s.category === category))
            .map(category => {
              const categoryServices = filteredServices.filter(s => s.category === category);
              const categoryTitle = 
                category === 'promocion' ? 'Promociones' :
                category === 'cortes' ? 'Cortes' : 
                category === 'barba' ? 'Barba' : 'Tratamientos Faciales';

              return (
                <View key={category} style={styles.categoryBlock}>
                  <Text variant="titleMedium" style={[styles.categoryTitle, { color: theme.colors.primary }]}>
                    {categoryTitle}
                  </Text>
                
                {categoryServices.map(service => {
                  const isSelected = selectedIds.includes(service.id);
                  const isPromo = service.category === 'promocion' && service.promoPrice !== undefined;

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
                              {service.description || 'Sin descripción'}
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
                            <Text variant="bodyMedium" style={styles.duration}>{service.duration} min</Text>
                          </View>
                          <Text variant="titleMedium" style={[styles.price, { color: theme.colors.primary }]}>
                            {isPromo ? (
                              <>
                                S/. {service.promoPrice} <Text style={{ textDecorationLine: 'line-through', opacity: 0.5, fontSize: 13, color: theme.colors.secondary }}>S/. {service.price}</Text>
                              </>
                            ) : (
                              `S/. ${service.price}`
                            )}
                          </Text>
                        </View>
                      </Card.Content>
                    </Card>
                  );
                })}
              </View>
            );
          })
        )}
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
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
    gap: 8,
  },
  searchbar: {
    flex: 1,
    height: 44,
    backgroundColor: 'rgba(150, 150, 150, 0.05)',
    borderRadius: 8,
  },
  searchbarInput: {
    minHeight: 0,
    fontSize: 14,
    alignSelf: 'center',
    paddingBottom: 4,
  },
  filterButton: {
    height: 44,
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.2)',
  },
  emptyContainer: {
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
