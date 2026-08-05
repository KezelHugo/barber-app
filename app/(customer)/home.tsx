import { IconSymbol } from '@/components/ui/icon-symbol';
import { useUserRole } from '@/context/user-role';
import { useRouter } from 'expo-router';
import React, { useState, useEffect, useRef } from 'react';
import { Dimensions, FlatList, ScrollView, StyleSheet, TouchableOpacity, View, Linking, Platform } from 'react-native';
import { Avatar, Badge, Button, Card, Dialog, IconButton, Modal, Portal, Text, useTheme, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { db } from '@/config/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { Image } from 'expo-image';
import { getDirectImageUrl } from '@/utils/image-url';

const { width: screenWidth } = Dimensions.get('window');
const SERVICE_CARD_WIDTH = screenWidth * 0.64;

interface ServiceItem {
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

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { role, userName, logout } = useUserRole();
  const isGuest = role === 'guest';

  const [dialogVisible, setDialogVisible] = useState(false);
  const [catalogVisible, setCatalogVisible] = useState(false);

  // Real database services state
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Carousel ref and scroll state
  const flatListRef = useRef<FlatList>(null);
  const [scrollOffset, setScrollOffset] = useState(0);

  const handleScrollRight = () => {
    if (flatListRef.current) {
      const step = SERVICE_CARD_WIDTH + 14;
      const totalWidth = services.length * (SERVICE_CARD_WIDTH + 14);
      // Si ya llegamos al final del scrollable, regresamos al inicio
      if (scrollOffset + screenWidth >= totalWidth - 30) {
        flatListRef.current.scrollToOffset({ offset: 0, animated: true });
      } else {
        flatListRef.current.scrollToOffset({
          offset: scrollOffset + step,
          animated: true,
        });
      }
    }
  };

  const openGoogleMapsNavigation = () => {
    const lat = -12.0963;
    const lng = -77.0353;
    const label = encodeURIComponent('BarberApp Sede San Isidro');
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    const geoUrl = Platform.OS === 'ios'
      ? `maps:0,0?q=${label}@${lat},${lng}`
      : `geo:${lat},${lng}?q=${lat},${lng}(${label})`;

    Linking.canOpenURL(geoUrl)
      .then((supported) => {
        if (supported) {
          Linking.openURL(geoUrl);
        } else {
          Linking.openURL(googleMapsUrl);
        }
      })
      .catch(() => {
        Linking.openURL(googleMapsUrl);
      });
  };

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'services'), (snapshot) => {
      const servicesList: ServiceItem[] = [];
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
      console.error("Error al cargar servicios en HomeScreen:", err);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Seleccionar la promoción del mes (más barata en base a promoPrice)
  const promoService = services
    .filter(s => s.category === 'promocion' && s.promoPrice !== undefined)
    .sort((a, b) => (a.promoPrice || 0) - (b.promoPrice || 0))[0];

  const handleBookingStart = (preselectedPromoId?: string) => {
    if (isGuest) {
      setDialogVisible(true);
    } else {
      if (preselectedPromoId) {
        router.push({
          pathname: '/(reservation)/1-service' as any,
          params: { preselected: preselectedPromoId }
        });
      } else {
        router.push('/(reservation)/1-service');
      }
    }
  };

  const goToLogin = () => {
    setDialogVisible(false);
    logout(); // Redirects to login
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      {/* Top Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.userInfo}>
          <Avatar.Text
            size={40}
            label={isGuest ? 'IN' : userName.split(' ').map(n => n[0]).join('')}
            style={{ backgroundColor: theme.colors.primary }}
            labelStyle={{ color: '#121212', fontWeight: 'bold' }}
          />
          <View style={styles.userTextContainer}>
            <Text variant="bodySmall" style={styles.welcomeText}>Bienvenido,</Text>
            <Text variant="titleMedium" style={[styles.userName, { color: theme.colors.secondary }]}>
              {isGuest ? 'Invitado' : userName}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Banner Promo del Mes */}
        {promoService ? (
          <Card style={[styles.promoCard, { backgroundColor: theme.colors.surfaceVariant }]} elevation={2}>
            <Card.Content style={styles.promoContent}>
              <View style={styles.promoHeader}>
                <Badge style={[styles.promoBadge, { backgroundColor: theme.colors.primary }]}>PROMO DEL MES</Badge>
                {promoService.price > 0 && promoService.promoPrice && (
                  <Text variant="titleSmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                    {Math.round((1 - (promoService.promoPrice / promoService.price)) * 100)}% OFF
                  </Text>
                )}
              </View>
              <Text variant="headlineSmall" style={[styles.promoTitle, { color: theme.colors.secondary }]}>
                {promoService.name}
              </Text>

              {/* Promo Combo Image */}
              {promoService.imageUrl && promoService.imageUrl.trim() !== '' ? (
                <View style={styles.promoImageContainer}>
                  <Image
                    source={{ uri: getDirectImageUrl(promoService.imageUrl) }}
                    style={styles.promoImage}
                    contentFit="cover"
                    transition={200}
                  />
                </View>
              ) : null}

              <Text variant="bodyMedium" style={styles.promoDesc}>
                {promoService.description || 'Disfruta de esta oferta exclusiva por tiempo limitado.'}
              </Text>
              <View style={styles.promoFooter}>
                <Text variant="titleLarge" style={[styles.promoPrice, { color: theme.colors.primary }]}>
                  S/. {promoService.promoPrice} <Text style={styles.oldPrice}>S/. {promoService.price}</Text>
                </Text>
                <Button
                  mode="contained"
                  onPress={() => handleBookingStart(promoService.id)}
                  style={[styles.promoBtn, { backgroundColor: theme.colors.primary }]}
                  labelStyle={styles.promoBtnLabel}
                >
                  Aprovechar
                </Button>
              </View>
            </Card.Content>
          </Card>
        ) : null}

        {/* Accesos Rápidos */}
        <Text style={[styles.sectionTitle, { color: theme.colors.secondary }]} variant="titleLarge">
          Acceso Rápido
        </Text>
        <View style={styles.quickGrid}>
          <Button
            mode="contained"
            icon="calendar-plus"
            onPress={() => handleBookingStart()}
            style={[styles.quickBookingBtn, { backgroundColor: theme.colors.primary }]}
            contentStyle={styles.quickBookingBtnContent}
            labelStyle={styles.quickBookingBtnLabel}
          >
            Reservar Ahora
          </Button>
        </View>

        {/* Catálogo de Servicios */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: theme.colors.secondary }]} variant="titleLarge">
            Nuestros Servicios
          </Text>
          <TouchableOpacity onPress={() => setCatalogVisible(true)}>
            <Text style={{ color: theme.colors.primary, fontWeight: '600' }} variant="labelLarge">
              Ver Todos
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ position: 'relative' }}>
          {loading ? (
            <ActivityIndicator style={{ marginVertical: 30 }} color={theme.colors.primary} />
          ) : (
            <FlatList
              ref={flatListRef}
              data={services}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.horizontalList}
              onScroll={(event) => {
                setScrollOffset(event.nativeEvent.contentOffset.x);
              }}
              scrollEventThrottle={16}
              renderItem={({ item }) => (
                <Card 
                  style={[styles.serviceCard, { backgroundColor: theme.colors.surface }]} 
                  elevation={2}
                  onPress={() => handleBookingStart(item.id)}
                >
                  <Card.Content style={styles.serviceContent}>
                    <Badge style={styles.categoryBadge}>
                      {CATEGORY_LABELS[item.category] || item.category}
                    </Badge>
                    <Text variant="titleMedium" numberOfLines={2} style={[styles.serviceName, { color: theme.colors.secondary }]}>
                      {item.name}
                    </Text>

                    {item.imageUrl && item.imageUrl.trim() !== '' ? (
                      <View style={styles.serviceCardImageContainer}>
                        <Image
                          source={{ uri: getDirectImageUrl(item.imageUrl) }}
                          style={styles.serviceCardImage}
                          contentFit="cover"
                          transition={200}
                        />
                      </View>
                    ) : null}

                    <View style={styles.serviceFooter}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <IconSymbol size={14} name="clock" color={theme.colors.outline} style={{ marginRight: 4 }} />
                        <Text variant="bodyMedium" style={styles.serviceDuration}>{item.duration} min</Text>
                      </View>
                      <Text variant="titleMedium" style={[styles.servicePrice, { color: theme.colors.primary }]}>
                        {item.category === 'promocion' && item.promoPrice !== undefined ? (
                          `S/. ${item.promoPrice}`
                        ) : (
                          `S/. ${item.price}`
                        )}
                      </Text>
                    </View>
                  </Card.Content>
                </Card>
              )}
            />
          )}
          {/* Subtle floating right arrow indicator overlay */}
          <View style={styles.carouselArrowIndicator}>
            <IconButton
              icon="chevron-right"
              size={18}
              iconColor={theme.colors.primary}
              style={{ backgroundColor: theme.colors.surface, margin: 0, elevation: 3 }}
              onPress={handleScrollRight}
            />
          </View>
        </View>

        {/* Support Chat Banner Section */}
        <Card
          style={[styles.supportCard, { backgroundColor: theme.colors.surface, borderColor: 'rgba(212, 175, 55, 0.3)', borderWidth: 1 }]}
          elevation={2}
        >
          <Card.Content style={styles.supportCardContent}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <IconButton icon="headset" size={32} iconColor={theme.colors.primary} style={{ backgroundColor: 'rgba(212, 175, 55, 0.12)', margin: 0 }} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.secondary }}>
                  ¿Tienes alguna duda? Pregúntanos
                </Text>
                <Text variant="bodySmall" style={{ opacity: 0.6, marginTop: 2 }}>
                  Conversa directamente con nuestro equipo de atención en tiempo real.
                </Text>
              </View>
            </View>

            <Button
              mode="contained"
              icon="message-text"
              onPress={() => {
                if (isGuest) {
                  setDialogVisible(true);
                } else {
                  router.push('/(customer)/chat');
                }
              }}
              style={[styles.supportBtn, { backgroundColor: theme.colors.primary }]}
              labelStyle={{ color: '#121212', fontWeight: 'bold' }}
            >
              Escribir al Soporte
            </Button>
          </Card.Content>
        </Card>

        {/* Location & Google Maps Section */}
        <Card
          style={[styles.locationCard, { backgroundColor: theme.colors.surface, borderColor: 'rgba(212, 175, 55, 0.3)', borderWidth: 1 }]}
          elevation={2}
        >
          <Card.Content style={{ padding: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <IconButton icon="map-marker" size={30} iconColor={theme.colors.primary} style={{ backgroundColor: 'rgba(212, 175, 55, 0.12)', margin: 0, marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.secondary }}>
                  Nuestra Ubicación
                </Text>
                <Text variant="bodySmall" style={{ opacity: 0.65, marginTop: 2 }}>
                  Av. Javier Prado Este 1450, San Isidro, Lima
                </Text>
              </View>
            </View>

            {/* Interactive Map View */}
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={openGoogleMapsNavigation}
              style={styles.mapTouchContainer}
            >
              <MapView
                provider={PROVIDER_GOOGLE}
                style={styles.mapView}
                initialRegion={{
                  latitude: -12.0963,
                  longitude: -77.0353,
                  latitudeDelta: 0.008,
                  longitudeDelta: 0.008,
                }}
                pitchEnabled={false}
                rotateEnabled={false}
                scrollEnabled={false}
                zoomEnabled={false}
                onPress={openGoogleMapsNavigation}
              >
                <Marker
                  coordinate={{ latitude: -12.0963, longitude: -77.0353 }}
                  title="BarberApp San Isidro"
                  description="Toca para abrir ruta en Google Maps"
                  pinColor={theme.colors.primary}
                  onPress={openGoogleMapsNavigation}
                />
              </MapView>

              {/* Map Overlay Badge */}
              <View style={[styles.mapOverlayBadge, { backgroundColor: 'rgba(18, 18, 18, 0.8)' }]}>
                <IconSymbol size={14} name="paperplane.fill" color={theme.colors.primary} style={{ marginRight: 6 }} />
                <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' }}>
                  Toca el mapa para abrir Google Maps
                </Text>
              </View>
            </TouchableOpacity>
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Guest Block Dialog Redesigned */}
      <Portal>
        <Dialog
          visible={dialogVisible}
          onDismiss={() => setDialogVisible(false)}
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: 'rgba(212, 175, 55, 0.35)',
            paddingBottom: 6,
          }}
        >
          <View style={{ alignItems: 'center', paddingTop: 16 }}>
            <IconButton
              icon="account-lock-outline"
              size={36}
              iconColor={theme.colors.primary}
              style={{ backgroundColor: 'rgba(212, 175, 55, 0.12)', margin: 0 }}
            />
          </View>
          <Dialog.Title style={{ color: theme.colors.primary, textAlign: 'center', fontWeight: 'bold', fontSize: 20, paddingTop: 8 }}>
            ¡Cuenta Requerida!
          </Dialog.Title>
          <Dialog.Content style={{ paddingHorizontal: 20 }}>
            <View style={{ backgroundColor: theme.colors.background, padding: 14, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(150, 150, 150, 0.12)', marginBottom: 4 }}>
              <Text variant="bodyMedium" style={{ textAlign: 'center', lineHeight: 20, color: theme.colors.secondary }}>
                Para agendar tus citas, chatear con nuestro equipo y disfrutar de promociones exclusivas, necesitas iniciar sesión o crear una cuenta.
              </Text>
            </View>
          </Dialog.Content>
          <Dialog.Actions style={{ paddingHorizontal: 20, paddingBottom: 16, justifyContent: 'space-between', gap: 10 }}>
            <Button
              mode="outlined"
              onPress={() => setDialogVisible(false)}
              style={{ borderColor: 'rgba(150, 150, 150, 0.3)', borderRadius: 8, flex: 1 }}
              textColor={theme.colors.outline}
            >
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={goToLogin}
              style={{ backgroundColor: theme.colors.primary, borderRadius: 8, flex: 1.2 }}
              labelStyle={{ color: '#121212', fontWeight: 'bold' }}
            >
              Iniciar Sesión
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Complete Catalog Modal Redesigned: Formal, Elegant Booklet Style */}
      <Portal>
        <Modal
          visible={catalogVisible}
          onDismiss={() => setCatalogVisible(false)}
          contentContainerStyle={[styles.modalContentContainer, { backgroundColor: theme.colors.surface }]}
        >
          <View style={[styles.modalInnerBorder, { borderColor: 'rgba(212, 175, 55, 0.35)' }]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text variant="labelMedium" style={[styles.modalHeaderSubtitle, { color: theme.colors.primary }]}>
                EXPERIENCIA EXCLUSIVA
              </Text>
              <Text variant="headlineSmall" style={[styles.modalHeaderTitle, { color: theme.colors.secondary }]}>
                CARTA DE SERVICIOS
              </Text>
              <View style={styles.ornamentRow}>
                <View style={[styles.ornamentLine, { backgroundColor: theme.colors.primary }]} />
                <Avatar.Icon
                  icon="face-man"
                  size={24}
                  color={theme.colors.primary}
                  style={{ backgroundColor: 'transparent', marginHorizontal: 8 }}
                />
                <View style={[styles.ornamentLine, { backgroundColor: theme.colors.primary }]} />
              </View>
              <Text variant="bodySmall" style={[styles.modalHeaderBranch, { color: theme.colors.secondary }]}>
                SEDE SAN ISIDRO • BARBERAPP
              </Text>
            </View>

            {/* Scrollable Menu Items */}
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
              {(['promocion', 'cortes', 'barba', 'faciales'] as const).map((cat) => {
                const filtered = services.filter(s => s.category === cat);
                if (filtered.length === 0) return null;

                const categoryTitle = 
                  cat === 'promocion' ? 'PROMOCIONES Y OFERTAS' :
                  cat === 'cortes' ? 'CORTES DE CABELLO' : 
                  cat === 'barba' ? 'DISEÑO DE BARBA' : 'TERAPIAS FACIALES';

                return (
                  <View key={cat} style={styles.modalCategorySection}>
                    <Text variant="titleMedium" style={[styles.modalCategoryTitle, { color: theme.colors.primary }]}>
                      {categoryTitle}
                    </Text>

                    {filtered.map(s => (
                      <TouchableOpacity
                        key={s.id}
                        style={styles.modalServiceRow}
                        onPress={() => {
                          setCatalogVisible(false);
                          handleBookingStart(s.id);
                        }}
                      >
                        <View style={styles.serviceRowHeader}>
                          <Text style={[styles.modalServiceName, { color: theme.colors.secondary }]}>
                            {s.name}
                          </Text>
                          <View style={[styles.dottedLine, { borderBottomColor: 'rgba(212, 175, 55, 0.25)' }]} />
                          <Text style={[styles.modalServicePrice, { color: theme.colors.primary }]}>
                            {s.category === 'promocion' && s.promoPrice !== undefined ? (
                              `S/. ${s.promoPrice}`
                            ) : (
                              `S/. ${s.price}`
                            )}
                          </Text>
                        </View>

                        <Text variant="bodySmall" style={[styles.modalServiceDescription, { color: theme.colors.secondary }]}>
                          {s.description || 'Sin descripción'}
                        </Text>

                        <View style={styles.serviceRowFooter}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <IconSymbol size={13} name="clock" color={theme.colors.outline} style={{ marginRight: 4 }} />
                            <Text variant="labelSmall" style={[styles.modalServiceDuration, { color: theme.colors.secondary }]}>
                              {s.duration} min
                            </Text>
                          </View>
                          <View style={styles.dotSeparator} />
                          <Text variant="labelSmall" style={[styles.modalReserveLink, { color: theme.colors.primary }]}>
                            Reservar servicio ➜
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                );
              })}
            </ScrollView>

            {/* Footer / Actions */}
            <View style={styles.modalFooter}>
              <Button
                mode="outlined"
                onPress={() => setCatalogVisible(false)}
                style={[styles.closeMenuBtn, { borderColor: theme.colors.primary }]}
                textColor={theme.colors.primary}
                labelStyle={styles.closeMenuBtnLabel}
              >
                CERRAR CARTA
              </Button>
            </View>
          </View>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.1)',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userTextContainer: {
    marginLeft: 12,
  },
  welcomeText: {
    opacity: 0.6,
  },
  userName: {
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  promoCard: {
    margin: 20,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  promoContent: {
    padding: 16,
  },
  promoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  promoBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  promoTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  promoImageContainer: {
    height: 160,
    width: '100%',
    borderRadius: 10,
    overflow: 'hidden',
    marginVertical: 10,
    backgroundColor: 'rgba(150, 150, 150, 0.08)',
  },
  promoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  serviceCardImageContainer: {
    height: 90,
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    marginVertical: 6,
    backgroundColor: 'rgba(150, 150, 150, 0.08)',
  },
  serviceCardImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  promoDesc: {
    opacity: 0.7,
    marginBottom: 16,
    fontSize: 13,
    lineHeight: 18,
  },
  promoFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  promoPrice: {
    fontWeight: 'bold',
  },
  oldPrice: {
    fontSize: 13,
    textDecorationLine: 'line-through',
    opacity: 0.5,
    fontWeight: 'normal',
  },
  promoBtn: {
    borderRadius: 8,
  },
  promoBtnLabel: {
    fontWeight: 'bold',
    color: '#121212',
  },
  sectionTitle: {
    fontWeight: 'bold',
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 20,
    marginTop: 16,
    marginBottom: 12,
  },
  quickGrid: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  quickBookingBtn: {
    borderRadius: 12,
    elevation: 3,
  },
  quickBookingBtnContent: {
    height: 56,
    flexDirection: 'row',
  },
  quickBookingBtnLabel: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#121212',
  },
  horizontalList: {
    paddingLeft: 20,
    paddingRight: 10,
    paddingBottom: 16,
  },
  serviceCard: {
    width: SERVICE_CARD_WIDTH,
    marginRight: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.1)',
  },
  carouselArrowIndicator: {
    position: 'absolute',
    right: 4,
    top: '40%',
    zIndex: 10,
    opacity: 0.85,
  },
  serviceContent: {
    padding: 14,
    minHeight: 180,
    justifyContent: 'space-between',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    color: '#C5A880',
    fontSize: 10,
    fontWeight: 'bold',
  },
  serviceName: {
    fontWeight: '700',
    fontSize: 15,
    marginVertical: 4,
    lineHeight: 20,
  },
  serviceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  serviceDuration: {
    fontSize: 12,
    opacity: 0.6,
  },
  servicePrice: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  galleryContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  galleryCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.1)',
    overflow: 'hidden',
  },
  galleryContentRedesigned: {
    padding: 16,
  },
  galleryTextTop: {
    width: '100%',
  },
  galleryImageBox: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  galleryDesc: {
    opacity: 0.65,
    fontSize: 13,
    lineHeight: 18,
  },
  detailedServiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(150, 150, 150, 0.12)',
  },
  modalContentContainer: {
    margin: 16,
    height: '80%',
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#D4AF37',
    padding: 5,
    elevation: 10,
  },
  modalInnerBorder: {
    borderWidth: 1,
    borderStyle: 'solid',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 12,
    flex: 1,
    height: '100%',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 14,
  },
  modalHeaderSubtitle: {
    fontWeight: '700',
    letterSpacing: 2,
    fontSize: 10,
    opacity: 0.8,
  },
  modalHeaderTitle: {
    fontWeight: 'bold',
    fontSize: 22,
    letterSpacing: 1.5,
    marginTop: 2,
    textAlign: 'center',
  },
  ornamentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  ornamentLine: {
    height: 1,
    width: 40,
    opacity: 0.4,
  },
  modalHeaderBranch: {
    fontSize: 9,
    letterSpacing: 1.5,
    opacity: 0.5,
    marginTop: 2,
  },
  modalScrollContent: {
    paddingBottom: 16,
  },
  modalCategorySection: {
    marginBottom: 20,
  },
  modalCategoryTitle: {
    fontWeight: 'bold',
    letterSpacing: 2,
    fontSize: 13,
    textTransform: 'uppercase',
    marginBottom: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(212, 175, 55, 0.25)',
    paddingBottom: 4,
  },
  modalServiceRow: {
    marginBottom: 16,
    paddingVertical: 4,
  },
  serviceRowHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  modalServiceName: {
    fontWeight: '700',
    fontSize: 15,
    flexShrink: 1,
  },
  dottedLine: {
    flex: 1,
    borderStyle: 'dotted',
    borderBottomWidth: 1.5,
    marginHorizontal: 8,
    height: 1,
  },
  modalServicePrice: {
    fontWeight: 'bold',
    fontSize: 15,
    minWidth: 55,
    textAlign: 'right',
  },
  modalServiceDescription: {
    opacity: 0.6,
    marginTop: 4,
    lineHeight: 16,
    fontSize: 12,
  },
  serviceRowFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  modalServiceDuration: {
    fontSize: 11,
    opacity: 0.5,
  },
  dotSeparator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(212, 175, 55, 0.4)',
    marginHorizontal: 8,
  },
  modalReserveLink: {
    fontSize: 11,
    fontWeight: '700',
  },
  modalFooter: {
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(150, 150, 150, 0.15)',
    alignItems: 'center',
  },
  closeMenuBtn: {
    borderRadius: 4,
    borderWidth: 1,
    width: '80%',
  },
  closeMenuBtnLabel: {
    fontWeight: 'bold',
    fontSize: 13,
    letterSpacing: 1.5,
  },
  supportCard: {
    marginTop: 24,
    marginBottom: 16,
    borderRadius: 14,
  },
  supportCardContent: {
    padding: 16,
  },
  supportBtn: {
    marginTop: 14,
    borderRadius: 8,
    paddingVertical: 2,
  },
  locationCard: {
    marginTop: 12,
    marginBottom: 32,
    borderRadius: 14,
  },
  mapTouchContainer: {
    position: 'relative',
    width: '100%',
    height: 180,
    borderRadius: 10,
    overflow: 'hidden',
  },
  mapView: {
    width: '100%',
    height: '100%',
  },
  mapOverlayBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
});