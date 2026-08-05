import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Avatar, Button, Card, Divider, Icon, ProgressBar, Text, useTheme, Portal, Dialog, TextInput, HelperText, Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserRole } from '@/context/user-role';
import { auth } from '@/config/firebase';
import { updatePassword } from 'firebase/auth';

interface ClientReview {
  id: string;
  clientName: string;
  clientAvatar: string;
  rating: number;
  date: string;
  comment: string;
}

export default function BarberProfileScreen() {
  const theme = useTheme();
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

  // Mock list of reviews
  const reviews: ClientReview[] = [
    {
      id: '1',
      clientName: 'Kevin Guerrero',
      clientAvatar: 'KG',
      rating: 5,
      date: '02 de Junio, 2026',
      comment: '¡Excelente servicio! Carlos entiende a la perfección lo que pido y cuida mucho los detalles con la navaja.'
    },
    {
      id: '2',
      clientName: 'Eduardo Ramos',
      clientAvatar: 'ER',
      rating: 5,
      date: '28 de Mayo, 2026',
      comment: 'El degradado quedó impecable. Muy recomendado por su paciencia y profesionalismo. Volveré definitivamente.'
    },
    {
      id: '3',
      clientName: 'Jorge V.',
      clientAvatar: 'JV',
      rating: 4,
      date: '15 de Mayo, 2026',
      comment: 'Buen servicio y puntual en la atención. Las toallas calientes al afeitar son de otro nivel.'
    }
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card Header */}
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
              Barbero Master • Sede San Isidro
            </Text>
            <Text style={{ opacity: 0.5, marginTop: 4 }}>
              {userEmail}
            </Text>
          </Card.Content>
        </Card>

        {/* 1. Ratings Summary Metrics (Super Premium UI) */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={2}>
          <Card.Content>
            <Text variant="labelSmall" style={[styles.sectionTitleLabel, { color: theme.colors.primary }]}>
              RESUMEN DE CALIFICACIONES
            </Text>

            <View style={styles.ratingSummaryRow}>
              {/* Big Score */}
              <View style={styles.bigScoreBox}>
                <Text variant="displayMedium" style={{ fontWeight: 'bold', color: theme.colors.secondary }}>
                  4.9
                </Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Icon key={star} source="star" size={14} color={theme.colors.primary} />
                  ))}
                </View>
                <Text variant="bodySmall" style={{ opacity: 0.5 }}>
                  124 opiniones
                </Text>
              </View>

              {/* Progress bars split */}
              <View style={styles.breakdownBox}>
                <ReviewBarRow stars={5} progress={0.92} theme={theme} />
                <ReviewBarRow stars={4} progress={0.06} theme={theme} />
                <ReviewBarRow stars={3} progress={0.02} theme={theme} />
                <ReviewBarRow stars={2} progress={0.00} theme={theme} />
                <ReviewBarRow stars={1} progress={0.00} theme={theme} />
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* 2. Client Reviews Feed */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={2}>
          <Card.Content style={{ paddingBottom: 8 }}>
            <Text variant="labelSmall" style={[styles.sectionTitleLabel, { color: theme.colors.primary }]}>
              OPINIONES RECIENTES
            </Text>

            {reviews.map((item, index) => (
              <View key={item.id}>
                <View style={styles.reviewItem}>
                  {/* User row */}
                  <View style={styles.reviewHeader}>
                    <Avatar.Text
                      size={32}
                      label={item.clientAvatar}
                      style={{ backgroundColor: theme.colors.surfaceVariant }}
                      labelStyle={{ color: theme.colors.primary, fontWeight: 'bold', fontSize: 12 }}
                    />
                    <View style={styles.reviewUserText}>
                      <Text variant="bodyMedium" style={{ fontWeight: 'bold', color: theme.colors.secondary }}>
                        {item.clientName}
                      </Text>
                      <Text variant="bodySmall" style={{ opacity: 0.4 }}>
                        {item.date}
                      </Text>
                    </View>

                    <View style={styles.starsBadgeRow}>
                      <Icon source="star" size={12} color={theme.colors.primary} />
                      <Text variant="bodySmall" style={{ fontWeight: 'bold', color: theme.colors.secondary }}>{item.rating}</Text>
                    </View>
                  </View>

                  <Text variant="bodyMedium" style={styles.commentText}>
                    "{item.comment}"
                  </Text>
                </View>
                {index < reviews.length - 1 && <Divider style={styles.divider} />}
              </View>
            ))}
          </Card.Content>
        </Card>

        {/* Actions */}
        <View style={{ marginBottom: 20, gap: 12 }}>
          <Button
            mode="outlined"
            onPress={() => setPasswordDialogVisible(true)}
            style={{ borderColor: theme.colors.primary }}
            textColor={theme.colors.primary}
            icon="lock-reset"
            labelStyle={{ fontWeight: 'bold' }}
          >
            Cambiar Contraseña
          </Button>

          <Button
            mode="outlined"
            onPress={logout}
            style={{ borderColor: theme.colors.primary }}
            textColor={theme.colors.primary}
            icon="logout"
            labelStyle={{ fontWeight: 'bold' }}
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

// Custom subcomponent for Visual review bars
function ReviewBarRow({ stars, progress, theme }: { stars: number; progress: number; theme: any }) {
  return (
    <View style={styles.reviewBarRow}>
      <Text variant="bodySmall" style={styles.barStarLabel}>
        {stars} ★
      </Text>
      <View style={styles.progressBarContainer}>
        <ProgressBar progress={progress} color={theme.colors.primary} style={styles.barProgress} />
      </View>
      <Text variant="bodySmall" style={styles.barPercentage}>
        {Math.round(progress * 100)}%
      </Text>
    </View>
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
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.1)',
    overflow: 'hidden',
  },
  sectionTitleLabel: {
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  ratingSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bigScoreBox: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '35%',
    borderRightWidth: 1,
    borderRightColor: 'rgba(150, 150, 150, 0.15)',
    paddingRight: 10,
  },
  starsRow: {
    flexDirection: 'row',
    marginVertical: 4,
    gap: 3,
  },
  breakdownBox: {
    flex: 1,
    paddingLeft: 16,
    gap: 4,
  },
  reviewBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  barStarLabel: {
    width: 25,
    opacity: 0.6,
  },
  progressBarContainer: {
    flex: 1,
    height: 6,
    marginHorizontal: 8,
    justifyContent: 'center',
  },
  barProgress: {
    height: 6,
    borderRadius: 3,
  },
  barPercentage: {
    width: 30,
    textAlign: 'right',
    opacity: 0.6,
  },
  reviewItem: {
    paddingVertical: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewUserText: {
    marginLeft: 10,
    flex: 1,
  },
  starsBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  commentText: {
    fontStyle: 'italic',
    lineHeight: 18,
    opacity: 0.8,
  },
  divider: {
    opacity: 0.15,
  },
  actionsContainer: {
    marginTop: 8,
    marginBottom: 20,
  },
  logoutBtn: {
    borderRadius: 12,
    paddingVertical: 8,
  }
});