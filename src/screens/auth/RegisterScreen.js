import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { register } from '../../store/slices/authSlice';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

export default function RegisterScreen({ navigation }) {
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.auth);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    password_confirmation: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!formData.name.trim()) e.name = 'Full name is required';
    else if (formData.name.trim().length > 50) e.name = 'Nama maksimal 50 karakter';
    if (!formData.email.trim()) e.email = 'Email is required';
    else if (formData.email.length > 50) e.email = 'Email maksimal 50 karakter';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) e.email = 'Invalid email format';
    if (!formData.phone.trim()) e.phone = 'Phone number is required';
    else if (formData.phone.length > 15) e.phone = 'Nomor HP maksimal 15 karakter';
    if (!formData.password) e.password = 'Password is required';
    else if (formData.password.length < 12) e.password = 'Password minimal 12 karakter';
    else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/.test(formData.password))
      e.password = 'Password harus mengandung huruf besar, huruf kecil, angka, dan simbol';
    if (formData.password !== formData.password_confirmation)
      e.password_confirmation = 'Passwords do not match';
    setFieldErrors(e);
    return Object.keys(e).length === 0;
  };

  const clearError = (field) => setFieldErrors(p => ({ ...p, [field]: null }));

  const handleRegister = async () => {
    if (!validate()) return;

    try {
      await dispatch(register({
        ...formData,
        role: 'penumpang',
      })).unwrap();
      
      Alert.alert(
        'Success',
        'Registration successful! Please login.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      if (error.response?.data?.errors) {
        const serverErrors = error.response.data.errors;
        const mapped = {};
        for (const field in serverErrors) {
          mapped[field] = serverErrors[field].join(', ');
        }
        setFieldErrors(mapped);
      } else {
        setFieldErrors({ general: error.message || 'Something went wrong' });
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollView}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <MaterialIcons name="directions-bus" size={60} color="#1E88E5" style={styles.logo} />
            <Text style={styles.title}>Create Account</Text>
          </View>
        </View>

        <View style={styles.form}>
          {/* Name Input */}
          <View style={[styles.inputContainer, fieldErrors.name && styles.inputContainerError]}>
            <MaterialIcons name="person" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor="#999"
              value={formData.name}
              onChangeText={(text) => { setFormData({ ...formData, name: text }); clearError('name'); }}
              maxLength={50}
            />
          </View>
          {fieldErrors.name && <Text style={styles.fieldError}>{fieldErrors.name}</Text>}

          {/* Email Input */}
          <View style={[styles.inputContainer, fieldErrors.email && styles.inputContainerError]}>
            <MaterialIcons name="email" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#999"
              value={formData.email}
              onChangeText={(text) => { setFormData({ ...formData, email: text }); clearError('email'); }}
              keyboardType="email-address"
              autoCapitalize="none"
              maxLength={50}
            />
          </View>
          {fieldErrors.email && <Text style={styles.fieldError}>{fieldErrors.email}</Text>}

          {/* Phone Input */}
          <View style={[styles.inputContainer, fieldErrors.phone && styles.inputContainerError]}>
            <MaterialIcons name="phone" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              placeholderTextColor="#999"
              value={formData.phone}
              onChangeText={(text) => { setFormData({ ...formData, phone: text }); clearError('phone'); }}
              keyboardType="phone-pad"
              maxLength={15}
            />
          </View>
          {fieldErrors.phone && <Text style={styles.fieldError}>{fieldErrors.phone}</Text>}

          {/* Password Input */}
          <View style={[styles.inputContainer, fieldErrors.password && styles.inputContainerError]}>
            <MaterialIcons name="lock" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Password"
              placeholderTextColor="#999"
              value={formData.password}
              onChangeText={(text) => { setFormData({ ...formData, password: text }); clearError('password'); }}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <MaterialIcons
                name={showPassword ? 'visibility' : 'visibility-off'}
                size={20}
                color="#666"
              />
            </TouchableOpacity>
          </View>
          {fieldErrors.password && <Text style={styles.fieldError}>{fieldErrors.password}</Text>}

          {/* Confirm Password Input */}
          <View style={[styles.inputContainer, fieldErrors.password_confirmation && styles.inputContainerError]}>
            <MaterialIcons name="lock-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor="#999"
              value={formData.password_confirmation}
              onChangeText={(text) => { setFormData({ ...formData, password_confirmation: text }); clearError('password_confirmation'); }}
              secureTextEntry={!showPassword}
            />
          </View>
          {fieldErrors.password_confirmation && <Text style={styles.fieldError}>{fieldErrors.password_confirmation}</Text>}

          {fieldErrors.general && <Text style={styles.fieldError}>{fieldErrors.general}</Text>}

          {/* Register Button */}
          <TouchableOpacity
            style={[styles.registerButton, loading && styles.registerButtonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.registerButtonText}>
              {loading ? 'Creating Account...' : 'Register'}
            </Text>
          </TouchableOpacity>

          {/* Login Link */}
          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginText}>
              Already have an account? <Text style={styles.loginTextBold}>Login</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 30,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    zIndex: 1,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  logo: {
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  registerButton: {
    backgroundColor: '#1E88E5',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  registerButtonDisabled: {
    backgroundColor: '#90CAF9',
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginLink: {
    marginTop: 20,
    alignItems: 'center',
    marginBottom: 30,
  },
  loginText: {
    color: '#666',
    fontSize: 14,
  },
  inputContainerError: {
    borderWidth: 1,
    borderColor: '#F44336',
    backgroundColor: '#FFF5F5',
  },
  fieldError: { color: '#F44336', fontSize: 12, marginTop: -10, marginBottom: 8, marginLeft: 4 },
  loginTextBold: {
    color: '#1E88E5',
    fontWeight: 'bold',
  },
});