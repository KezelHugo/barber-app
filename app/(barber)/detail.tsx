import React from 'react';
import { StyleSheet, View, ScrollView, Linking } from 'react-native';
import { Text, Card, Button, Avatar, useTheme, IconButton, List, Divider } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SafeAreaView } from 'react-native-safe-area-context';

interface PastService {
  date: string;
  service: string;
  barber: string;
  rating: number;
  notes?: string;
}

export default function AppointmentDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();

  // Extract client parameters
  const { clientId, clientName, clientPhone, service, date, time } = params;

  const handleCall = () => {
    if (clientPhone) {
      Linking.openURL(`tel:${clientPhone}`);
    }
  };

  // Mock past services for this client
  const history: PastService[] = [
    { 
      date: '12 de Mayo, 2026', 
      service: 'Corte de Cabello Signature & Lavado', 
      barber: 'Carlos Mendoza', 
      rating: 5,
      notes: 'Solicitó degradado medio. Buen crecimiento de cabello.'
    },
    { 
      date: '10 de Abril, 2026', 
      service: 'Corte de Cabello Signature & Perfilado Barba', 
      barber: 'Carlos Mendoza', 
      rating: 4,
      notes: 'Probó toalla caliente por primera vez, le gustó el servicio.'
    },
    { 
      date: '05 de Marzo, 2026', 
      service: 'Corte de Cabello Clásico', 
      barber: 'Mateo Rivas', 
      rating: 5,
      notes: 'Corte rápido a máquina. Sin barba.'
    }
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <View style={styles.headerRow}>
        <IconButton icon="arrow-left" size={24} onPress={() => router.back()} />
        <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>Detalle de Cita</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Client Profile Summary */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={2}>
          <Card.Content style={styles.profileHeader}>
            <Avatar.Text 
              size={64} 
              label={clientName ? (clientName as string).split(' ').map(n => n[0]).join('') : 'KG'} 
              style={{ backgroundColor: theme.colors.primary }}
              labelStyle={{ color: '#121212', fontWeight: 'bold' }}
            />
            <Text variant="headlineSmall" style={[styles.name, { color: theme.colors.secondary }]}>
              {clientName || 'Cliente'}
            </Text>
            <Text variant="bodyMedium" style={styles.timeTag}>
              Cita: <Text style={{ fontWeight: 'bold', color: theme.colors.primary }}>{date || 'Fecha'} • {time || '09:00 AM'}</Text>
            </Text>
            <Text variant="bodySmall" style={{ opacity: 0.5, marginTop: 4 }}>
              Servicios: {service || 'Corte Signature'}
            </Text>
            {clientPhone ? (
              <Button
                mode="outlined"
                icon="phone"
                onPress={handleCall}
                style={{ marginTop: 12, borderColor: theme.colors.primary }}
                textColor={theme.colors.primary}
                compact
              >
                Llamar: {clientPhone}
              </Button>
            ) : null}
          </Card.Content>
        </Card>

        {/* 1. Barber Specific Preference Notes */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={2}>
          <Card.Content>
            <Text variant="labelSmall" style={[styles.sectionLabel, { color: theme.colors.primary }]}>
              PREFERENCIAS ESTÉTICAS DEL CLIENTE
            </Text>
            
            <View style={[styles.preferenceBox, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Text variant="bodyMedium" style={styles.prefText}>
                ⚠️ <Text style={{ fontWeight: 'bold' }}>Nota técnica: </Text>
                "Prefiere patillas redondas, tijera arriba, máquina nro 2 en los lados. NO usar navaja en el cuello porque le genera irritación extrema."
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* 2. History of Past Services */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={2}>
          <Card.Content style={{ paddingBottom: 8 }}>
            <Text variant="labelSmall" style={[styles.sectionLabel, { color: theme.colors.primary }]}>
              HISTORIAL DE CORTES PREVIOS
            </Text>

            <List.Section style={{ margin: 0 }}>
              {history.map((item, index) => (
                <View key={index}>
                  <View style={styles.historyItem}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.secondary }}>
                        {item.service}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                        <IconSymbol size={13} name="calendar" color={theme.colors.outline} style={{ marginRight: 4 }} />
                        <Text variant="bodySmall" style={{ opacity: 0.5 }}>
                          {item.date} • Atendido por: {item.barber}
                        </Text>
                      </View>
                      {item.notes ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                          <IconSymbol size={13} name="document" color={theme.colors.primary} style={{ marginRight: 4 }} />
                          <Text variant="bodySmall" style={[styles.historyNotes, { marginTop: 0 }]}>
                            {item.notes}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    
                    {/* Stars */}
                    <View style={styles.ratingRow}>
                      <IconButton icon="star" size={14} iconColor={theme.colors.primary} style={{ margin: 0 }} />
                      <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>{item.rating}</Text>
                    </View>
                  </View>
                  {index < history.length - 1 && <Divider style={styles.divider} />}
                </View>
              ))}
            </List.Section>
          </Card.Content>
        </Card>

        {/* Back Button */}
        <Button 
          mode="contained" 
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: theme.colors.primary }]}
          labelStyle={{ color: '#121212', fontWeight: 'bold' }}
        >
          Volver a Agenda
        </Button>
      </ScrollView>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 16,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.1)',
    overflow: 'hidden',
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  name: {
    fontWeight: 'bold',
    marginTop: 12,
  },
  timeTag: {
    marginTop: 4,
    opacity: 0.7,
  },
  sectionLabel: {
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  preferenceBox: {
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  prefText: {
    lineHeight: 20,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  historyNotes: {
    marginTop: 4,
    fontStyle: 'italic',
    opacity: 0.7,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    opacity: 0.15,
  },
  backBtn: {
    borderRadius: 8,
    paddingVertical: 4,
    marginTop: 8,
  },
});
