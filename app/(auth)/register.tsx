import React, { useState } from 'react';
import { StyleSheet, View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text, useTheme, Card, HelperText, Snackbar } from 'react-native-paper';
import { Link, useRouter } from 'expo-router';
import { useUserRole } from '@/context/user-role';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RegisterScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { signUp } = useUserRole();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [error, setError] = useState('');
  const [visibleSnackbar, setVisibleSnackbar] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !phone || !password) {
      setError('Por favor, completa todos los campos.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await signUp(name, email, phone, password);
      setVisibleSnackbar(true);
    } catch (err: any) {
      setError(err.message || 'Error al registrar usuario.');
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
          {/* Header */}
          <View style={styles.headerContainer}>
            <Text style={[styles.title, { color: theme.colors.secondary }]} variant="headlineMedium">
              Regístrate
            </Text>
            <Text style={styles.subtitle} variant="bodyLarge">
              Únete a BarberApp y agenda tus citas al instante
            </Text>
          </View>

          {/* Card Form */}
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={4}>
            <Card.Content style={styles.cardContent}>
              <Text style={[styles.formLabel, { color: theme.colors.primary }]} variant="titleMedium">
                NUEVA CUENTA
              </Text>

              <TextInput
                label="Nombre Completo"
                value={name}
                onChangeText={(text) => { setName(text); setError(''); }}
                mode="outlined"
                left={<TextInput.Icon icon="account-outline" />}
                style={styles.input}
              />

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
                label="Teléfono / Celular"
                value={phone}
                onChangeText={(text) => { setPhone(text); setError(''); }}
                mode="outlined"
                keyboardType="phone-pad"
                left={<TextInput.Icon icon="phone-outline" />}
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
                onPress={handleRegister}
                loading={loading}
                disabled={loading}
                style={[styles.registerBtn, { backgroundColor: theme.colors.primary }]}
                labelStyle={styles.btnLabel}
              >
                Registrarme
              </Button>
            </Card.Content>
          </Card>

          {/* Back to Login Link */}
          <View style={styles.loginContainer}>
            <Text variant="bodyMedium">¿Ya tienes una cuenta?</Text>
            <Link href="/(auth)/login" asChild>
              <Button mode="text" compact labelStyle={{ color: theme.colors.primary }}>
                Inicia sesión aquí
              </Button>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Snackbar
        visible={visibleSnackbar}
        onDismiss={() => setVisibleSnackbar(false)}
        duration={1500}
        style={{ backgroundColor: '#4CAF50' }}
      >
        ¡Registro exitoso! Iniciando sesión...
      </Snackbar>
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
  registerBtn: {
    marginTop: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  btnLabel: {
    fontWeight: 'bold',
    color: '#121212',
  },
  loginContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});