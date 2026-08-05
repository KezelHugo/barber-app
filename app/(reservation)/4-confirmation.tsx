import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, Card, Button, useTheme, ProgressBar, IconButton, Divider, Portal, Dialog, ActivityIndicator, Avatar } from 'react-native-paper';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '@/config/firebase';
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { getDirectImageUrl } from '@/utils/image-url';

function calculateEndTime(startSlotStr?: string, durationMinutes: number = 0): string {
  if (!startSlotStr || typeof startSlotStr !== 'string') return '';
  const parts = startSlotStr.split(' ');
  if (parts.length < 2) return startSlotStr;

  const [timePart, period] = parts;
  const [hoursStr, minutesStr] = timePart.split(':');
  let hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);

  if (isNaN(hours) || isNaN(minutes)) return startSlotStr;

  if (period === 'PM' && hours < 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }

  const startDate = new Date();
  startDate.setHours(hours, minutes, 0, 0);

  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

  let endHours = endDate.getHours();
  const endMinutes = endDate.getMinutes();
  const endPeriod = endHours >= 12 ? 'PM' : 'AM';

  if (endHours > 12) {
    endHours -= 12;
  } else if (endHours === 0) {
    endHours = 12;
  }

  const formattedMinutes = endMinutes < 10 ? `0${endMinutes}` : `${endMinutes}`;
  const formattedHours = endHours < 10 ? `0${endHours}` : `${endHours}`;

  return `${formattedHours}:${formattedMinutes} ${endPeriod}`;
}

