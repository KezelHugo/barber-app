import { useUserRole } from '@/context/user-role';
import React, { useState, useEffect } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Avatar, Button, Card, Divider, List, Snackbar, Text, TextInput, useTheme, ActivityIndicator, Portal, Dialog, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '@/config/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';

export default function ProfileScreen() {
  const theme = useTheme();
  const { role, userName, userEmail, logout } = useUserRole();
  const isGuest = role === 'guest';

  // Personal states loaded from Firestore
  const [phone, setPhone] = useState('');
  const [preferences, setPreferences] = useState('');
  const [loading, setLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');

  // Password changing states
  const [passwordDialogVisible, setPasswordDialogVisible] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loadingPassword, setLoadingPassword] = useState(false);

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

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setPhone(data.phone || '');
          setPreferences(data.stylePreferences || '');
        }
      } catch (err) {
        console.error("Error al cargar datos del perfil:", err);
      } finally {
        setLoading(false);
      }
    };

    if (!isGuest) {
      fetchUserData();
    } else {
      setLoading(false);
    }
  }, [isGuest]);

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      setLoading(true);
      await updateDoc(doc(db, 'users', user.uid), {
        phone: phone.trim(),
        stylePreferences: preferences.trim()
      });
      setIsEditing(false);
      setSnackbarMsg('Preferencias guardadas exitosamente.');
      setSnackbarVisible(true);
    } catch (err) {
      console.error("Error al guardar preferencias de estilo:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

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
              {isEditing ? (
                <TextInput
                  label="Teléfono"
                  value={phone}
                  onChangeText={setPhone}
                  mode="outlined"
                  keyboardType="phone-pad"
                  style={{ marginHorizontal: 16, marginVertical: 8 }}
                />
              ) : (
                <List.Item
                  title="Teléfono"
                  description={phone || 'No registrado'}
                  left={(props) => <List.Icon {...props} icon="phone" color={theme.colors.primary} />}
                />
              )}
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
              onPress={() => logout()}
              style={{ borderColor: theme.colors.primary, borderRadius: 8 }}
              icon="logout"
              labelStyle={{ color: theme.colors.primary, fontWeight: 'bold' }}
            >
              Cerrar Sesión
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

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