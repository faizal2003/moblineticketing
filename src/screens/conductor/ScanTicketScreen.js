import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { conductorService } from '../../services/conductorService';

export default function ScanTicketScreen({ route, navigation }) {
  const { scheduleId } = route.params ?? {};

  const [VisionCamera, setVisionCamera] = useState(null);
  const [CameraModule, setCameraModule] = useState(null);
  const [device, setDevice] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [flashMode, setFlashMode] = useState(false);

  // 🔹 Load VisionCamera secara aman (HANYA SAAT SCREEN DIPAKAI)
  useEffect(() => {
    let mounted = true;

    const loadCamera = async () => {
      try {
        const visionCamera = await import('react-native-vision-camera');
        if (!mounted) return;

        setVisionCamera(visionCamera.Camera);
        setCameraModule(visionCamera);

        const permission = await visionCamera.Camera.requestCameraPermission();
        if (permission !== 'authorized') {
          Alert.alert('Permission required', 'Camera permission is required');
          return;
        }

        const devices = visionCamera.useCameraDevices();
        setDevice(devices.back ?? null);
      } catch (err) {
        console.error('VisionCamera load error:', err);
        Alert.alert(
          'Camera Error',
          'Camera module is not available on this device'
        );
      }
    };

    loadCamera();
    return () => {
      mounted = false;
    };
  }, []);

  // 🔹 QR Scanner
  const codeScanner = useMemo(() => {
    if (!CameraModule) return null;

    return CameraModule.useCodeScanner({
      codeTypes: ['qr'],
      onCodeScanned: async (codes) => {
        if (codes.length > 0 && !scanned) {
          await handleTicketScan(codes[0].value);
        }
      },
    });
  }, [CameraModule, scanned]);

  const handleTicketScan = async (ticketCode) => {
    if (scanned) return;
    setScanned(true);

    try {
      const response = await conductorService.scanTicket(ticketCode);
      setScanResult(response.data);

      Alert.alert(
        'Ticket Valid',
        `Passenger: ${response.data.passenger_name}`,
        [{ text: 'OK', onPress: resetScan }]
      );
    } catch (error) {
      Alert.alert(
        'Scan Failed',
        error.response?.data?.message || 'Invalid ticket',
        [{ text: 'Try Again', onPress: resetScan }]
      );
    }
  };

  const resetScan = () => {
    setScanned(false);
    setScanResult(null);
  };

  if (!VisionCamera || !device) {
    return (
      <SafeAreaView style={styles.loading}>
        <Text style={{ color: '#fff' }}>Initializing camera…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Ticket</Text>
        <TouchableOpacity onPress={() => setFlashMode(!flashMode)}>
          <Icon name={flashMode ? 'flash-on' : 'flash-off'} size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <VisionCamera
        style={{ flex: 1 }}
        device={device}
        isActive
        torch={flashMode ? 'on' : 'off'}
        codeScanner={codeScanner}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  headerTitle: { color: '#fff', fontSize: 18 },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
});
