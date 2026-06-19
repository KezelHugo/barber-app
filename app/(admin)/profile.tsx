import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Avatar, Button, Card, Divider, List, Text, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useUserRole } from '@/context/user-role';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AdminProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { userName, userEmail, logout } = useUserRole();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <Card style={[styles.headerCard, { backgroundColor: theme.colors.surface }]} elevation={2}>
          <Card.Content style={styles.headerContent}>
            <Avatar.Text
              size={80}
              label={userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
              style={{ backgroundColor: theme.colors.primary }}
              labelStyle={{ color: '#121212', fontWeight: 'bold' }}
            />
            <Text variant="headlineSmall" style={[styles.name, { color: theme.colors.secondary }]}>
              {userName}
            </Text>
            <Text variant="bodyMedium" style={styles.roleTitle}>
              {userEmail || 'Soporte BarberApp S.A.C.'}
            </Text>
            <View style={[styles.badge, { backgroundColor: 'rgba(212, 175, 55, 0.15)', marginTop: 8 }]}>
              <Text style={{ color: theme.colors.primary, fontWeight: 'bold', fontSize: 12 }}>
                SUPER USER
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Configurations List */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
          <List.Section style={{ marginVertical: 0 }}>
            <List.Subheader style={{ color: theme.colors.primary, fontWeight: 'bold' }}>CONFIGURACIÓN DEL NEGOCIO</List.Subheader>

            <List.Item
              title="Gestionar Barberos"
              description="3 barberos registrados"
              left={(props) => <List.Icon {...props} icon="account-group" color={theme.colors.primary} />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
            />
            <Divider style={styles.divider} />

            <List.Item
              title="Horarios de Atención"
              description="Lunes a Domingo • 09:00 AM - 09:00 PM"
              left={(props) => <List.Icon {...props} icon="clock-outline" color={theme.colors.primary} />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
            />
            <Divider style={styles.divider} />

            <List.Item
              title="Promociones & Cupones"
              description="1 promoción activa (Promo del Mes)"
              left={(props) => <List.Icon {...props} icon="ticket-percent-outline" color={theme.colors.primary} />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
            />
          </List.Section>
        </Card>

        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
          <List.Section style={{ marginVertical: 0 }}>
            <List.Subheader style={{ color: theme.colors.primary, fontWeight: 'bold' }}>REPORTES Y AUDITORÍA</List.Subheader>

            <List.Item
              title="Reporte de Ingresos Semanales"
              description="Exportar a PDF / Excel"
              left={(props) => <List.Icon {...props} icon="file-chart-outline" color={theme.colors.primary} />}
            />
            <Divider style={styles.divider} />

            <List.Item
              title="Historial de Auditoría"
              description="Ver cambios en precios y horarios"
              left={(props) => <List.Icon {...props} icon="shield-check-outline" color={theme.colors.primary} />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
            />
          </List.Section>
        </Card>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <Button
            mode="contained"
            onPress={logout}
            style={[styles.logoutBtn, { backgroundColor: theme.colors.error }]}
            icon="logout"
            labelStyle={{ fontWeight: 'bold' }}
          >
            Cerrar Sesión
          </Button>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 16,
  },
  headerCard: {
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.1)',
  },
  headerContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  name: {
    fontWeight: 'bold',
    marginTop: 12,
  },
  roleTitle: {
    opacity: 0.6,
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.1)',
    overflow: 'hidden',
  },
  divider: {
    opacity: 0.15,
  },
  actionsContainer: {
    marginTop: 8,
    marginBottom: 20,
  },
  logoutBtn: {
    borderRadius: 8,
    paddingVertical: 4,
  },
});