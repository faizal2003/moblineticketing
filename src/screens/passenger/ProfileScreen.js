import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, StatusBar, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import Ionicons from 'react-native-vector-icons/Ionicons';
import api from '../../services/api';
import { setCredentials } from '../../store/slices/authSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';

const C = {
  primary: '#2563EB', primaryLight: '#EFF6FF', bg: '#FFFFFF',
  surface: '#F8FAFC', border: '#E2E8F0', text: '#0F172A',
  textSub: '#64748B', red: '#EF4444', redLight: '#FEF2F2',
  white: '#FFFFFF', headerBg: '#1E3A5F', headerText: '#FFFFFF'
};

export default function ProfileScreen({ navigation }) {
  const dispatch = useDispatch();
  const { user, token } = useSelector(state => state.auth);

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    current_password: '',
    password: '',
    password_confirmation: ''
  });
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (user) {
      setFormData(prev => ({ ...prev, name: user.name, email: user.email, phone: user.phone || '' }));
    }
  }, [user]);

  const clearError = (field) => setFieldErrors(p => ({ ...p, [field]: null }));

  const validate = () => {
    const e = {};
    if (!formData.name.trim()) e.name = 'Nama lengkap wajib diisi';
    else if (formData.name.length > 50) e.name = 'Nama maksimal 50 karakter';

    if (!formData.email.trim()) e.email = 'Email wajib diisi';
    else if (formData.email.length > 50) e.email = 'Email maksimal 50 karakter';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) e.email = 'Format email tidak valid';

    if (!formData.phone?.trim()) e.phone = 'Nomor telepon wajib diisi';
    else if (formData.phone.length > 15) e.phone = 'Nomor HP maksimal 15 karakter';

    if (formData.password) {
      if (!formData.current_password) e.current_password = 'Password saat ini wajib diisi jika ingin mengubah password';
      if (formData.password.length < 12) e.password = 'Password minimal 12 karakter';
      else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/.test(formData.password))
        e.password = 'Password harus mengandung huruf besar, huruf kecil, angka, dan simbol';
      if (formData.password !== formData.password_confirmation) e.password_confirmation = 'Konfirmasi password tidak cocok';
    }

    setFieldErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleUpdate = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      // Endpoint update profil sesuai backend root ProfileController
      const profileData = { name: formData.name, email: formData.email, phone: formData.phone };
      await api.patch('/profile', profileData);

      // Jika ada isi password, panggil update password
      if (formData.password) {
        await api.put('/password', {
          current_password: formData.current_password,
          password: formData.password,
          password_confirmation: formData.password_confirmation
        });
      }

      // Update state auth & storage lokal
      const updatedUser = { ...user, ...profileData };
      dispatch(setCredentials({ user: updatedUser, token, isAuthenticated: true }));
      await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));

      Alert.alert('Sukses', 'Profil berhasil diperbarui');
      setFormData(prev => ({ ...prev, current_password: '', password: '', password_confirmation: '' }));
    } catch (error) {
      if (error.response?.data?.errors) {
        const serverErrors = error.response.data.errors;
        const mapped = {};
        for (const field in serverErrors) mapped[field] = serverErrors[field].join(', ');
        setFieldErrors(mapped);
      } else {
        Alert.alert('Gagal', error.response?.data?.message || 'Terjadi kesalahan');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.headerBg} translucent={false} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={C.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profil</Text>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Informasi Dasar</Text>

            <View style={[styles.inputGroup, fieldErrors.name && styles.inputError]}>
              <Text style={styles.label}>Nama Lengkap</Text>
              <TextInput style={styles.input} value={formData.name} onChangeText={t => { setFormData(p => ({ ...p, name: t })); clearError('name'); }} maxLength={50} />
            </View>
            {fieldErrors.name && <Text style={styles.errorText}>{fieldErrors.name}</Text>}

            <View style={[styles.inputGroup, fieldErrors.email && styles.inputError]}>
              <Text style={styles.label}>Email</Text>
              <TextInput style={styles.input} value={formData.email} onChangeText={t => { setFormData(p => ({ ...p, email: t })); clearError('email'); }} keyboardType="email-address" autoCapitalize="none" maxLength={50} />
            </View>
            {fieldErrors.email && <Text style={styles.errorText}>{fieldErrors.email}</Text>}

            <View style={[styles.inputGroup, fieldErrors.phone && styles.inputError]}>
              <Text style={styles.label}>Nomor Telepon</Text>
              <TextInput style={styles.input} value={formData.phone} onChangeText={t => { setFormData(p => ({ ...p, phone: t })); clearError('phone'); }} keyboardType="phone-pad" maxLength={15} />
            </View>
            {fieldErrors.phone && <Text style={styles.errorText}>{fieldErrors.phone}</Text>}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Ubah Password (Opsional)</Text>

            <View style={[styles.inputGroup, fieldErrors.current_password && styles.inputError]}>
              <Text style={styles.label}>Password Saat Ini</Text>
              <TextInput style={styles.input} secureTextEntry value={formData.current_password} onChangeText={t => { setFormData(p => ({ ...p, current_password: t })); clearError('current_password'); }} />
            </View>
            {fieldErrors.current_password && <Text style={styles.errorText}>{fieldErrors.current_password}</Text>}

            <View style={[styles.inputGroup, fieldErrors.password && styles.inputError]}>
              <Text style={styles.label}>Password Baru</Text>
              <TextInput style={styles.input} secureTextEntry value={formData.password} onChangeText={t => { setFormData(p => ({ ...p, password: t })); clearError('password'); }} />
            </View>
            {fieldErrors.password && <Text style={styles.errorText}>{fieldErrors.password}</Text>}

            <View style={[styles.inputGroup, fieldErrors.password_confirmation && styles.inputError]}>
              <Text style={styles.label}>Konfirmasi Password Baru</Text>
              <TextInput style={styles.input} secureTextEntry value={formData.password_confirmation} onChangeText={t => { setFormData(p => ({ ...p, password_confirmation: t })); clearError('password_confirmation'); }} />
            </View>
            {fieldErrors.password_confirmation && <Text style={styles.errorText}>{fieldErrors.password_confirmation}</Text>}
          </View>

          <TouchableOpacity style={[styles.saveButton, loading && styles.disabledBtn]} onPress={handleUpdate} disabled={loading}>
            {loading ? <ActivityIndicator color={C.white} /> : <Text style={styles.saveBtnText}>Simpan Perubahan</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.headerBg },
  container: { flex: 1, backgroundColor: C.surface },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.headerBg, paddingHorizontal: 16, paddingVertical: 14 },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.headerText, flex: 1, textAlign: 'center' },
  headerRight: { width: 32 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: C.white, borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 16 },
  inputGroup: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 12 },
  inputError: { borderColor: C.red, backgroundColor: C.redLight },
  label: { fontSize: 11, color: C.textMuted, marginBottom: 4, fontWeight: '500' },
  input: { fontSize: 15, color: C.text, padding: 0, height: 24 },
  errorText: { color: C.red, fontSize: 12, marginTop: -8, marginBottom: 12, marginLeft: 4 },
  saveButton: { backgroundColor: C.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  disabledBtn: { backgroundColor: C.primaryMuted },
  saveBtnText: { color: C.white, fontSize: 16, fontWeight: '700' }
});