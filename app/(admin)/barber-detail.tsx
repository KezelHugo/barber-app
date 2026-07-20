import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { Avatar, Card, Divider, IconButton, List, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AdminBarberDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();

  // Extract barber details passed from query params
  const { id, name, phone, email, dni, description, imageUrl, isActive } = params as {
    id: string;
    name: string;
    phone: string;
    email: string;
    dni: string;
    description: string;
    imageUrl?: string;
    isActive?: string;
  };

  const initials = name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '??';

  const handleCall = () => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const handleEmail = () => {
    if (email) {
      Linking.openURL(`mailto:${email}`);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <IconButton icon="arrow-left" size={24} onPress={() => router.push('/(admin)/barbers')} style={{ marginLeft: -12, marginRight: 4 }} />
          <Text variant="headlineSmall" style={[styles.headerTitle, { color: theme.colors.secondary }]}>
            Detalle del Barbero
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileHeader}>
          <View style={[styles.avatarBorderContainer, { borderColor: theme.colors.primary }]}>
            {imageUrl ? (
              <Avatar.Image
                size={100}
                source={{ uri: imageUrl }}
                style={styles.avatar}
              />
            ) : (
              <Avatar.Text
                size={100}
                label={initials}
                style={[styles.avatar, { backgroundColor: theme.colors.primary }]}
                labelStyle={{ color: '#121212', fontWeight: 'bold', fontSize: 32 }}
              />
            )}
          </View>
          <Text variant="headlineMedium" style={[styles.barberName, { color: theme.colors.secondary }]}>
            {name}
          </Text>
          <Text variant="bodyLarge" style={[styles.roleText, { color: isActive === 'false' ? theme.colors.error : theme.colors.outline }]}>
            Personal de Barbería {isActive === 'false' ? '• Acceso Inactivo' : '• Acceso Activo'}
          </Text>
        </View>

        {/* Data Cards */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={2}>
          <Card.Content style={{ padding: 8 }}>
            <List.Section style={{ marginVertical: 0 }}>
              <List.Item
                title="DNI / Documento"
                description={dni || 'No registrado'}
                left={(props) => <List.Icon {...props} icon="card-account-details-outline" color={theme.colors.primary} />}
              />
              <Divider style={styles.divider} />

              <List.Item
                title="Teléfono de Contacto"
                description={phone || 'No registrado'}
                left={(props) => <List.Icon {...props} icon="phone-outline" color={theme.colors.primary} />}
                right={(props) => phone ? (
                  <IconButton
                    icon="phone"
                    iconColor={theme.colors.primary}
                    size={20}
                    onPress={handleCall}
                  />
                ) : null}
              />
              <Divider style={styles.divider} />

              <List.Item
                title="Correo Electrónico"
                description={email || 'No registrado'}
                left={(props) => <List.Icon {...props} icon="email-outline" color={theme.colors.primary} />}
                right={(props) => email ? (
                  <IconButton
                    icon="email"
                    iconColor={theme.colors.primary}
                    size={20}
                    onPress={handleEmail}
                  />
                ) : null}
              />
            </List.Section>
          </Card.Content>
        </Card>

        {/* Description Section */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface, marginTop: 16 }]} elevation={2}>
          <Card.Title
            title="Presentación y Habilidades"
            titleStyle={{ color: theme.colors.primary, fontWeight: 'bold', fontSize: 16 }}
            left={(props) => <List.Icon {...props} icon="account-details-outline" color={theme.colors.primary} />}
          />
          <Card.Content>
            <Text variant="bodyMedium" style={{ lineHeight: 22, opacity: 0.8 }}>
              {description || 'Sin descripción detallada.'}
            </Text>
          </Card.Content>
        </Card>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.1)',
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarBorderContainer: {
    width: 110,
    height: 110,
    borderWidth: 2,
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    margin: 0,
  },
  barberName: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  roleText: {
    fontWeight: '500',
    marginTop: 4,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.1)',
  },
  divider: {
    opacity: 0.15,
  },
  backBtn: {
    marginTop: 32,
    borderRadius: 8,
  },
});
