import React, { useState } from 'react';
import { StyleSheet, View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text, useTheme, Card, HelperText, Dialog, Portal } from 'react-native-paper';
import { Link, useRouter } from 'expo-router';
import { useUserRole } from '@/context/user-role';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ForgotPasswordScreen() {
  const theme = useTheme();
  const router = useRouter();

  const { resetPassword } = useUserRole();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [visibleDialog, setVisibleDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRecover = async () => {
    if (!email) {
      setError('Por favor, ingresa tu correo electrónico.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await resetPassword(email);
      setVisibleDialog(true);
    } catch (err: any) {
      setError(err.message || 'Error al enviar enlace de recuperación.');
    } finally {
      setLoading(false);
    }
  };

  const handleDialogDismiss = () => {
    setVisibleDialog(false);
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.headerContainer}>
            <Text style={[styles.title, { color: theme.colors.secondary }]} variant="headlineMedium">
              Recuperar Acceso
            </Text>
            <Text style={styles.subtitle} variant="bodyLarge">
              Ingresa tu correo y te enviaremos las instrucciones para restablecer tu contraseña
            </Text>
          </View>

          {/* Form Card */}
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={4}>
            <Card.Content style={styles.cardContent}>
              <Text style={[styles.formLabel, { color: theme.colors.primary }]} variant="titleMedium">
                RESTABLECER CONTRASEÑA
              </Text>

              <TextInput
                label="Correo Electrónico"
                value={email}
                onChangeText={(text) => { setEmail(text); setError(''); }}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                left={<TextInput.Icon icon="email-outline" />}
                style={styles.input}
              />

              {error ? (
                <HelperText type="error" visible={!!error} style={styles.helper}>
                  {error}
                </HelperText>
              ) : null}

              <Button
                mode="contained"
                onPress={handleRecover}
                loading={loading}
                disabled={loading}
                style={[styles.recoverBtn, { backgroundColor: theme.colors.primary }]}
                labelStyle={styles.btnLabel}
              >
                Enviar Instrucciones
              </Button>
            </Card.Content>
          </Card>

          {/* Back to Login Link */}
          <View style={styles.loginContainer}>
            <Link href="/(auth)/login" asChild>
              <Button mode="text" compact labelStyle={{ color: theme.colors.primary }} icon="arrow-left">
                Volver al inicio de sesión
              </Button>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Confirmation Dialog */}
      <Portal>
        <Dialog visible={visibleDialog} onDismiss={handleDialogDismiss} style={{ backgroundColor: theme.colors.surface }}>
          <Dialog.Title style={{ color: theme.colors.primary }}>Correo Enviado</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Hemos enviado un enlace de recuperación al correo: <Text style={{ fontWeight: 'bold' }}>{email}</Text>. Revisa tu bandeja de entrada o la carpeta de spam.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleDialogDismiss} textColor={theme.colors.primary}>Entendido</Button>
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
  },
  subtitle: {
    opacity: 0.65,
    textAlign: 'center',
    paddingHorizontal: 20,
    fontSize: 14,
  },
  card: {
    width: '100%',
    borderRadius: 16,
    marginBottom: 20,
  },
  cardContent: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  formLabel: {
    textAlign: 'center',
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  helper: {
    marginBottom: 8,
  },
  recoverBtn: {
    marginTop: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  btnLabel: {
    fontWeight: 'bold',
    color: '#121212',
  },
  loginContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
});
