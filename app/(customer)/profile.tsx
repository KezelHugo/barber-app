import { useUserRole } from '@/context/user-role';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Avatar, Button, Card, Divider, List, Snackbar, Text, TextInput, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const theme = useTheme();
  const { role, userName, userEmail, logout } = useUserRole();
  const isGuest = role === 'guest';

  // Personal states (mock edit)
  const [phone, setPhone] = useState('987 654 321');
  const [preferences, setPreferences] = useState(
    'Corte degradado medio (Mid Fade), perfilado de barba fino, marcar patillas redondas, usar toalla caliente para afeitar.'
  );

  const [isEditing, setIsEditing] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  const handleSave = () => {
    setIsEditing(false);
    setSnackbarVisible(true);
  };

  if (isGuest) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background, justifyContent: 'center' }]}>
        <View style={styles.guestContainer}>
          <IconButtonContainer />
          <Avatar.Icon size={80} icon="account-circle-outline" style={{ backgroundColor: theme.colors.surfaceVariant }} color={theme.colors.primary} />
          <Text variant="headlineSmall" style={[styles.guestTitle, { color: theme.colors.secondary }]}>
            Mi Perfil
          </Text>
          <Text variant="bodyMedium" style={styles.guestDesc}>
            Crea una cuenta para guardar tu historial de cortes, tus preferencias de afeitado y recibir promociones personalizadas de nuestros barberos.
          </Text>
          <Button
            mode="contained"
            onPress={() => logout()}
            style={[styles.guestBtn, { backgroundColor: theme.colors.primary }]}
            labelStyle={{ color: '#121212', fontWeight: 'bold' }}
          >
            Iniciar Sesión o Registrarse
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header Card (Avatar & Name) */}
          <Card style={[styles.headerCard, { backgroundColor: theme.colors.surface }]} elevation={2}>
            <Card.Content style={styles.headerContent}>
              <Avatar.Text
                size={80}
                label={userName.split(' ').map(n => n[0]).join('')}
                style={{ backgroundColor: theme.colors.primary }}
                labelStyle={{ color: '#121212', fontWeight: 'bold' }}
              />
              <Text variant="headlineSmall" style={[styles.name, { color: theme.colors.secondary }]}>
                {userName}
              </Text>
              <Text variant="bodyMedium" style={styles.email}>
                {userEmail}
              </Text>
              <BadgeContainer roleName="Cliente VIP" theme={theme} />
            </Card.Content>
          </Card>

          {/* Preferences Section */}
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
            <Card.Content>
              <View style={styles.sectionHeader}>
                <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.secondary }}>
                  Preferencias de Estilo 💈
                </Text>
                <Button
                  mode="text"
                  compact
                  onPress={isEditing ? handleSave : () => setIsEditing(true)}
                  textColor={theme.colors.primary}
                >
                  {isEditing ? 'Guardar' : 'Editar'}
                </Button>
              </View>

              <Text variant="bodySmall" style={styles.prefHelp}>
                Esto le ayudará a tu barbero a saber exactamente cómo te gusta tu corte y barba en cada visita.
              </Text>

              {isEditing ? (
                <TextInput
                  value={preferences}
                  onChangeText={setPreferences}
                  mode="outlined"
                  multiline
                  numberOfLines={4}
                  style={styles.prefInput}
                  placeholder="Ej: Degradado bajo, marcar con navaja..."
                />
              ) : (
                <View style={[styles.prefBox, { backgroundColor: theme.colors.surfaceVariant }]}>
                  <Text variant="bodyMedium" style={{ fontStyle: 'italic', lineHeight: 20 }}>
                    "{preferences}"
                  </Text>
                </View>
              )}
            </Card.Content>
          </Card>

          {/* Account Details */}
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
            <List.Section style={{ marginVertical: 0 }}>
              <List.Subheader style={{ color: theme.colors.primary, fontWeight: 'bold' }}>DATOS PERSONALES</List.Subheader>
              <List.Item
                title="Teléfono"
                description={phone}
                left={(props) => <List.Icon {...props} icon="phone" color={theme.colors.primary} />}
              />
              <Divider style={styles.divider} />
              <List.Item
                title="Ubicación Habitual"
                description="Sede San Isidro, Lima"
                left={(props) => <List.Icon {...props} icon="map-marker" color={theme.colors.primary} />}
              />
              <Divider style={styles.divider} />
              <List.Item
                title="Historial de Cortes"
                description="3 servicios realizados"
                left={(props) => <List.Icon {...props} icon="history" color={theme.colors.primary} />}
                right={(props) => <List.Icon {...props} icon="chevron-right" />}
              />
            </List.Section>
          </Card>

          {/* Actions */}
          <View style={styles.actionsContainer}>
            <Button
              mode="contained"
              onPress={() => logout()}
              style={[styles.logoutBtn, { backgroundColor: theme.colors.error }]}
              icon="logout"
              labelStyle={{ fontWeight: 'bold' }}
            >
              Cerrar Sesión
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={2000}
        style={{ backgroundColor: '#4CAF50' }}
      >
        Preferencias guardadas exitosamente.
      </Snackbar>
    </SafeAreaView>
  );
}

// Helpers components for styling
function BadgeContainer({ roleName, theme }: { roleName: string; theme: any }) {
  return (
    <View style={[styles.badge, { backgroundColor: 'rgba(212, 175, 55, 0.15)' }]}>
      <Text style={{ color: theme.colors.primary, fontWeight: 'bold', fontSize: 12 }}>
        {roleName}
      </Text>
    </View>
  );
}

function IconButtonContainer() {
  return null;
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
    paddingVertical: 24,
  },
  name: {
    fontWeight: 'bold',
    marginTop: 12,
  },
  email: {
    opacity: 0.5,
    marginTop: 4,
    marginBottom: 12,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  prefHelp: {
    opacity: 0.5,
    marginBottom: 12,
    lineHeight: 16,
  },
  prefBox: {
    padding: 12,
    borderRadius: 8,
  },
  prefInput: {
    minHeight: 80,
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
  guestContainer: {
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  guestTitle: {
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 10,
  },
  guestDesc: {
    textAlign: 'center',
    opacity: 0.65,
    marginBottom: 24,
    lineHeight: 20,
  },
  guestBtn: {
    width: '80%',
    paddingVertical: 4,
    borderRadius: 8,
  },
});