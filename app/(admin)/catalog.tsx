import React, { useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, Card, Button, IconButton, FAB, Portal, Dialog, TextInput, HelperText, Snackbar, useTheme } from 'react-native-paper';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

interface CatalogService {
  id: string;
  name: string;
  price: number;
  duration: string;
  category: string;
  description: string;
}

export default function AdminCatalogScreen() {
  const theme = useTheme();
  const router = useRouter();

  // Mock catalog state
  const [services, setServices] = useState<CatalogService[]>([
    { id: '1', name: 'Corte de Cabello Signature', price: 45, duration: '35 min', category: 'Corte', description: 'Lavado premium, corte y pomada.' },
    { id: '2', name: 'Perfilado de Barba Imperial', price: 30, duration: '20 min', category: 'Barba', description: 'Afeitado tradicional con navaja y toalla caliente.' },
    { id: '3', name: 'Combo Corte & Barba VIP', price: 65, duration: '50 min', category: 'Combo', description: 'Corte premium y diseño de barba completo.' },
    { id: '4', name: 'Tratamiento Facial Exfoliante', price: 25, duration: '20 min', category: 'Facial', description: 'Mascarilla purificante e hidratación.' },
  ]);

  // Modal control states
  const [formVisible, setFormVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [selectedService, setSelectedService] = useState<CatalogService | null>(null);

  // Form input states
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');

  const openAddForm = () => {
    setSelectedService(null);
    setName('');
    setCategory('Corte');
    setPrice('');
    setDuration('30 min');
    setDescription('');
    setError('');
    setFormVisible(true);
  };

  const openEditForm = (service: CatalogService) => {
    setSelectedService(service);
    setName(service.name);
    setCategory(service.category);
    setPrice(service.price.toString());
    setDuration(service.duration);
    setDescription(service.description);
    setError('');
    setFormVisible(true);
  };

  const openDeleteConfirm = (service: CatalogService) => {
    setSelectedService(service);
    setDeleteVisible(true);
  };

  const handleSave = () => {
    if (!name || !price || !duration) {
      setError('Por favor, completa los campos requeridos (Nombre, Precio, Duración).');
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum)) {
      setError('El precio debe ser un número válido.');
      return;
    }

    if (selectedService) {
      // Edit mode
      setServices(prev =>
        prev.map(s => 
          s.id === selectedService.id 
            ? { ...s, name, category, price: priceNum, duration, description } 
            : s
        )
      );
      setSnackbarMsg(`Servicio "${name}" actualizado con éxito.`);
    } else {
      // Add mode
      const newId = (services.length + 1).toString();
      setServices(prev => [
        ...prev,
        { id: newId, name, category, price: priceNum, duration, description }
      ]);
      setSnackbarMsg(`Servicio "${name}" creado con éxito.`);
    }

    setFormVisible(false);
    setSnackbarVisible(true);
  };

  const handleDelete = () => {
    if (selectedService) {
      setServices(prev => prev.filter(s => s.id !== selectedService.id));
      setDeleteVisible(false);
      setSnackbarMsg(`Servicio "${selectedService.name}" eliminado.`);
      setSnackbarVisible(true);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text variant="headlineSmall" style={[styles.headerTitle, { color: theme.colors.secondary, marginRight: 8 }]}>
            Gestión Catálogo
          </Text>
          <IconSymbol size={22} name="scissors" color={theme.colors.primary} />
        </View>
        <Text variant="bodySmall" style={styles.headerSubtitle}>
          Administra los servicios, precios y duraciones
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Listing cards */}
        <View style={styles.listContainer}>
          {services.map((item) => (
            <Card key={item.id} style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={2}>
              <Card.Content style={styles.cardContent}>
                <View style={styles.cardInfo}>
                  <View style={styles.nameRow}>
                    <Text variant="titleMedium" style={[styles.serviceName, { color: theme.colors.secondary }]}>
                      {item.name}
                    </Text>
                    <Text variant="bodyMedium" style={styles.serviceCategory}>
                      {item.category}
                    </Text>
                  </View>
                  <Text variant="bodySmall" style={styles.serviceDesc}>
                    {item.description}
                  </Text>
                  <View style={styles.metaRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <IconSymbol size={16} name="clock" color={theme.colors.outline} style={{ marginRight: 6 }} />
                      <Text variant="bodyMedium" style={styles.metaLabel}>{item.duration}</Text>
                    </View>
                    <Text variant="titleMedium" style={[styles.priceText, { color: theme.colors.primary }]}>
                      S/. {item.price}
                    </Text>
                  </View>
                </View>

                {/* Edit / Delete actions */}
                <View style={styles.actionColumn}>
                  <IconButton 
                    icon="pencil-outline" 
                    size={20} 
                    iconColor={theme.colors.primary} 
                    onPress={() => openEditForm(item)} 
                    style={styles.actionIconBtn}
                  />
                  <IconButton 
                    icon="trash-can-outline" 
                    size={20} 
                    iconColor={theme.colors.error} 
                    onPress={() => openDeleteConfirm(item)} 
                    style={styles.actionIconBtn}
                  />
                </View>
              </Card.Content>
            </Card>
          ))}
        </View>
      </ScrollView>

      {/* Floating Action Button for adding service */}
      <FAB
        icon="plus"
        label="Nuevo Servicio"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color="#121212"
        onPress={openAddForm}
      />

      {/* Add/Edit Dialog Form */}
      <Portal>
        <Dialog visible={formVisible} onDismiss={() => setFormVisible(false)} style={{ backgroundColor: theme.colors.surface }}>
          <Dialog.Title style={{ color: theme.colors.primary }}>
            {selectedService ? 'Editar Servicio' : 'Nuevo Servicio'}
          </Dialog.Title>
          <Dialog.Content>
            <ScrollView style={{ maxHeight: 300 }}>
              <TextInput
                label="Nombre del Servicio *"
                value={name}
                onChangeText={setName}
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="Categoría (Corte, Barba, Facial, Combo)"
                value={category}
                onChangeText={setCategory}
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="Precio (S/.) *"
                value={price}
                onChangeText={setPrice}
                mode="outlined"
                keyboardType="numeric"
                style={styles.input}
              />
              <TextInput
                label="Duración *"
                value={duration}
                onChangeText={setDuration}
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="Descripción corta"
                value={description}
                onChangeText={setDescription}
                mode="outlined"
                multiline
                numberOfLines={2}
                style={styles.input}
              />

              {error ? (
                <HelperText type="error" visible={!!error}>
                  {error}
                </HelperText>
              ) : null}
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setFormVisible(false)} textColor={theme.colors.outline}>
              Cancelar
            </Button>
            <Button onPress={handleSave} textColor={theme.colors.primary} labelStyle={{ fontWeight: 'bold' }}>
              Guardar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Delete Confirmation Dialog */}
      <Portal>
        <Dialog visible={deleteVisible} onDismiss={() => setDeleteVisible(false)} style={{ backgroundColor: theme.colors.surface }}>
          <Dialog.Title style={{ color: theme.colors.error }}>¿Eliminar servicio?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              ¿Estás seguro de que deseas eliminar permanentemente el servicio <Text style={{ fontWeight: 'bold' }}>"{selectedService?.name}"</Text> del catálogo?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteVisible(false)} textColor={theme.colors.outline}>
              Cancelar
            </Button>
            <Button onPress={handleDelete} textColor={theme.colors.error} labelStyle={{ fontWeight: 'bold' }}>
              Sí, eliminar
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
  header: {
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
    paddingTop: 16,
    paddingBottom: 110, // Spacer for FAB
  },
  listContainer: {
    gap: 12,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.1)',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  cardInfo: {
    flex: 1,
    paddingRight: 8,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  serviceName: {
    fontWeight: 'bold',
    flex: 1,
  },
  serviceCategory: {
    opacity: 0.5,
    fontSize: 12,
    fontWeight: 'bold',
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  serviceDesc: {
    opacity: 0.6,
    fontSize: 12,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    opacity: 0.5,
    fontSize: 12,
  },
  priceText: {
    fontWeight: 'bold',
  },
  actionColumn: {
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(150, 150, 150, 0.1)',
    paddingLeft: 8,
  },
  actionIconBtn: {
    margin: 0,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    borderRadius: 12,
  },
  input: {
    marginBottom: 10,
  },
});