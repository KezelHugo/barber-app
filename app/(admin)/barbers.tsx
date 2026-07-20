import { IconSymbol } from '@/components/ui/icon-symbol';
import { db, firebaseConfig } from '@/config/firebase';
import { useRouter } from 'expo-router';
import { collection, deleteDoc, doc, onSnapshot, query, setDoc, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Avatar, Button, Card, Dialog, FAB, HelperText, IconButton, Portal, Searchbar, Snackbar, Text, TextInput, useTheme, Switch } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';

interface Barber {
  id: string;
  name: string;
  phone: string;
  email: string;
  dni: string;
  description: string;
  imageUrl?: string;
  isActive: boolean;
}

export default function AdminBarbersScreen() {
  const theme = useTheme();
  const router = useRouter();

  // Firestore barbers state
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');

  // Combined search logic (searches by name or DNI)
  const filteredBarbers = barbers.filter((item) => {
    const query = searchQuery.toLowerCase();
    const nameMatch = item.name.toLowerCase().includes(query);
    const dniMatch = item.dni.includes(query);
    return nameMatch || dniMatch;
  });

  // Modal control states
  const [formVisible, setFormVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);

  // Form input states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [dni, setDni] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [error, setError] = useState('');
  const [loadingSave, setLoadingSave] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  // Real-time validation error states
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [dniError, setDniError] = useState('');

  const hasErrors = !!nameError || !!phoneError || !!emailError || !!dniError;

  // Real-time validation for inputs
  useEffect(() => {
    if (!formVisible || loadingSave) {
      setNameError('');
      setPhoneError('');
      setEmailError('');
      setDniError('');
      return;
    }

    const isEditing = selectedBarber !== null;
    const nameLower = name.trim().toLowerCase();
    const emailLower = email.trim().toLowerCase();
    const phoneTrim = phone.trim();
    const dniTrim = dni.trim();

    // 1. Name unique check
    if (nameLower) {
      const nameDuplicate = barbers.some(b => b.name.toLowerCase() === nameLower && (!isEditing || b.id !== selectedBarber.id));
      if (nameDuplicate) {
        setNameError('Ya existe un barbero registrado con este nombre.');
      } else {
        setNameError('');
      }
    } else {
      setNameError('');
    }

    // 2. Phone validation and unique check
    if (phoneTrim) {
      if (!/^\d{9}$/.test(phoneTrim)) {
        setPhoneError('El teléfono debe tener exactamente 9 dígitos.');
      } else {
        const phoneDuplicate = barbers.some(b => b.phone === phoneTrim && (!isEditing || b.id !== selectedBarber.id));
        if (phoneDuplicate) {
          setPhoneError('Ya existe un barbero registrado con este teléfono.');
        } else {
          setPhoneError('');
        }
      }
    } else {
      setPhoneError('');
    }

    // 3. Email validation and unique check
    if (emailLower) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower)) {
        setEmailError('Por favor, ingresa un correo electrónico válido.');
      } else {
        const emailDuplicate = barbers.some(b => b.email.toLowerCase() === emailLower && (!isEditing || b.id !== selectedBarber.id));
        if (emailDuplicate) {
          setEmailError('Ya existe un barbero registrado con este correo.');
        } else {
          setEmailError('');
        }
      }
    } else {
      setEmailError('');
    }

    // 4. DNI validation and unique check
    if (dniTrim) {
      if (!/^\d{8}$/.test(dniTrim)) {
        setDniError('El DNI debe tener exactamente 8 dígitos.');
      } else {
        const dniDuplicate = barbers.some(b => b.dni === dniTrim && (!isEditing || b.id !== selectedBarber.id));
        if (dniDuplicate) {
          setDniError('Ya existe un barbero registrado con este DNI.');
        } else {
          setDniError('');
        }
      }
    } else {
      setDniError('');
    }
  }, [name, phone, email, dni, barbers, selectedBarber, formVisible, loadingSave]);

  // Snackbar states
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');

  // Listen to Firestore collection in real-time (querying 'users' where role is 'barber')
  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'barber'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const barbersList: Barber[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        barbersList.push({
          id: doc.id,
          name: data.name || '',
          phone: data.phone || '',
          email: data.email || '',
          dni: data.dni || '',
          description: data.description || '',
          imageUrl: data.imageUrl || '',
          isActive: data.isActive !== undefined ? data.isActive : true,
        });
      });
      setBarbers(barbersList);
      setLoading(false);
    }, (err) => {
      console.error("Error al suscribirse a barbers en users:", err);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const openAddForm = () => {
    setSelectedBarber(null);
    setName('');
    setPhone('');
    setEmail('');
    setDni('');
    setDescription('');
    setImageUrl('');
    setIsActive(true);
    setError('');
    setFormVisible(true);
  };

  const openEditForm = (barber: Barber) => {
    setSelectedBarber(barber);
    setName(barber.name);
    setPhone(barber.phone);
    setEmail(barber.email);
    setDni(barber.dni);
    setDescription(barber.description);
    setImageUrl(barber.imageUrl || '');
    setIsActive(barber.isActive !== undefined ? barber.isActive : true);
    setError('');
    setFormVisible(true);
  };

  const openDeleteConfirm = (barber: Barber) => {
    setSelectedBarber(barber);
    setDeleteVisible(true);
  };

  const handleSave = async () => {
    // Basic fields validation
    if (!name.trim()) {
      setError('Por favor, ingresa el nombre del barbero.');
      return;
    }
    if (!phone.trim()) {
      setError('Por favor, ingresa el teléfono.');
      return;
    }
    if (!/^\d{9}$/.test(phone.trim())) {
      setError('El teléfono debe tener exactamente 9 dígitos numéricos.');
      return;
    }
    if (!email.trim()) {
      setError('Por favor, ingresa el correo electrónico.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Por favor, ingresa un correo electrónico válido.');
      return;
    }
    if (!dni.trim()) {
      setError('Por favor, ingresa el DNI.');
      return;
    }
    if (!/^\d{8}$/.test(dni.trim())) {
      setError('El DNI debe tener exactamente 8 dígitos numéricos.');
      return;
    }
    if (!description.trim()) {
      setError('Por favor, ingresa una breve descripción o presentación.');
      return;
    }

    // Uniqueness validation (check locally in memory from active snapshot)
    const isEditing = selectedBarber !== null;
    const nameLower = name.trim().toLowerCase();
    const emailLower = email.trim().toLowerCase();
    const phoneTrim = phone.trim();
    const dniTrim = dni.trim();

    const nameDuplicate = barbers.some(b => b.name.toLowerCase() === nameLower && (!isEditing || b.id !== selectedBarber.id));
    if (nameDuplicate) {
      setError('Ya existe un barbero registrado con este nombre.');
      return;
    }

    const phoneDuplicate = barbers.some(b => b.phone === phoneTrim && (!isEditing || b.id !== selectedBarber.id));
    if (phoneDuplicate) {
      setError('Ya existe un barbero registrado con este teléfono.');
      return;
    }

    const emailDuplicate = barbers.some(b => b.email.toLowerCase() === emailLower && (!isEditing || b.id !== selectedBarber.id));
    if (emailDuplicate) {
      setError('Ya existe un barbero registrado con este correo electrónico.');
      return;
    }

    const dniDuplicate = barbers.some(b => b.dni === dniTrim && (!isEditing || b.id !== selectedBarber.id));
    if (dniDuplicate) {
      setError('Ya existe un barbero registrado con este DNI.');
      return;
    }

    setLoadingSave(true);
    setError('');

    try {
      const barberData = {
        name: name.trim(),
        phone: phoneTrim,
        email: emailLower,
        dni: dniTrim,
        description: description.trim(),
        imageUrl: imageUrl.trim(),
        role: 'barber',
        isActive
      };

      if (selectedBarber) {
        // Edit document in Firestore
        const docRef = doc(db, 'users', selectedBarber.id);
        await updateDoc(docRef, barberData);
        setSnackbarMsg(`Barbero "${name}" actualizado con éxito.`);
      } else {
        // Create user in Firebase Auth using a secondary app instance
        const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
        const secondaryAuth = getAuth(secondaryApp);
        try {
          const userCredential = await createUserWithEmailAndPassword(secondaryAuth, emailLower, dniTrim);
          const newUid = userCredential.user.uid;
          
          // Add document to Firestore using the created UID
          const newDocRef = doc(db, 'users', newUid);
          await setDoc(newDocRef, {
            id: newUid,
            ...barberData
          });
          setSnackbarMsg(`Barbero "${name}" registrado con éxito.`);
        } catch (authErr: any) {
          console.error("Error al registrar barbero en Firebase Auth:", authErr);
          if (authErr.code === 'auth/email-already-in-use') {
            setError('El correo electrónico ya está registrado en Firebase Auth.');
          } else if (authErr.code === 'auth/weak-password') {
            setError('La contraseña (DNI) debe tener al menos 6 caracteres.');
          } else {
            setError('Error al registrar las credenciales del barbero.');
          }
          setLoadingSave(false);
          return;
        } finally {
          await deleteApp(secondaryApp);
        }
      }

      setFormVisible(false);
      setSnackbarVisible(true);
    } catch (err) {
      console.error("Error al guardar barbero en Firestore:", err);
      setError('Ocurrió un error al guardar en la base de datos.');
    } finally {
      setLoadingSave(false);
    }
  };

  const handleDelete = async () => {
    if (selectedBarber) {
      setLoadingDelete(true);
      try {
        await deleteDoc(doc(db, 'users', selectedBarber.id));
        setDeleteVisible(false);
        setSnackbarMsg(`Barbero "${selectedBarber.name}" eliminado.`);
        setSnackbarVisible(true);
      } catch (err) {
        console.error("Error al eliminar barbero en Firestore:", err);
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
          <IconButton icon="arrow-left" size={24} onPress={() => router.push('/(admin)/profile')} style={{ marginLeft: -12, marginRight: 4 }} />
          <Text variant="headlineSmall" style={[styles.headerTitle, { color: theme.colors.secondary, marginRight: 8 }]}>
            Gestión Barberos
          </Text>
          <IconSymbol size={22} name="person.fill" color={theme.colors.primary} />
        </View>
        <Text variant="bodySmall" style={styles.headerSubtitle}>
          Administra el personal, especialidades, DNI y datos de contacto en Firestore.
        </Text>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="bodyMedium" style={{ marginTop: 12, opacity: 0.7 }}>Cargando personal...</Text>
        </View>
      ) : (
        <>
          {barbers.length > 0 && (
            <View style={styles.filterBar}>
              <Searchbar
                placeholder="Buscar por nombre o DNI..."
                onChangeText={setSearchQuery}
                value={searchQuery}
                style={styles.searchbar}
                inputStyle={styles.searchbarInput}
                iconColor={theme.colors.outline}
                rippleColor="rgba(197, 168, 128, 0.2)"
              />
            </View>
          )}

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {barbers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text variant="bodyLarge" style={{ opacity: 0.5, textAlign: 'center' }}>
                  No hay barberos registrados en el sistema.
                </Text>
              </View>
            ) : filteredBarbers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <IconSymbol size={48} name="person.fill" color={theme.colors.outline} style={{ marginBottom: 12 }} />
                <Text variant="bodyLarge" style={{ opacity: 0.5, textAlign: 'center' }}>
                  No se encontraron barberos con los filtros aplicados.
                </Text>
              </View>
            ) : (
              <View style={styles.listContainer}>
                {filteredBarbers.map((item) => {
                  const initials = item.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                  return (
                    <Card
                      key={item.id}
                      style={[styles.card, { backgroundColor: theme.colors.surface }]}
                      elevation={2}
                      onPress={() => router.push({
                        pathname: '/(admin)/barber-detail',
                        params: {
                          id: item.id,
                          name: item.name,
                          phone: item.phone,
                          email: item.email,
                          dni: item.dni,
                          description: item.description,
                          imageUrl: item.imageUrl || '',
                          isActive: item.isActive ? 'true' : 'false'
                        }
                      })}
                    >
                      <Card.Content style={styles.cardContent}>
                        <View style={styles.barberAvatarContainer}>
                          <View style={[styles.listAvatarBorder, { borderColor: theme.colors.primary }]}>
                            {item.imageUrl ? (
                              <Avatar.Image
                                size={46}
                                source={{ uri: item.imageUrl }}
                              />
                            ) : (
                              <Avatar.Text
                                size={46}
                                label={initials}
                                style={{ backgroundColor: theme.colors.primary }}
                                labelStyle={{ color: '#121212', fontWeight: 'bold', fontSize: 16 }}
                              />
                            )}
                          </View>
                        </View>
                        <View style={styles.cardInfo}>
                          <View style={styles.nameRow}>
                            <Text variant="titleMedium" style={[styles.barberNameText, { color: theme.colors.secondary }]}>
                              {item.name}
                            </Text>
                            {!item.isActive && (
                              <Text variant="bodySmall" style={{ color: theme.colors.error, fontWeight: 'bold', marginLeft: 8, fontSize: 11 }}>
                                [INACTIVO]
                              </Text>
                            )}
                          </View>
                          <Text variant="bodySmall" style={styles.descriptionText} numberOfLines={2}>
                            {item.description}
                          </Text>
                          <View style={styles.metaRow}>
                            <Text style={styles.metaText}>DNI: {item.dni}</Text>
                            <Text style={styles.metaText}>Tlf: {item.phone}</Text>
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
                  );
                })}
              </View>
            )}
          </ScrollView>
        </>
      )}

      {/* Floating Action Button for adding barber */}
      <FAB
        icon="plus"
        label="Nuevo Barbero"
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
              {selectedBarber ? 'Editar Barbero' : 'Nuevo Barbero'}
            </Dialog.Title>
            <Dialog.Content style={{ paddingBottom: 0 }}>
              <ScrollView style={{ maxHeight: 350 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={true}>
                <TextInput
                  label="Nombre Completo *"
                  value={name}
                  onChangeText={setName}
                  mode="outlined"
                  style={styles.input}
                  disabled={loadingSave}
                  error={!!nameError}
                />
                {nameError ? (
                  <HelperText type="error" visible={!!nameError} style={{ marginTop: -10, marginBottom: 8 }}>
                    {nameError}
                  </HelperText>
                ) : null}

                <TextInput
                  label="Teléfono *"
                  value={phone}
                  onChangeText={setPhone}
                  mode="outlined"
                  keyboardType="phone-pad"
                  style={styles.input}
                  maxLength={9}
                  placeholder="9XXXXXXXX"
                  disabled={loadingSave}
                  error={!!phoneError}
                />
                {phoneError ? (
                  <HelperText type="error" visible={!!phoneError} style={{ marginTop: -10, marginBottom: 8 }}>
                    {phoneError}
                  </HelperText>
                ) : null}

                <TextInput
                  label="Correo Electrónico *"
                  value={email}
                  onChangeText={setEmail}
                  mode="outlined"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.input}
                  disabled={loadingSave}
                  error={!!emailError}
                />
                {emailError ? (
                  <HelperText type="error" visible={!!emailError} style={{ marginTop: -10, marginBottom: 8 }}>
                    {emailError}
                  </HelperText>
                ) : null}

                <TextInput
                  label="DNI *"
                  value={dni}
                  onChangeText={setDni}
                  mode="outlined"
                  keyboardType="numeric"
                  style={styles.input}
                  maxLength={8}
                  placeholder="8 dígitos"
                  disabled={loadingSave}
                  error={!!dniError}
                />
                {dniError ? (
                  <HelperText type="error" visible={!!dniError} style={{ marginTop: -10, marginBottom: 8 }}>
                    {dniError}
                  </HelperText>
                ) : null}

                <TextInput
                  label="Presentación / Habilidades *"
                  value={description}
                  onChangeText={setDescription}
                  mode="outlined"
                  multiline
                  numberOfLines={2}
                  style={styles.input}
                  placeholder="Experto en degradados, afeitado tradicional..."
                  disabled={loadingSave}
                />

                <TextInput
                  label="URL de la Foto"
                  value={imageUrl}
                  onChangeText={setImageUrl}
                  mode="outlined"
                  style={styles.input}
                  placeholder="https://ejemplo.com/foto.png"
                  disabled={loadingSave}
                />

                {selectedBarber ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 12, paddingHorizontal: 4 }}>
                    <Text variant="bodyLarge" style={{ color: theme.colors.secondary }}>Acceso al Sistema (Activo)</Text>
                    <Switch
                      value={isActive}
                      onValueChange={setIsActive}
                      color={theme.colors.primary}
                      disabled={loadingSave}
                    />
                  </View>
                ) : null}

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
                onPress={hasErrors ? undefined : handleSave}
                textColor={hasErrors ? theme.colors.error : theme.colors.primary}
                style={hasErrors ? { borderColor: theme.colors.error, borderWidth: 1 } : undefined}
                labelStyle={{ fontWeight: 'bold', opacity: hasErrors ? 0.6 : 1 }}
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
          <Dialog.Title style={{ color: theme.colors.error }}>¿Eliminar barbero?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              ¿Estás seguro de que deseas eliminar permanentemente a <Text style={{ fontWeight: 'bold' }}>"{selectedBarber?.name}"</Text> del sistema?
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
    paddingBottom: 110,
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
  barberAvatarContainer: {
    marginRight: 12,
  },
  listAvatarBorder: {
    width: 54,
    height: 54,
    borderWidth: 1.5,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
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
    flexWrap: 'wrap',
  },
  barberNameText: {
    fontWeight: 'bold',
    flexShrink: 1,
  },
  // Removed specialtyTag
  descriptionText: {
    opacity: 0.6,
    fontSize: 12,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metaText: {
    opacity: 0.4,
    fontSize: 11,
    fontWeight: '500',
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
    minWidth: '28%',
  },
  categoryBtnLabel: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  filterBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  searchbar: {
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
});
