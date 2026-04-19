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
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { configureGoogleSignin } from '../../config/googleConfig';

export default function LoginScreen({ navigation }) {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    configureGoogleSignin();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    try {
      await dispatch(login({ email, password })).unwrap();
    } catch (error) {
      Alert.alert('Login Failed', error?.message || 'Something went wrong');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data.idToken;

      // console.log(userInfo.data.idToken);

      const resultAction = await dispatch(googleLogin(idToken));
      if (googleLogin.fulfilled.match(resultAction)) {
        // Login sukses
      } else {
        Alert.alert('Google Login Failed', resultAction.payload || 'Terjadi kesalahan');
      }
    } catch (error) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // user membatalkan
      } else if (error.code === statusCodes.IN_PROGRESS) {
        // proses sedang berlangsung
      } else {
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
          <MaterialIcons name="directions-bus" size={80} color="#1E88E5" style={styles.logo} />
          <Text style={styles.title}>Bus Ticketing</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>
        </View>

        <View style={styles.form}>
          {/* Email Input */}
          <View style={styles.inputContainer}>
            <MaterialIcons name="email" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <MaterialIcons name="lock" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Password"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
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
              Don't have an account? <Text style={styles.registerTextBold}>Register</Text>
            </Text>
          </TouchableOpacity>

          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}
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
  title: { fontSize: 32, fontWeight: 'bold', color: '#1E88E5', marginBottom: 10 },
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
  errorText: { color: '#F44336', textAlign: 'center', marginTop: 10 },
});