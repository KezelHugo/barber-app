import { useUserRole } from '@/context/user-role';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Avatar, Button, Card, Divider, List, Text, useTheme, Portal, Dialog, TextInput, HelperText, Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth } from '@/config/firebase';
import { updatePassword } from 'firebase/auth';

export default function AdminProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { userName, userEmail, logout } = useUserRole();

  // Password changing states
  const [passwordDialogVisible, setPasswordDialogVisible] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');

  const handleUpdatePassword = async () => {
    if (!newPassword.trim()) {
      setPasswordError('Por favor, ingresa una nueva contraseña.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden.');
      return;
    }

    setLoadingPassword(true);
    setPasswordError('');

    try {
      const user = auth.currentUser;
      if (user) {
        await updatePassword(user, newPassword.trim());
        setPasswordDialogVisible(false);
        setNewPassword('');
        setConfirmPassword('');
        setSnackbarMsg('Contraseña actualizada con éxito.');
        setSnackbarVisible(true);
      } else {
        setPasswordError('No se encontró una sesión de usuario activa.');
      }
    } catch (err: any) {
      console.error("Error al actualizar contraseña:", err);
      if (err.code === 'auth/requires-recent-login') {
        setPasswordError('Por seguridad, debes cerrar sesión e iniciar sesión de nuevo antes de cambiar tu contraseña.');
      } else {
        setPasswordError('Error al actualizar la contraseña. Reinténtalo.');
      }
    } finally {
      setLoadingPassword(false);
    }
  };

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
                ADMINISTRADOR
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
              description="Ver y editar personal de la barbería"
              left={(props) => <List.Icon {...props} icon="account-group" color={theme.colors.primary} />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => router.push('/(admin)/barbers')}
            />
            <Divider style={styles.divider} />

            <List.Item
              title="Gestionar Administradores"
              description="Ver y editar administradores del sistema"
              left={(props) => <List.Icon {...props} icon="shield-account-outline" color={theme.colors.primary} />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => router.push('/(admin)/admins')}
            />
            <Divider style={styles.divider} />

            <List.Item
              title="Gestionar Clientes"
              description="Ver y editar clientes registrados"
              left={(props) => <List.Icon {...props} icon="account-multiple-outline" color={theme.colors.primary} />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => router.push('/(admin)/customers')}
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
            mode="outlined"
            onPress={() => setPasswordDialogVisible(true)}
            style={{ borderColor: theme.colors.primary, marginBottom: 12, borderRadius: 8 }}
            icon="lock-reset"
            labelStyle={{ color: theme.colors.primary, fontWeight: 'bold' }}
          >
            Cambiar Contraseña
          </Button>

          <Button
            mode="outlined"
            onPress={logout}
            style={{ borderColor: theme.colors.primary, borderRadius: 8 }}
            icon="logout"
            labelStyle={{ color: theme.colors.primary, fontWeight: 'bold' }}
          >
            Cerrar Sesión
          </Button>
        </View>

      </ScrollView>

      {/* Change Password Dialog */}
      <Portal>
        <Dialog
          visible={passwordDialogVisible}
          onDismiss={() => !loadingPassword && setPasswordDialogVisible(false)}
          style={{ backgroundColor: theme.colors.surface, borderRadius: 4 }}
        >
          <Dialog.Title style={{ color: theme.colors.primary }}>Cambiar Contraseña</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Nueva Contraseña"
              value={newPassword}
              onChangeText={setNewPassword}
              mode="outlined"
              secureTextEntry
              disabled={loadingPassword}
              style={{ marginBottom: 12 }}
            />
            <TextInput
              label="Confirmar Contraseña"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              mode="outlined"
              secureTextEntry
              disabled={loadingPassword}
              style={{ marginBottom: 8 }}
            />
            {passwordError ? (
              <HelperText type="error" visible={!!passwordError}>
                {passwordError}
              </HelperText>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPasswordDialogVisible(false)} textColor={theme.colors.outline} disabled={loadingPassword}>
              Cancelar
            </Button>
            <Button
              onPress={handleUpdatePassword}
              textColor={theme.colors.primary}
              labelStyle={{ fontWeight: 'bold' }}
              loading={loadingPassword}
              disabled={loadingPassword}
            >
              Actualizar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={{ backgroundColor: theme.colors.secondary }}
      >
        <Text style={{ color: theme.colors.background, fontWeight: 'bold' }}>
          {snackbarMsg}
        </Text>
      </Snackbar>
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