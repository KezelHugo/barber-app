import { useUserRole } from '@/context/user-role';
import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Divider, HelperText, Text, TextInput, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

// Control flag to show/hide quick role bypass panel (true for Demo APK, false for Official APK)
const SHOW_DEV_BYPASS = true;

export default function LoginScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { signIn, loginAsGuest } = useUserRole();
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Por favor, ingresa tu correo y contraseña.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await signIn(email, password);
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  const handleDevBypass = async (devEmail: string, devPass: string) => {
    setLoading(true);
    setError('');
    try {
      await signIn(devEmail, devPass);
    } catch (err: any) {
      setError(`Prueba fallida. Asegúrate de registrar en Firebase: ${devEmail} / ${devPass}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Logo / Header Premium */}
          <View style={styles.headerContainer}>
            <View style={[styles.logoOutline, { borderColor: theme.colors.primary }]}>
              <Text style={[styles.logoText, { color: theme.colors.primary }]} variant="headlineLarge">
                B
              </Text>
            </View>
            <Text style={[styles.title, { color: theme.colors.secondary }]} variant="headlineMedium">
              BarberApp
            </Text>
            <Text style={styles.subtitle} variant="bodyLarge">
              Cortes finos y servicio de caballeros excepcional
            </Text>
          </View>

          {/* Form Card */}
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={4}>
            <Card.Content style={styles.cardContent}>
              <Text style={[styles.loginLabel, { color: theme.colors.primary }]} variant="titleMedium">
                INICIAR SESIÓN
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

              <TextInput
                label="Contraseña"
                value={password}
                onChangeText={(text) => { setPassword(text); setError(''); }}
                mode="outlined"
                secureTextEntry={!showPassword}
                left={<TextInput.Icon icon="lock-outline" />}
                right={
                  <TextInput.Icon
                    icon={showPassword ? "eye-off-outline" : "eye-outline"}
                    onPress={() => setShowPassword(!showPassword)}
                  />
                }
                style={styles.input}
              />

              {error ? (
                <HelperText type="error" visible={!!error} style={styles.helper}>
                  {error}
                </HelperText>
              ) : null}

              <Button
                mode="contained"
                onPress={handleLogin}
                loading={loading}
                disabled={loading}
                style={[styles.loginBtn, { backgroundColor: theme.colors.primary }]}
                labelStyle={styles.btnLabel}
              >
                Ingresar
              </Button>

              <View style={styles.forgotContainer}>
                <Link href={"/(auth)/forgot-password" as any} asChild>
                  <Button mode="text" compact labelStyle={{ color: theme.colors.primary }}>
                    ¿Olvidaste tu contraseña?
                  </Button>
                </Link>
              </View>
            </Card.Content>
          </Card>

          {/* Guest Mode Entry */}
          <Button
            mode="outlined"
            onPress={loginAsGuest}
            style={[styles.guestBtn, { borderColor: theme.colors.primary }]}
            textColor={theme.colors.primary}
          >
            Explorar como Invitado (Sin cuenta)
          </Button>

          <View style={styles.registerContainer}>
            <Text variant="bodyMedium">¿No tienes una cuenta?</Text>
            <Link href="/(auth)/register" asChild>
              <Button mode="text" compact labelStyle={{ color: theme.colors.primary }}>
                Regístrate aquí
              </Button>
            </Link>
          </View>

          {/* Developer Bypass Panel */}
          {SHOW_DEV_BYPASS && (
            <View style={styles.devPanel}>
              <Divider style={styles.divider} />
              <Text style={styles.devTitle} variant="labelMedium">
                ACCESO DE DESARROLLO (MODO DE PRUEBA)
              </Text>
              <View style={styles.devButtons}>
                <Button
                  mode="contained-tonal"
                  onPress={() => handleDevBypass('cliente@barberapp.com', 'password123')}
                  disabled={loading}
                  style={styles.devBtn}
                  compact
                >
                  Cliente
                </Button>
                <Button
                  mode="contained-tonal"
                  onPress={() => handleDevBypass('miguel.rojas@barberapp.com', '70123456')}
                  disabled={loading}
                  style={styles.devBtn}
                  compact
                >
                  Barbero
                </Button>
                <Button
                  mode="contained-tonal"
                  onPress={() => handleDevBypass('admin@barberapp.com', 'password123')}
                  disabled={loading}
                  style={styles.devBtn}
                  compact
                >
                  Admin
                </Button>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
    marginBottom: 28,
  },
  logoOutline: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontWeight: 'bold',
    fontStyle: 'italic',
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
  loginLabel: {
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
  loginBtn: {
    marginTop: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  btnLabel: {
    fontWeight: 'bold',
    color: '#121212', // Dark contrast for gold button
  },
  forgotContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  guestBtn: {
    width: '100%',
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1.5,
  },
  registerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  devPanel: {
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
  },
  divider: {
    width: '100%',
    marginBottom: 16,
    opacity: 0.3,
  },
  devTitle: {
    opacity: 0.5,
    letterSpacing: 1,
    marginBottom: 10,
    fontWeight: 'bold',
  },
  devButtons: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  devBtn: {
    borderRadius: 6,
  },
});