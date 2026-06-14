import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Divider, IconButton, ProgressBar, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AdminDashboardScreen() {
  const theme = useTheme();
  const router = useRouter();

  // Mock weekly revenue for the custom bar chart
  const weeklyRevenue = [
    { day: 'Lun', amount: 540, progress: 0.64 },
    { day: 'Mar', amount: 620, progress: 0.73 },
    { day: 'Mie', amount: 480, progress: 0.57 },
    { day: 'Jue', amount: 720, progress: 0.85 },
    { day: 'Vie', amount: 840, progress: 1.00 }, // Max
    { day: 'Sab', amount: 790, progress: 0.94 },
    { day: 'Dom', amount: 310, progress: 0.36 },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <View>
          <Text variant="headlineSmall" style={[styles.headerTitle, { color: theme.colors.secondary }]}>
            Admin Panel
          </Text>
          <Text variant="bodySmall" style={styles.headerSubtitle}>
            Sede Principal • San Isidro
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Metrics Grid */}
        <View style={styles.metricsGrid}>
          {/* Card 1: Total appointments */}
          <Card style={[styles.metricCard, { backgroundColor: theme.colors.surface }]} elevation={2}>
            <Card.Content style={styles.metricContent}>
              <View style={styles.metricHeader}>
                <Text style={{ opacity: 0.5 }} variant="labelMedium">CITAS HOY</Text>
                <IconButton icon="calendar-check" size={20} iconColor={theme.colors.primary} style={styles.metricIcon} />
              </View>
              <Text style={styles.metricValue} variant="headlineMedium">18</Text>
              <Text style={styles.metricTrendUp} variant="labelSmall">📈 +12% vs ayer</Text>
            </Card.Content>
          </Card>

          {/* Card 2: Estimated Income */}
          <Card style={[styles.metricCard, { backgroundColor: theme.colors.surface }]} elevation={2}>
            <Card.Content style={styles.metricContent}>
              <View style={styles.metricHeader}>
                <Text style={{ opacity: 0.5 }} variant="labelMedium">INGRESOS</Text>
                <IconButton icon="cash" size={20} iconColor="#4CAF50" style={styles.metricIcon} />
              </View>
              <Text style={[styles.metricValue, { color: '#4CAF50' }]} variant="headlineMedium">S/. 840</Text>
              <Text style={styles.metricTrendUp} variant="labelSmall">📈 +8% vs ayer</Text>
            </Card.Content>
          </Card>

          {/* Card 3: Cancelled appointments */}
          <Card style={[styles.metricCard, { backgroundColor: theme.colors.surface }]} elevation={2}>
            <Card.Content style={styles.metricContent}>
              <View style={styles.metricHeader}>
                <Text style={{ opacity: 0.5 }} variant="labelMedium">CANCELADAS</Text>
                <IconButton icon="calendar-remove" size={20} iconColor={theme.colors.error} style={styles.metricIcon} />
              </View>
              <Text style={[styles.metricValue, { color: theme.colors.error }]} variant="headlineMedium">2</Text>
              <Text style={styles.metricTrendDown} variant="labelSmall">📉 -50% vs ayer</Text>
            </Card.Content>
          </Card>
        </View>

        {/* Weekly Revenue Custom Chart */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={2}>
          <Card.Content>
            <View style={styles.chartHeader}>
              <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.secondary }}>
                Ingresos Estimados por Día
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                Esta Semana
              </Text>
            </View>

            {/* Custom Bar Chart using standard native components */}
            <View style={styles.chartContainer}>
              {weeklyRevenue.map((item, index) => (
                <View key={index} style={styles.chartColumn}>
                  {/* Visual Bar representing percentage */}
                  <View style={styles.barWrapper}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: `${item.progress * 100}%`,
                          backgroundColor: item.day === 'Vie' ? theme.colors.primary : theme.colors.surfaceVariant,
                          borderColor: theme.colors.primary,
                          borderWidth: item.day === 'Vie' ? 0 : 0.5,
                        }
                      ]}
                    />
                  </View>
                  <Text variant="bodySmall" style={styles.barDayText}>{item.day}</Text>
                  <Text variant="labelSmall" style={styles.barAmtText}>S/.{item.amount}</Text>
                </View>
              ))}
            </View>
          </Card.Content>
        </Card>

        {/* Top Barbers list */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={2}>
          <Card.Content>
            <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.secondary, marginBottom: 12 }}>
              Productividad Barberos (Hoy)
            </Text>

            <BarberProgressRow name="Carlos Mendoza" appts={8} progress={0.8} theme={theme} />
            <Divider style={styles.divider} />
            <BarberProgressRow name="Mateo Rivas" appts={6} progress={0.6} theme={theme} />
            <Divider style={styles.divider} />
            <BarberProgressRow name="Juan Perez" appts={4} progress={0.4} theme={theme} />
          </Card.Content>
        </Card>

        {/* Shortcuts */}
        <View style={styles.shortcuts}>
          <Button
            mode="contained-tonal"
            onPress={() => router.push('/(admin)/catalog' as any)}
            icon="tag-outline"
            style={styles.shortcutBtn}
          >
            Editar Catálogo
          </Button>
          <Button
            mode="contained-tonal"
            onPress={() => router.push('/(admin)/appointments' as any)}
            icon="calendar-sync"
            style={styles.shortcutBtn}
          >
            Reasignar Citas
          </Button>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// Subcomponents helper
function BarberProgressRow({ name, appts, progress, theme }: { name: string; appts: number; progress: number; theme: any }) {
  return (
    <View style={styles.barberProgressRow}>
      <View style={styles.barberProgressInfo}>
        <Text variant="bodyMedium" style={{ fontWeight: 'bold', color: theme.colors.secondary }}>{name}</Text>
        <Text variant="bodyMedium" style={{ opacity: 0.6 }}>{appts} citas</Text>
      </View>
      <ProgressBar progress={progress} color={theme.colors.primary} style={styles.barberProgressBar} />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 16,
    paddingBottom: 40,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    width: '48%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.1)',
  },
  metricContent: {
    padding: 12,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricIcon: {
    margin: 0,
    backgroundColor: 'rgba(150, 150, 150, 0.08)',
  },
  metricValue: {
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  metricTrendUp: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  metricTrendDown: {
    color: '#F44336',
    fontWeight: 'bold',
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.1)',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 160,
    paddingTop: 10,
    paddingBottom: 5,
  },
  chartColumn: {
    alignItems: 'center',
    width: '13%',
  },
  barWrapper: {
    height: 100,
    width: '100%',
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(150, 150, 150, 0.05)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 4,
  },
  barDayText: {
    fontWeight: 'bold',
    marginTop: 6,
    fontSize: 11,
    opacity: 0.7,
  },
  barAmtText: {
    fontSize: 9,
    opacity: 0.5,
  },
  barberProgressRow: {
    marginVertical: 10,
  },
  barberProgressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  barberProgressBar: {
    height: 6,
    borderRadius: 3,
  },
  divider: {
    opacity: 0.1,
  },
  shortcuts: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  shortcutBtn: {
    flex: 1,
    borderRadius: 8,
  },
});