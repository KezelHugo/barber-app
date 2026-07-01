import { IconSymbol } from '@/components/ui/icon-symbol';
import { db } from '@/config/firebase';
import { useRouter } from 'expo-router';
import { collection, deleteDoc, doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, Dialog, FAB, HelperText, IconButton, Portal, Snackbar, Text, TextInput, useTheme, Searchbar, Menu } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

interface CatalogService {
  id: string;
  name: string;
  price: number;
  promoPrice?: number;
  duration: number; // en minutos
  category: 'promocion' | 'cortes' | 'barba' | 'faciales';
  description: string;
  imageUrl?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  promocion: 'Promoción',
  cortes: 'Cortes',
  barba: 'Barba',
  faciales: 'Faciales'
};

export default function AdminCatalogScreen() {
  const theme = useTheme();
  const router = useRouter();

  // Firestore catalog state
  const [services, setServices] = useState<CatalogService[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);

  // Combined filter logic
  const filteredServices = services.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Modal control states
  const [formVisible, setFormVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [selectedService, setSelectedService] = useState<CatalogService | null>(null);

  // Form input states
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'promocion' | 'cortes' | 'barba' | 'faciales'>('cortes');
  const [price, setPrice] = useState('');
  const [promoPrice, setPromoPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const [error, setError] = useState('');
  const [loadingSave, setLoadingSave] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');

  // Suscribirse a los cambios en Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'services'), (snapshot) => {
      const servicesList: CatalogService[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        servicesList.push({
          id: doc.id,
          name: data.name || '',
          price: Number(data.price) || 0,
          promoPrice: data.promoPrice !== undefined ? Number(data.promoPrice) : undefined,
          duration: Number(data.duration) || 0,
          category: data.category || 'cortes',
          description: data.description || '',
          imageUrl: data.imageUrl || '',
        });
      });
      setServices(servicesList);
      setLoading(false);
    }, (err) => {
      console.error("Error al suscribirse a servicios:", err);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const openAddForm = () => {
    setSelectedService(null);
    setName('');
    setCategory('cortes');
    setPrice('');
    setPromoPrice('');
    setDuration('30');
    setDescription('');
    setImageUrl('');
    setError('');
    setFormVisible(true);
  };

  const openEditForm = (service: CatalogService) => {
    setSelectedService(service);
    setName(service.name);
    setCategory(service.category);
    setPrice(service.price.toString());
    setPromoPrice(service.promoPrice !== undefined ? service.promoPrice.toString() : '');
    setDuration(service.duration.toString());
    setDescription(service.description);
    setImageUrl(service.imageUrl || '');
    setError('');
    setFormVisible(true);
  };

  const openDeleteConfirm = (service: CatalogService) => {
    setSelectedService(service);
    setDeleteVisible(true);
  };

  const handleSave = async () => {
    if (!name || !price || !duration) {
      setError('Por favor, completa los campos requeridos (Nombre, Precio, Duración).');
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('El precio debe ser un número válido mayor que 0.');
      return;
    }

    const durationNum = parseInt(duration, 10);
    if (isNaN(durationNum) || durationNum <= 0) {
      setError('La duración debe ser un número entero de minutos mayor que 0.');
      return;
    }

    let promoPriceNum: number | undefined = undefined;
    if (category === 'promocion') {
      if (!promoPrice) {
        setError('Por favor, ingresa el precio promocional con descuento.');
        return;
      }
      promoPriceNum = parseFloat(promoPrice);
      if (isNaN(promoPriceNum) || promoPriceNum <= 0) {
        setError('El precio promocional debe ser un número válido mayor que 0.');
        return;
      }
      if (promoPriceNum >= priceNum) {
        setError('El precio con descuento debe ser menor al precio normal.');
        return;
      }
    }

    setLoadingSave(true);
    setError('');

    try {
      const serviceData = {
        name,
        category,
        price: priceNum,
        duration: durationNum,
        description,
        imageUrl: imageUrl.trim(),
        ...(category === 'promocion' && { promoPrice: promoPriceNum }),
      };

      if (selectedService) {
        // Editar en Firestore
        const docRef = doc(db, 'services', selectedService.id);
        await updateDoc(docRef, serviceData);
        setSnackbarMsg(`Servicio "${name}" actualizado con éxito.`);
      } else {
        // Agregar en Firestore (generando un ID auto-incremental simple o usando el id generado por firestore)
        const newDocRef = doc(collection(db, 'services'));
        await setDoc(newDocRef, {
          id: newDocRef.id,
          ...serviceData
        });
        setSnackbarMsg(`Servicio "${name}" creado con éxito.`);
      }

      setFormVisible(false);
      setSnackbarVisible(true);
    } catch (err) {
      console.error("Error al guardar en Firestore:", err);
      setError('Ocurrió un error al guardar en la base de datos.');
    } finally {
      setLoadingSave(false);
    }
  };

  const handleDelete = async () => {
    if (selectedService) {
      setLoadingDelete(true);
      try {
        await deleteDoc(doc(db, 'services', selectedService.id));
        setDeleteVisible(false);
        setSnackbarMsg(`Servicio "${selectedService.name}" eliminado.`);
        setSnackbarVisible(true);
      } catch (err) {
        console.error("Error al eliminar en Firestore:", err);
        setSnackbarMsg('Ocurrió un error al eliminar de la base de datos.');
        setSnackbarVisible(true);
      } finally {
        setLoadingDelete(false);
      }
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
          Administra los servicios, precios y duraciones reales y otros detalles.
        </Text>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="bodyMedium" style={{ marginTop: 12, opacity: 0.7 }}>Cargando catálogo...</Text>
        </View>
      ) : (
        <>
          {services.length > 0 && (
            <View style={styles.filterBar}>
              <Searchbar
                placeholder="Buscar servicio..."
                onChangeText={setSearchQuery}
                value={searchQuery}
                style={styles.searchbar}
                inputStyle={styles.searchbarInput}
                iconColor={theme.colors.outline}
                rippleColor="rgba(197, 168, 128, 0.2)"
              />
              <Menu
                visible={filterMenuVisible}
                onDismiss={() => setFilterMenuVisible(false)}
                anchor={
                  <Button
                    mode="outlined"
                    onPress={() => setFilterMenuVisible(true)}
                    style={styles.filterButton}
                    icon="filter-variant"
                    textColor={theme.colors.primary}
                    contentStyle={{ flexDirection: 'row-reverse' }}
                  >
                    {categoryFilter === 'all' ? 'Todas' : CATEGORY_LABELS[categoryFilter]}
                  </Button>
                }
              >
                <Menu.Item onPress={() => { setCategoryFilter('all'); setFilterMenuVisible(false); }} title="Todas" />
                <Menu.Item onPress={() => { setCategoryFilter('promocion'); setFilterMenuVisible(false); }} title="Promociones" />
                <Menu.Item onPress={() => { setCategoryFilter('cortes'); setFilterMenuVisible(false); }} title="Cortes" />
                <Menu.Item onPress={() => { setCategoryFilter('barba'); setFilterMenuVisible(false); }} title="Barba" />
                <Menu.Item onPress={() => { setCategoryFilter('faciales'); setFilterMenuVisible(false); }} title="Faciales" />
              </Menu>
            </View>
          )}

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {services.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text variant="bodyLarge" style={{ opacity: 0.5, textAlign: 'center' }}>
                  No hay servicios registrados en el catálogo.
                </Text>
              </View>
            ) : filteredServices.length === 0 ? (
              <View style={styles.emptyContainer}>
                <IconSymbol size={48} name="magnifyingglass" color={theme.colors.outline} style={{ marginBottom: 12 }} />
                <Text variant="bodyLarge" style={{ opacity: 0.5, textAlign: 'center' }}>
                  No se encontraron servicios con los filtros aplicados.
                </Text>
              </View>
            ) : (
              <View style={styles.listContainer}>
                {filteredServices.map((item) => (
                <Card key={item.id} style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={2}>
                  <Card.Content style={styles.cardContent}>
                    <View style={styles.cardInfo}>
                      <View style={styles.nameRow}>
                        <Text variant="titleMedium" style={[styles.serviceName, { color: theme.colors.secondary }]}>
                          {item.name}
                        </Text>
                        <Text variant="bodyMedium" style={styles.serviceCategory}>
                          {CATEGORY_LABELS[item.category] || item.category}
                        </Text>
                      </View>
                      <Text variant="bodySmall" style={styles.serviceDesc}>
                        {item.description || 'Sin descripción'}
                      </Text>
                      <View style={styles.metaRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <IconSymbol size={16} name="clock" color={theme.colors.outline} style={{ marginRight: 6 }} />
                          <Text variant="bodyMedium" style={styles.metaLabel}>{item.duration} min</Text>
                        </View>
                        <Text variant="titleMedium" style={[styles.priceText, { color: theme.colors.primary }]}>
                          {item.category === 'promocion' && item.promoPrice !== undefined ? (
                            <>
                              S/. {item.promoPrice} <Text style={styles.oldPrice}>S/. {item.price}</Text>
                            </>
                          ) : (
                            `S/. ${item.price}`
                          )}
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
          )}
        </ScrollView>
        </>
      )}

      {/* Floating Action Button for adding service */}
      <FAB
        icon="plus"
        label="Nuevo Servicio"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color="#121212"
        onPress={openAddForm}
        disabled={loading}
      />

      {/* Add/Edit Dialog Form */}
      <Portal>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'center' }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <Dialog
            visible={formVisible}
            onDismiss={() => !loadingSave && setFormVisible(false)}
            style={{ backgroundColor: theme.colors.surface, borderRadius: 4, marginHorizontal: 20 }}
          >
            <Dialog.Title style={{ color: theme.colors.primary }}>
              {selectedService ? 'Editar Servicio' : 'Nuevo Servicio'}
            </Dialog.Title>
            <Dialog.Content style={{ paddingBottom: 0 }}>
              <ScrollView style={{ maxHeight: 350 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={true}>
                <TextInput
                  label="Nombre del Servicio *"
                  value={name}
                  onChangeText={setName}
                  mode="outlined"
                  style={styles.input}
                  disabled={loadingSave}
                />

                {/* Categoría Selector Segmentado */}
                <Text variant="labelLarge" style={{ marginBottom: 6, color: theme.colors.outline }}>Categoría *</Text>
                <View style={styles.categoryButtonGroup}>
                  {(['promocion', 'cortes', 'barba', 'faciales'] as const).map((cat) => {
                    const isSelected = category === cat;
                    return (
                      <Button
                        key={cat}
                        mode={isSelected ? 'contained' : 'outlined'}
                        onPress={() => {
                          setCategory(cat);
                          if (cat !== 'promocion') {
                            setPromoPrice('');
                          }
                        }}
                        compact
                        style={[
                          styles.categoryBtn,
                          isSelected && { backgroundColor: theme.colors.primary }
                        ]}
                        labelStyle={[
                          styles.categoryBtnLabel,
                          { color: isSelected ? '#121212' : theme.colors.primary }
                        ]}
                        disabled={loadingSave}
                      >
                        {CATEGORY_LABELS[cat]}
                      </Button>
                    );
                  })}
                </View>

                <TextInput
                  label={category === 'promocion' ? "Precio Normal (S/.) *" : "Precio (S/.) *"}
                  value={price}
                  onChangeText={setPrice}
                  mode="outlined"
                  keyboardType="numeric"
                  style={styles.input}
                  disabled={loadingSave}
                />

                {category === 'promocion' && (
                  <TextInput
                    label="Precio de Descuento (S/.) *"
                    value={promoPrice}
                    onChangeText={setPromoPrice}
                    mode="outlined"
                    keyboardType="numeric"
                    style={styles.input}
                    disabled={loadingSave}
                  />
                )}

                <TextInput
                  label="Duración (minutos) *"
                  value={duration}
                  onChangeText={setDuration}
                  mode="outlined"
                  keyboardType="numeric"
                  style={styles.input}
                  placeholder="Ej. 15, 30, 45, 60"
                  disabled={loadingSave}
                />

                <TextInput
                  label="Descripción corta"
                  value={description}
                  onChangeText={setDescription}
                  mode="outlined"
                  multiline
                  numberOfLines={2}
                  style={styles.input}
                  disabled={loadingSave}
                />

                <TextInput
                  label="URL de la Imagen"
                  value={imageUrl}
                  onChangeText={setImageUrl}
                  mode="outlined"
                  style={styles.input}
                  placeholder="https://ejemplo.com/imagen.png"
                  disabled={loadingSave}
                />

                {error ? (
                  <HelperText type="error" visible={!!error}>
                    {error}
                  </HelperText>
                ) : null}
              </ScrollView>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setFormVisible(false)} textColor={theme.colors.outline} disabled={loadingSave}>
                Cancelar
              </Button>
              <Button
                onPress={handleSave}
                textColor={theme.colors.primary}
                labelStyle={{ fontWeight: 'bold' }}
                disabled={loadingSave}
                loading={loadingSave}
              >
                {loadingSave ? 'Guardando...' : 'Guardar'}
              </Button>
            </Dialog.Actions>
          </Dialog>
        </KeyboardAvoidingView>
      </Portal>

      {/* Delete Confirmation Dialog */}
      <Portal>
        <Dialog
          visible={deleteVisible}
          onDismiss={() => !loadingDelete && setDeleteVisible(false)}
          style={{ backgroundColor: theme.colors.surface, borderRadius: 4 }}
        >
          <Dialog.Title style={{ color: theme.colors.error }}>¿Eliminar servicio?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              ¿Estás seguro de que deseas eliminar permanentemente el servicio <Text style={{ fontWeight: 'bold' }}>"{selectedService?.name}"</Text> del catálogo?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteVisible(false)} textColor={theme.colors.outline} disabled={loadingDelete}>
              Cancelar
            </Button>
            <Button
              onPress={handleDelete}
              textColor={theme.colors.error}
              labelStyle={{ fontWeight: 'bold' }}
              disabled={loadingDelete}
              loading={loadingDelete}
            >
              {loadingDelete ? 'Eliminando...' : 'Sí, eliminar'}
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
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 110, // Espacio para el FAB
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
    fontSize: 11,
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
  oldPrice: {
    fontSize: 11,
    textDecorationLine: 'line-through',
    opacity: 0.5,
    fontWeight: 'normal',
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
    marginBottom: 12,
  },
  categoryButtonGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
    marginTop: 4,
  },
  categoryBtn: {
    borderRadius: 6,
    margin: 0,
    flexGrow: 1,
    minWidth: '45%',
  },
  categoryBtnLabel: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 8,
  },
  searchbar: {
    flex: 1,
    height: 44,
    backgroundColor: 'rgba(150, 150, 150, 0.05)',
    borderRadius: 8,
  },
  searchbarInput: {
    minHeight: 0,
    fontSize: 14,
    alignSelf: 'center',
    paddingBottom: 4,
  },
  filterButton: {
    height: 44,
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.2)',
  },
});