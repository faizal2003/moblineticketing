import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Camera, useCameraDevice, useCodeScanner, useCameraPermission } from 'react-native-vision-camera';
import { conductorService } from '../../services/conductorService';

const { width } = Dimensions.get('window');

export default function ScanTicketScreen({ route, navigation }) {
  const { scheduleId } = route.params ?? {};

  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [flashMode, setFlashMode] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);

  // 1. Handle Permissions
  const { hasPermission, requestPermission } = useCameraPermission();

  // 2. Get Device
  const device = useCameraDevice('back');

  // 3. Handle Scan Logic
  const handleTicketScan = useCallback(async (value) => {
    if (loading || scanned || showResultModal) return;
    
    setScanned(true);
    setLoading(true);

    try {
      let ticketCode = value;
      // Try to parse if value is JSON
      try {
        const parsed = JSON.parse(value);
        if (parsed.ticket_code) {
          ticketCode = parsed.ticket_code;
        }
      } catch (e) {
        // Not a JSON, use as is
      }

      const response = await conductorService.scanTicket(ticketCode);
      setScanResult(response.data.data);
      setShowResultModal(true);
    } catch (error) {
      console.error('Scan error:', error);
      const errorMsg = error.response?.data?.message || 'Tiket tidak valid atau tidak ditemukan';
      Alert.alert('Scan Gagal', errorMsg, [
        { text: 'Coba Lagi', onPress: resetScan }
      ]);
    } finally {
      setLoading(false);
    }
  }, [loading, scanned, showResultModal]);

  // 4. Configure Scanner
  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: (codes) => {
      if (codes.length > 0) {
        handleTicketScan(codes[0].value);
      }
    },
  });

  const resetScan = () => {
    setScanned(false);
    setScanResult(null);
    setShowResultModal(false);
  };

  const confirmBoarding = () => {
    Alert.alert('Berhasil', 'Penumpang telah dikonfirmasi naik bus', [
      { text: 'OK', onPress: resetScan }
    ]);
  };

  // Permission Request UI
  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Icon name="camera-alt" size={64} color="#666" />
        <Text style={styles.errorText}>Izin kamera diperlukan untuk memindai tiket.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={requestPermission}>
          <Text style={styles.retryButtonText}>Berikan Izin</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.retryButton, {marginTop: 10, backgroundColor: '#666'}]} onPress={() => navigation.goBack()}>
          <Text style={styles.retryButtonText}>Kembali</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!device) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={{ color: '#fff', marginTop: 10 }}>Mencari kamera…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar hidden />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Tiket</Text>
        <TouchableOpacity onPress={() => setFlashMode(!flashMode)} style={styles.flashButton}>
          <Icon name={flashMode ? 'flash-on' : 'flash-off'} size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.cameraContainer}>
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={!showResultModal && !loading}
          torch={flashMode ? 'on' : 'off'}
          codeScanner={codeScanner}
        />
        <View style={styles.overlay}>
          <View style={styles.unfocusedContainer}></View>
          <View style={styles.middleContainer}>
            <View style={styles.unfocusedContainer}></View>
            <View style={styles.focusedContainer}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            <View style={styles.unfocusedContainer}></View>
          </View>
          <View style={styles.unfocusedContainer}>
            <Text style={styles.scanText}>Arahkan kamera ke QR Code di tiket penumpang</Text>
          </View>
        </View>
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#1E88E5" />
          <Text style={styles.loadingText}>Memvalidasi tiket...</Text>
        </View>
      )}

      {/* Result Modal */}
      <Modal
        visible={showResultModal}
        transparent={true}
        animationType="slide"
        onRequestClose={resetScan}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Icon 
                name={scanResult?.boarding_status === 'boarded' ? 'check-circle' : 'info'} 
                size={48} 
                color={scanResult?.boarding_status === 'boarded' ? '#4CAF50' : '#1E88E5'} 
              />
              <Text style={styles.modalTitle}>
                {scanResult?.boarding_status === 'boarded' ? 'Valid & Boarded' : 'Tiket Valid'}
              </Text>
            </View>

            <View style={styles.resultInfo}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Penumpang</Text>
                <Text style={styles.infoValue}>{scanResult?.passenger?.name}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Kursi</Text>
                <Text style={[styles.infoValue, styles.seatValue]}>{scanResult?.passenger?.seat_number}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Rute</Text>
                <Text style={styles.infoValue}>{scanResult?.schedule?.departure_city} → {scanResult?.schedule?.arrival_city}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Bus</Text>
                <Text style={styles.infoValue}>{scanResult?.schedule?.bus_name}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Status Boarding</Text>
                <Text style={[styles.infoValue, { color: scanResult?.boarding_status === 'boarded' ? '#4CAF50' : '#FF9800' }]}>
                  {scanResult?.boarding_status === 'boarded' ? 'Sudah Naik' : 'Belum Naik'}
                </Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.closeButton} onPress={resetScan}>
                <Text style={styles.closeButtonText}>Selesai</Text>
              </TouchableOpacity>
              
              {scanResult?.boarding_status !== 'boarded' && (
                <TouchableOpacity style={styles.confirmButton} onPress={confirmBoarding}>
                  <Text style={styles.confirmButtonText}>Konfirmasi Naik</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backButton: { padding: 8 },
  flashButton: { padding: 8 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  retryButton: {
    backgroundColor: '#1E88E5',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  cameraContainer: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  unfocusedContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  middleContainer: {
    flexDirection: 'row',
    height: width * 0.7,
  },
  focusedContainer: {
    width: width * 0.7,
    height: width * 0.7,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#1E88E5',
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  scanText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginTop: 20,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    padding: 24,
    alignItems: 'center',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  resultInfo: {
    width: '100%',
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  seatValue: {
    fontSize: 18,
    color: '#1E88E5',
  },
  modalActions: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  closeButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#666',
    fontWeight: 'bold',
    fontSize: 16,
  },
  confirmButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#1E88E5',
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});