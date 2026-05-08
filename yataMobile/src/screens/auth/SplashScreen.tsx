// src/screens/auth/SplashScreen.tsx
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const COLORS = {
  primary: '#630ED4',
  primaryContainer: '#7C3AED',
  surface: '#F8F9FA',
  onSurface: '#191C1D',
  onSurfaceVariant: '#4A4455',
  onPrimary: '#FFFFFF',
  surfaceContainerLow: '#F3F4F5',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerHighest: '#E1E3E4',
  outlineVariant: '#CCC3D8',
};

export default function SplashScreen() {
  const navigation = useNavigation<any>();

  // Animaciones de fondo
  const anim1X = useRef(new Animated.Value(0)).current;
  const anim1Y = useRef(new Animated.Value(0)).current;
  const anim2X = useRef(new Animated.Value(0)).current;
  const anim2Y = useRef(new Animated.Value(0)).current;
  const anim3X = useRef(new Animated.Value(0)).current;
  const anim3Y = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const makeLoop = (anim: Animated.Value, toValue: number, duration: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue, duration, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration, useNativeDriver: true }),
        ])
      );

    makeLoop(anim1X, 40, 3800).start();
    makeLoop(anim1Y, -30, 4200).start();
    makeLoop(anim2X, -35, 4600).start();
    makeLoop(anim2Y, 45, 3500).start();
    makeLoop(anim3X, 50, 5000).start();
    makeLoop(anim3Y, -40, 3200).start();
  }, []);

  const handleGetStarted = () => {
    console.log('🚀 Navegando al login unificado');
    navigation.replace('LoginUnificado'); // ← Cambiado a LoginUnificado
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Fondo animado */}
      <Animated.View style={[styles.blob1, { transform: [{ translateX: anim1X }, { translateY: anim1Y }] }]} />
      <Animated.View style={[styles.blob2, { transform: [{ translateX: anim2X }, { translateY: anim2Y }] }]} />
      <Animated.View style={[styles.blob3, { transform: [{ translateX: anim3X }, { translateY: anim3Y }] }]} />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logoGlow} />
            <Text style={styles.logoText}>YaTá</Text>
          </View>
          <View style={styles.titles}>
            <Text style={styles.title}>Cafetería LSC & LIDTS</Text>
            <Text style={styles.subtitle}>Pide, paga y recoge sin filas</Text>
          </View>
        </View>

        {/* Imagen central */}
        <View style={styles.imageContainer}>
          <View style={styles.imageBg1} />
          <View style={styles.imageBg2} />
          <Image
            source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA8OPsYLHjplk2d8uo3WFy36cuf334DI5KmTMlQPlQQJQmtFQ0jbXOsbDzicP_8TRs25CC5_Hi3nxNetLO-tqtXeSDZOgbpO2eNhvibZJco5pCxMiqita7lJS3qJNd88un7m3RYWr0OcnqBj7EpJyfu5syBEnNlz0uKtoi5rc-bGo_xsJWZr4FsIw_UzdRFk42UOfc6wg4ifbMBgqPUjSNh4MEJyUXgI5VLDybVuPFBP-5sLe8Sd_hiM1oMqWXB-M27I7Hi6iuYbiM' }}
            style={styles.coffeeImage}
            resizeMode="cover"
          />
        </View>

        {/* Botón principal */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.startButton} onPress={handleGetStarted} activeOpacity={0.8}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryContainer]}
              style={styles.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.startButtonText}>Comenzar</Text>
              <MaterialCommunityIcons name="arrow-right" size={20} color={COLORS.onPrimary} />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © 2024 YaTá - Todos los derechos reservados
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
  },
  blob1: {
    position: 'absolute',
    top: -120,
    right: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(99, 14, 212, 0.13)',
  },
  blob2: {
    position: 'absolute',
    bottom: -100,
    left: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(124, 58, 237, 0.10)',
  },
  blob3: {
    position: 'absolute',
    top: '38%',
    left: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(113, 46, 221, 0.09)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 16,
  },
  header: {
    alignItems: 'center',
    marginTop: 24,
  },
  logoContainer: {
    marginBottom: 32,
    position: 'relative',
    alignItems: 'center',
  },
  logoGlow: {
    position: 'absolute',
    inset: -16,
    backgroundColor: 'rgba(99, 14, 212, 0.05)',
    borderRadius: 9999,
  },
  logoText: {
    fontSize: 48,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -2,
  },
  titles: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.onSurface,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    opacity: 0.8,
  },
  imageContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  imageBg1: {
    position: 'absolute',
    width: 256,
    height: 256,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 24,
    transform: [{ rotate: '12deg' }, { scale: 1.05 }],
  },
  imageBg2: {
    position: 'absolute',
    width: 256,
    height: 256,
    backgroundColor: COLORS.surfaceContainerHighest,
    borderRadius: 24,
    transform: [{ rotate: '-12deg' }],
  },
  coffeeImage: {
    width: 256,
    height: 256,
    borderRadius: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
  },
  actions: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  startButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.onPrimary,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 8,
  },
  footerText: {
    fontSize: 11,
    color: COLORS.onSurfaceVariant,
    opacity: 0.5,
    textAlign: 'center',
  },
});