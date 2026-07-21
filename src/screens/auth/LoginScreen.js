import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { login, googleLogin } from '../../store/slices/authSlice';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { configureGoogleSignin } from '../../config/googleConfig';

export default function LoginScreen({ navigation }) {
  const dispatch = useDispatch();
  const { loading } = useSelector(state => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    configureGoogleSignin();
  }, []);

  const validate = () => {
    const e = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Invalid email format';
    if (!password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    try {
      await dispatch(login({ email, password })).unwrap();
    } catch (error) {
      setErrors({ general: error?.message || 'Something went wrong' });
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;

      if (!idToken) {
        Alert.alert(
          'Google Sign-In Error',
          'Tidak mendapatkan token dari Google. Periksa konfigurasi Web Client ID.',
        );
        return;
      }

      const resultAction = await dispatch(googleLogin(idToken));
      if (googleLogin.fulfilled.match(resultAction)) {
        // Login sukses
      } else {
        Alert.alert(
          'Google Login Failed',
          resultAction.payload || 'Terjadi kesalahan',
        );
      }
    } catch (error) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // user membatalkan
      } else if (error.code === statusCodes.IN_PROGRESS) {
        // proses sedang berlangsung
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert(
          'Google Play Services',
          'Google Play Services tidak tersedia atau perlu diperbarui di perangkat ini.',
        );
      } else if (
        error.code === '10' ||
        error.code === 10 ||
        error.code === 'DEVELOPER_ERROR'
      ) {
        // DEVELOPER_ERROR (10): konfigurasi OAuth tidak cocok.
        // Pastikan di Google Cloud Console ada Android OAuth Client dengan
        // package name "com.busticketing.stj" + SHA-1 keystore yang benar,
        // dan webClientId di googleConfig.js memakai Web Client ID.
        console.warn('Google Sign-In DEVELOPER_ERROR:', error);
        Alert.alert(
          'Konfigurasi Google Sign-In',
          'Login Google belum dikonfigurasi dengan benar (DEVELOPER_ERROR). ' +
            'SHA-1 / package name aplikasi belum terdaftar di Google Cloud Console.',
        );
      } else {
        console.warn('Google Sign-In error:', error);
        Alert.alert('Google Sign-In Error', error.message);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <MaterialIcons
            name="directions-bus"
            size={80}
            color="#1E88E5"
            style={styles.logo}
          />
          <Text style={styles.title}>Bus Ticketing</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>
        </View>

        <View style={styles.form}>
          {/* Email Input */}
          <View style={[styles.inputContainer, errors.email && styles.inputContainerError]}>
            <MaterialIcons
              name="email"
              size={20}
              color="#666"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#999"
              value={email}
              onChangeText={(t) => { setEmail(t); setErrors(p => ({ ...p, email: null })); }}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          {errors.email && <Text style={styles.fieldError}>{errors.email}</Text>}

          {/* Password Input */}
          <View style={[styles.inputContainer, errors.password && styles.inputContainerError]}>
            <MaterialIcons
              name="lock"
              size={20}
              color="#666"
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Password"
              placeholderTextColor="#999"
              value={password}
              onChangeText={(t) => { setPassword(t); setErrors(p => ({ ...p, password: null })); }}
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
          {errors.password && <Text style={styles.fieldError}>{errors.password}</Text>}

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.loginButtonText}>
              {loading ? 'Loading...' : 'Login'}
            </Text>
          </TouchableOpacity>

          {/* Separator */}
          <View style={styles.separator}>
            <View style={styles.line} />
            <Text style={styles.separatorText}>OR</Text>
            <View style={styles.line} />
          </View>

          {/* Google Login Button */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <FontAwesome name="google" size={20} color="#fff" />
                <Text style={styles.googleButtonText}>Login with Google</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Register Link */}
          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.registerText}>
              Don't have an account?{' '}
              <Text style={styles.registerTextBold}>Register</Text>
            </Text>
          </TouchableOpacity>

          {errors.general && <Text style={styles.errorText}>{errors.general}</Text>}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  keyboardView: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  header: { alignItems: 'center', marginBottom: 40 },
  logo: { marginBottom: 10 },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1E88E5',
    marginBottom: 10,
  },
  subtitle: { fontSize: 16, color: '#666' },
  form: { width: '100%' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    height: 50,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: '#333' },
  loginButton: {
    backgroundColor: '#1E88E5',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  loginButtonDisabled: { backgroundColor: '#90CAF9' },
  loginButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  separatorText: {
    marginHorizontal: 10,
    color: '#666',
  },
  googleButton: {
    backgroundColor: '#DB4437',
    borderRadius: 10,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  registerLink: { marginTop: 20, alignItems: 'center' },
  registerText: { color: '#666', fontSize: 14 },
  registerTextBold: { color: '#1E88E5', fontWeight: 'bold' },
  inputContainerError: {
    borderWidth: 1,
    borderColor: '#F44336',
    backgroundColor: '#FFF5F5',
  },
  fieldError: { color: '#F44336', fontSize: 12, marginTop: -10, marginBottom: 8, marginLeft: 4 },
  errorText: { color: '#F44336', textAlign: 'center', marginTop: 10 },
});
