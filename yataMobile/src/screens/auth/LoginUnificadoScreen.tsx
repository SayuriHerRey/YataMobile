// src/screens/auth/LoginUnificadoScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { authService } from '../../services/authService';
import { notificationService } from '../../services/notificationService';

const COLORS = {
  primary: '#630ED4',
  primaryContainer: '#7C3AED',
  surface: '#F8F9FA',
  onSurface: '#191C1D',
  onSurfaceVariant: '#4A4455',
  onPrimary: '#FFFFFF',
  surfaceContainerLow: '#F3F4F5',
  surfaceContainerLowest: '#FFFFFF',
  outline: '#7B7487',
  outlineVariant: '#CCC3D8',
  error: '#BA1A1A',
  green: '#16A34A',
};

export default function LoginUnificadoScreen() {
  const navigation = useNavigation<any>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [detectedRole, setDetectedRole] = useState<'student' | 'staff' | null>(null);

  const detectRoleByEmail = (emailText: string): 'student' | 'staff' | null => {
    const lowerEmail = emailText.toLowerCase();
    if (lowerEmail.includes('@unach.mx')) return 'student';
    if (lowerEmail.includes('@cafeteria.com') || lowerEmail.includes('@staff.unach.mx')) {
      return 'staff';
    }
    return null;
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    setDetectedRole(detectRoleByEmail(text));
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Campos incompletos', 'Por favor completa todos los campos');
      return;
    }

    const role = detectRoleByEmail(email);
    if (!role) {
      Alert.alert(
        'Dominio no válido',
        'Por favor usa un correo válido:\n\n• Estudiantes: @unach.mx\n• Personal: @cafeteria.com o @staff.unach.mx'
      );
      return;
    }

    setLoading(true);

    try {
      const result = await authService.login(email.trim(), password);

      if (!result.success || !result.user) {
        Alert.alert('Error de acceso', result.error ?? 'Correo o contraseña incorrectos');
        return;
      }

      // ✅ Registrar token de notificaciones push
      notificationService.registerDeviceToken(result.user.user_id)
        .catch(err => console.warn('⚠️ Error registrando token:', err));

      // Navegar según rol
      if (result.user.role === 'student') {
        navigation.replace('StudentStack');
      } else {
        navigation.replace('StaffStack');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      Alert.alert('Error', err.message ?? 'No se pudo conectar al servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToSplash = () => {
    navigation.replace('Splash');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.backButton} onPress={handleBackToSplash}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.onSurfaceVariant} />
          </TouchableOpacity>

          {/* HEADER */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <MaterialCommunityIcons name="silverware-fork-knife" size={48} color={COLORS.primary} />
              <Text style={styles.logoText}>YaTá</Text>
            </View>
            <Text style={styles.title}>Bienvenid@</Text>
            <Text style={styles.subtitle}>Inicia sesión para continuar</Text>
          </View>

          {/* FORM */}
          <View style={styles.form}>
            {/* Email */}
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons
                name="email-outline"
                size={20}
                color={COLORS.outline}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Correo institucional"
                placeholderTextColor={COLORS.outline}
                value={email}
                onChangeText={handleEmailChange}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {detectedRole && (
                <MaterialCommunityIcons
                  name={detectedRole === 'student' ? 'account-school' : 'chef-hat'}
                  size={20}
                  color={COLORS.primary}
                />
              )}
            </View>

            {/* Password */}
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons
                name="lock-outline"
                size={20}
                color={COLORS.outline}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Contraseña"
                placeholderTextColor={COLORS.outline}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <MaterialCommunityIcons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={COLORS.outline}
                />
              </TouchableOpacity>
            </View>

            {/* Role Badge */}
            {detectedRole && (
              <View
                style={[
                  styles.roleBadge,
                  { backgroundColor: detectedRole === 'student' ? '#EDE0FF' : '#DCFCE7' },
                ]}
              >
                <MaterialCommunityIcons
                  name={detectedRole === 'student' ? 'account-school' : 'chef-hat'}
                  size={16}
                  color={detectedRole === 'student' ? COLORS.primary : COLORS.green}
                />
                <Text
                  style={[
                    styles.roleBadgeText,
                    { color: detectedRole === 'student' ? COLORS.primary : COLORS.green },
                  ]}
                >
                  {detectedRole === 'student'
                    ? 'Acceso estudiante'
                    : 'Acceso personal cafetería'}
                </Text>
              </View>
            )}

            {/* Login Button */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#630ED4', '#7C3AED']}
                style={styles.loginButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.loginButtonText}>Iniciar sesión</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Info */}
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              🎓 Estudiantes: @unach.mx{'\n'}
              👨‍🍳 Personal: @cafeteria.com
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surfaceContainerLowest },
  safeArea: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  backButton: { marginTop: 16, marginBottom: 8, width: 40, height: 40, justifyContent: 'center' },
  header: { alignItems: 'center', marginTop: 24, marginBottom: 40 },
  logoContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  logoText: { fontSize: 36, fontWeight: '800', color: COLORS.primary },
  title: { fontSize: 28, fontWeight: '700', color: COLORS.onSurface, marginBottom: 8 },
  subtitle: { fontSize: 15, color: COLORS.onSurfaceVariant, textAlign: 'center' },
  form: { gap: 16 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: COLORS.onSurface },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  roleBadgeText: { fontSize: 14, fontWeight: '600' },
  loginButton: {
    borderRadius: 14,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  infoContainer: {
    marginTop: 32,
    padding: 16,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 12,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.onSurfaceVariant,
    lineHeight: 22,
    textAlign: 'center',
  },
});