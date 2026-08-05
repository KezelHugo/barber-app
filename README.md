# 💈 BarberApp - Aplicación Móvil de Barbería & Reservaciones

**BarberApp** es una aplicación móvil moderna desarrollada con **React Native** y **Expo (v54)** para la gestión integral de reservaciones, catálogo de servicios, control de barberos y atención al cliente en tiempo real. 

La aplicación cuenta con una arquitectura basada en **3 roles de usuario** (*Cliente*, *Barbero* y *Administrador*) con interfaces personalizadas y sincronización en vivo mediante **Firebase Cloud Firestore**.

---

## 📱 Roles y Funcionalidades Principales

### 1. 🧔 Vista Cliente
- **Inicio & Catálogo**: Visualización de promociones del mes y catálogo de servicios con imágenes banner de alta resolución.
- **Reservación Inteligente en 4 Pasos**:
  1. *Servicios*: Selección múltiple de servicios con cálculo dinámico de precio y tiempo.
  2. *Barbero*: Selección del profesional de preferencia.
  3. *Fecha y Horario*: Selector dinámico de los próximos 7 días que valida en tiempo real los horarios de atención, desactiva horarios pasados (margen de 5 min) y calcula el solapamiento de turnos para asegurar la **duración total contigua requerida** sin permitir sobreturnos.
  4. *Confirmación*: Resumen completo con hora de fin estimada, avatar del barbero y modal de éxito.
- **Mis Citas**: Listado ordenado de citas activas e historial con modal de pago digital (Yape / Plin) y cancelación.
- **Chat de Soporte**: Canal directo de comunicación en tiempo real con el administrador.
- **Perfil de Usuario**: Edición directa de número telefónico en Firestore y preferencias de estilo.

### 2. ✂️ Vista Barbero
- **Agenda Interactiva**: Muestra las citas asignadas al barbero logueado organizadas en:
  - *Citas Activas* (Pendientes y Pagadas).
  - *Concluidas y Canceladas* (Sección desplegable ordenada descendentemente por fecha/hora).
- **Acciones Rápidas**: Marcar citas como **Atendido** (`completed`) o **No Asistió** (`cancelled`).
- **Detalle de Cliente**: Acceso rápido a datos de contacto y servicios contratados.

### 3. 🛡️ Vista Administrador
- **Calendario Maestro**: Control total de todas las citas del sistema con filtros por barbero individual o vista global (`TODOS`).
- **Gestión Avanzada de Citas (3 Acciones)**:
  - 🔴 *Cancelar Cita*: Modal de confirmación para cancelar reservas.
  - 📅 *Cambiar Fecha y Hora*: Modal con las mismas restricciones inteligentes de duración y solapamiento contiguo.
  - ✂️ *Reasignar Barbero*: Transferencia de citas entre barberos registrados.
- **Gestión del Negocio**: Control de catálogo de servicios, usuarios (clientes, barberos y administradores) y horarios de atención comercial (`working_hours`).
- **Centro de Chats**: Módulo de conversaciones en tiempo real con badge rojo de mensajes no leídos.

---

## 🛠️ Tecnologías Utilizadas

- **Framework Móvil**: React Native + Expo SDK v54.0.0 (Expo Router con enrutamiento basado en archivos).
- **Lenguaje**: TypeScript.
- **Librería de UI**: React Native Paper (Material Design 3) con sistema de diseño personalizado (Dark/Gold Theme).
- **Base de Datos & Auth**: Firebase Authentication & Cloud Firestore.
- **Persistencia Local**: `@react-native-async-storage/async-storage`.
- **Mapeo e Imágenes**: `react-native-maps` + `expo-image`.
- **Ecosistema**: Expo Vector Icons (`@expo/vector-icons`).

---

## ⚙️ Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- [Node.js](https://nodejs.org/) (versión 18 o superior recomendada).
- `npm` o `yarn`.
- [Expo Go](https://expo.dev/go) en tu dispositivo móvil o un emulador de Android (Android Studio).

---

## 🔧 Configuración del Proyecto (Paso a Paso)

### 1. Clonar el Repositorio e Instalar Dependencias

```bash
# Clonar el proyecto
git clone <URL_DEL_REPOSITORIO>
cd barber-app

# Instalar las dependencias del proyecto
npm install
```

---

### 2. Configurar Variables de Entorno (`.env`)

Crea un archivo llamado `.env` en la raíz del proyecto y agrega tus credenciales de **Firebase** y **Google Maps**:

```env
# Credenciales de Firebase
EXPO_PUBLIC_FIREBASE_API_KEY=tu_firebase_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=tu_proyecto_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu_messaging_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=tu_app_id
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=tu_measurement_id

# Google Maps API Key
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=tu_google_maps_api_key
```

> ⚠️ **Importante**: Las variables con el prefijo `EXPO_PUBLIC_` son compiladas automáticamente por Expo.

---

### 3. Configuración de Firebase (Cloud Firestore)

En tu consola de [Firebase Console](https://console.firebase.google.com/), habilita **Authentication** (Email/Password) y **Cloud Firestore**.

El sistema utilizará las siguientes colecciones en Firestore:

- **`/users`**: Documentos de usuarios registrando su rol (`customer`, `barber`, `admin`).
- **`/appointments`**: Citas agendadas con campos `customerId`, `barberId`, `date`, `time`, `totalDuration`, `status`, etc.
- **`/services`**: Servicios ofrecidos (nombre, precio, duración, imageUrl).
- **`/chats`**: Conversaciones activas de atención al cliente.
- **`/business_settings/working_hours`**: Configuración de los días y horarios de apertura de la barbería.

---

## 🚀 Ejecución de la Aplicación

### Iniciar el Servidor de Desarrollo

```bash
# Iniciar servidor Expo
npx expo start
```

### Opciones de Ejecución:

- **En Android (Emulador o Cable USB)**:
  ```bash
  npm run android
  ```
- **En Dispositivo Físico**: Escanea el código QR mostrado en la terminal desde la app **Expo Go** (Android / iOS).

---

## 🧪 Verificación del Código

Para verificar que no existan errores de compilación o diferencias en el tipado de TypeScript:

```bash
npx tsc --noEmit
```

---

## 📦 Generación de Compilado (APK Android)

Para generar una APK instalable para pruebas en Android mediante **EAS Build**:

```bash
# Instalar CLI de EAS globalmente si no lo tienes
npm install -g eas-cli

# Iniciar sesión en Expo
eas login

# Compilar APK de prueba
npx eas build --platform android --profile preview
```

---

## 📄 Licencia

Este proyecto ha sido desarrollado como una solución integral de reservaciones para barberías. Desarrollado con React Native & Expo.