export default function StepConfirmationScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();

  // Extract all parameters from previous steps
  const { serviceIds, totalPrice, barberId, barberName, date, time } = params;

  const [confirmDialogVisible, setConfirmDialogVisible] = useState(false);

  // Real database services state
  const [selectedServices, setSelectedServices] = useState<any[]>([]);
  const [barberImageUrl, setBarberImageUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadingSave, setLoadingSave] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Total duration in minutes
  const totalDuration = selectedServices.reduce((sum, s) => sum + (Number(s.duration) || 0), 0);
  const endTimeStr = calculateEndTime(time as string, totalDuration);

  // Fetch barber image
  useEffect(() => {
    if (!barberId) return;
    const fetchBarber = async () => {
      try {
        const bDoc = await getDoc(doc(db, 'users', barberId as string));
        if (bDoc.exists()) {
          const bData = bDoc.data();
          setBarberImageUrl(bData.imageUrl || '');
        }
      } catch (err) {
        console.error("Error al obtener imagen del barbero:", err);
      }
    };
    fetchBarber();
  }, [barberId]);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'services'));
        const dbServices: any[] = [];
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          dbServices.push({
            id: docSnap.id,
            name: data.name || '',
            price: Number(data.price) || 0,
            promoPrice: data.promoPrice !== undefined ? Number(data.promoPrice) : undefined,
            duration: Number(data.duration) || 0,
            category: data.category || 'cortes',
          });
        });
        
        const selectedIds = serviceIds ? (serviceIds as string).split(',') : [];
        const filtered = dbServices.filter(s => selectedIds.includes(s.id));
        setSelectedServices(filtered);
      } catch (err) {
        console.error("Error al cargar servicios en confirmación:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchServices();
  }, [serviceIds]);

  const handleConfirm = async () => {
    setLoadingSave(true);
    setErrorMsg('');

    try {
      // 1. Anti-overlap double check in Firestore
      const conflictQuery = query(
        collection(db, 'appointments'),
        where('barberId', '==', barberId),
        where('date', '==', date),
        where('time', '==', time)
      );
      const conflictSnapshot = await getDocs(conflictQuery);
      let isOccupied = false;
      conflictSnapshot.forEach((docSnap) => {
        if (docSnap.data().status !== 'cancelled') {
          isOccupied = true;
        }
      });

      if (isOccupied) {
        setErrorMsg('Lo sentimos, este horario acaba de ser reservado por otro cliente. Por favor regresa y elige otro horario.');
        setLoadingSave(false);
        return;
      }

      // 2. Fetch current user profile if available
      let customerName = 'Cliente';
      let customerPhone = '';
      let customerEmail = auth.currentUser?.email || '';

      if (auth.currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
          if (userDoc.exists()) {
            const uData = userDoc.data();
            customerName = uData.name || customerName;
            customerPhone = uData.phone || '';
          }
        } catch (err) {
          console.error("Error al obtener perfil del cliente:", err);
        }
      }

      // 3. Save to /appointments in Firestore
      const servicesSummary = selectedServices.map(s => s.name).join(', ') || 'Servicios de Barbería';
      const newDocRef = doc(collection(db, 'appointments'));

      await setDoc(newDocRef, {
        id: newDocRef.id,
        customerId: auth.currentUser?.uid || 'guest',
        customerName,
        customerPhone,
        customerEmail,
        barberId: barberId || '',
        barberName: barberName || '',
        serviceIds: serviceIds ? (serviceIds as string).split(',') : [],
        servicesSummary,
        totalPrice: Number(totalPrice) || 0,
        totalDuration: Number(totalDuration) || 30,
        endTime: endTimeStr || '',
        date: date || '',
        time: time || '',
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      setConfirmDialogVisible(true);
    } catch (err) {
      console.error("Error al registrar cita en Firestore:", err);
      setErrorMsg('Ocurrió un error al procesar la reserva. Inténtalo de nuevo.');
    } finally {
      setLoadingSave(false);
    }
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
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
                  <IconSymbol size={16} name="clock" color={theme.colors.primary} style={{ marginRight: 6 }} />
                  <Text variant="bodyMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                    {time} {endTimeStr ? `- ${endTimeStr}` : ''}
                  </Text>
                  {endTimeStr ? (
                    <Text variant="bodySmall" style={{ opacity: 0.6, fontSize: 12, marginLeft: 6 }}>
                      (Finaliza aprox. {endTimeStr})
                    </Text>
                  ) : null}
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
              {barberImageUrl ? (
                <Avatar.Image
                  size={50}
                  source={{ uri: getDirectImageUrl(barberImageUrl) }}
                  style={{ backgroundColor: theme.colors.surfaceVariant }}
                />
              ) : (
                <Avatar.Text
                  size={50}
                  label={barberName ? (barberName as string).split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase() : 'BA'}
                  style={{ backgroundColor: theme.colors.primary }}
                  labelStyle={{ color: '#121212', fontWeight: 'bold' }}
                />
              )}
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
            
            {loading ? (
              <ActivityIndicator style={{ marginVertical: 20 }} color={theme.colors.primary} />
            ) : (
              <View style={styles.servicesList}>
                {selectedServices.map(service => {
                  const isPromo = service.category === 'promocion' && service.promoPrice !== undefined;
                  const activePrice = isPromo ? service.promoPrice : service.price;

                  return (
                    <View key={service.id} style={styles.serviceItem}>
                      <View style={{ flex: 1 }}>
                        <Text variant="bodyMedium" style={{ fontWeight: 'bold', color: theme.colors.secondary }}>
                          {service.name}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                          <IconSymbol size={13} name="clock" color="#888888" style={{ marginRight: 4 }} />
                          <Text variant="bodySmall" style={{ opacity: 0.5 }}>
                            {service.duration} min
                          </Text>
                        </View>
                      </View>
                      <Text variant="bodyMedium" style={{ fontWeight: 'bold', color: theme.colors.secondary }}>
                        S/. {activePrice}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            <Divider style={styles.divider} />

            {/* Total Duration Row */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <IconSymbol size={16} name="clock" color={theme.colors.primary} style={{ marginRight: 6 }} />
                <Text variant="bodyMedium" style={{ opacity: 0.7 }}>Tiempo estimado total:</Text>
              </View>
              <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.secondary }}>
                {totalDuration} min
              </Text>
            </View>

            <View style={styles.totalRow}>
              <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>Total a pagar:</Text>
              <Text variant="titleLarge" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
                S/. {totalPrice}
              </Text>
            </View>

            {errorMsg ? (
              <View style={{ backgroundColor: 'rgba(244, 67, 54, 0.15)', padding: 12, borderRadius: 8, marginTop: 12 }}>
                <Text style={{ color: theme.colors.error, fontWeight: 'bold', fontSize: 13, textAlign: 'center' }}>
                  {errorMsg}
                </Text>
              </View>
            ) : null}
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Persistent Footer */}
      <View style={[styles.footer, { backgroundColor: theme.colors.surface }]}>
        <Button
          mode="contained"
          onPress={handleConfirm}
          loading={loadingSave}
          disabled={loadingSave}
          style={[styles.confirmBtn, { backgroundColor: theme.colors.primary }]}
          labelStyle={{ color: '#121212', fontWeight: 'bold', fontSize: 16 }}
        >
          {loadingSave ? 'Guardando Reserva...' : 'Confirmar Reserva'}
        </Button>
      </View>

      {/* Success Dialog */}
      <Portal>
        <Dialog
          visible={confirmDialogVisible}
          dismissable={false}
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: 'rgba(212, 175, 55, 0.35)',
            paddingVertical: 4,
          }}
        >
          <Dialog.Content style={styles.successDialogContent}>
            <View style={styles.successIconBadge}>
              <IconButton icon="check-circle" size={48} iconColor={theme.colors.primary} style={{ margin: 0 }} />
            </View>

            <Text variant="headlineSmall" style={[styles.successTitle, { color: theme.colors.secondary }]}>
              ¡Cita Reservada!
            </Text>

            <View style={[styles.successSummaryBox, { backgroundColor: theme.colors.background }]}>
              <View style={styles.summaryItemRow}>
                <IconSymbol size={16} name="person.fill" color={theme.colors.primary} style={{ marginRight: 8 }} />
                <Text variant="bodyMedium" style={{ color: theme.colors.secondary, flex: 1 }}>
                  Barbero: <Text style={{ fontWeight: 'bold' }}>{barberName}</Text>
                </Text>
              </View>

              <View style={styles.summaryItemRow}>
                <IconSymbol size={16} name="calendar" color={theme.colors.primary} style={{ marginRight: 8 }} />
                <Text variant="bodyMedium" style={{ color: theme.colors.secondary, flex: 1 }}>
                  Fecha: <Text style={{ fontWeight: 'bold' }}>{date}</Text>
                </Text>
              </View>

              <View style={styles.summaryItemRow}>
                <IconSymbol size={16} name="clock" color={theme.colors.primary} style={{ marginRight: 8 }} />
                <Text variant="bodyMedium" style={{ color: theme.colors.secondary, flex: 1 }}>
                  Horario: <Text style={{ fontWeight: 'bold', color: theme.colors.primary }}>{time} {endTimeStr ? `- ${endTimeStr}` : ''}</Text>
                </Text>
              </View>
            </View>

            <Text variant="bodySmall" style={styles.successNote}>
              * Puedes pagar por adelantado con Yape/Plin o al finalizar tu atención en la sede.
            </Text>
          </Dialog.Content>

          <Dialog.Actions style={{ justifyContent: 'center', paddingHorizontal: 20, paddingBottom: 16 }}>
            <Button
              mode="contained"
              onPress={handleFinish}
              style={{ backgroundColor: theme.colors.primary, width: '100%', borderRadius: 8, paddingVertical: 2 }}
              labelStyle={{ color: '#121212', fontWeight: 'bold', fontSize: 15 }}
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
    paddingTop: 8,
  },
  successIconBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  successTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  successSummaryBox: {
    width: '100%',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.15)',
    marginVertical: 10,
    gap: 8,
  },
  summaryItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  successNote: {
    textAlign: 'center',
    opacity: 0.5,
    fontSize: 11,
    marginTop: 4,
  },
});
