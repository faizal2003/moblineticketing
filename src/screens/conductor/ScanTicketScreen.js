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

// ─── Color Tokens ─────────────────────────────────────────────────────────────
const C = {
  primary: '#2563EB',
  primaryLight: '#EFF6FF',
  primaryMuted: '#BFDBFE',
  bg: '#FFFFFF',
  surface: '#F8FAFC',
  surfaceAlt: '#F1F5F9',
  border: '#E2E8F0',
  text: '#0F172A',
  textSub: '#64748B',
  textMuted: '#94A3B8',
  green: '#10B981',
  greenLight: '#ECFDF5',
  amber: '#F59E0B',
  amberLight: '#FFFBEB',
  red: '#EF4444',
  redLight: '#FEF2F2',
  white: '#FFFFFF',
  headerBg: '#1E3A5F',
  headerText: '#FFFFFF',
  headerSub: '#93C5FD',
};

const { width } = Dimensions.get('window');

export default function ScanTicketScreen({ route, navigation }) {
  const { scheduleId } = route.params ?? {};

  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [flashMode, setFlashMode] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);

  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');

  const handleTicketScan = useCallback(async (value) => {
    if (loading || scanned || showResultModal) return;
    
    setScanned(true);
    setLoading(true);

    try {
      let ticketCode = value;
      try {
        const parsed = JSON.parse(value);
        if (parsed.ticket_code) {
          ticketCode = parsed.ticket_code;
        }
      } catch (e) {}

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

  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <View style={styles.errorIconWrap}>
          <Icon name="camera-alt" size={56} color={C.textMuted} />
        </View>
        <Text style={styles.errorTitle}>Izin Kamera Diperlukan</Text>
        <Text style={styles.errorText}>Kami memerlukan akses kamera untuk memindai QR Code tiket penumpang.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={requestPermission}>
          <Text style={styles.retryButtonText}>Berikan Izin</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.errorBackButton} onPress={() => navigation.goBack()}>
          <Text style={styles.errorBackButtonText}>Kembali</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!device) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={styles.loadingText}>Mencari kamera...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar hidden />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Icon name="arrow-back" size={24} color={C.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Tiket</Text>
        <TouchableOpacity onPress={() => setFlashMode(!flashMode)} style={styles.headerButton}>
          <Icon name={flashMode ? 'flash-on' : 'flash-off'} size={24} color={C.white} />
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
          <View style={styles.unfocusedContainer}>
            <Text style={styles.scanHint}>Arahkan kamera ke QR Code</Text>
          </View>
          <View style={styles.middleContainer}>
            <View style={styles.unfocusedContainer} />
            <View style={styles.focusedContainer}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
              <View style={styles.scanLine} />
            </View>
            <View style={styles.unfocusedContainer} />
          </View>
          <View style={styles.unfocusedContainer}>
            <Text style={styles.scanText}>Arahkan kamera ke QR Code di tiket penumpang</Text>
          </View>
        </View>
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={styles.loadingOverlayText}>Memvalidasi tiket...</Text>
          </View>
        </View>
      )}

      <Modal
        visible={showResultModal}
        transparent={true}
        animationType="slide"
        onRequestClose={resetScan}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconWrap, { backgroundColor: scanResult?.boarding_status === 'boarded' ? C.greenLight : C.primaryLight }]}>
                <Icon 
                  name={scanResult?.boarding_status === 'boarded' ? 'check-circle' : 'info'} 
                  size={40} 
                  color={scanResult?.boarding_status === 'boarded' ? C.green : C.primary} 
                />
              </View>
              <Text style={styles.modalTitle}>
                {scanResult?.boarding_status === 'boarded' ? 'Valid & Boarded' : 'Tiket Valid'}
              </Text>
              <Text style={styles.modalSubtitle}>
                {scanResult?.boarding_status === 'boarded' ? 'Penumpang sudah terkonfirmasi naik' : 'Penumpang belum naik bus'}
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
                <Text style={styles.infoLabel}>Status</Text>
                <Text style={[styles.infoValue, { color: scanResult?.boarding_status === 'boarded' ? C.green : C.amber }]}>
                  {scanResult?.boarding_status === 'boarded' ? 'Sudah Naik' : '⏳ Belum Naik'}
                </Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.closeButton} onPress={resetScan}>
                <Text style={styles.closeButtonText}>Tutup</Text>
              </TouchableOpacity>
              
              {scanResult?.boarding_status !== 'boarded' && (
                <TouchableOpacity style={styles.confirmButton} onPress={confirmBoarding}>
                  <Icon name="check" size={20} color={C.white} />
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
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: C.white,
    marginTop: 10,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  headerButton: {
    padding: 6,
  },
  headerTitle: {
    color: C.white,
    fontSize: 17,
    fontWeight: '700',
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
    backgroundColor: 'rgba(0,0,0,0.6)',
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
    width: 30,
    height: 30,
    borderColor: C.primary,
    borderWidth: 3,
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
  scanLine: {
    position: 'absolute',
    top: '50%',
    left: '10%',
    right: '10%',
    height: 2,
    backgroundColor: C.primary,
    opacity: 0.8,
  },
  scanHint: {
    color: C.white,
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.8,
  },
  scanText: {
    color: C.white,
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 30,
    marginTop: 10,
    opacity: 0.9,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    minWidth: 200,
  },
  loadingOverlayText: {
    color: C.text,
    marginTop: 12,
    fontSize: 15,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: C.white,
    padding: 24,
  },
  errorIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.text,
    marginTop: 20,
  },
  errorText: {
    fontSize: 14,
    color: C.textSub,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  retryButton: {
    backgroundColor: C.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  retryButtonText: {
    color: C.white,
    fontWeight: '700',
    fontSize: 15,
  },
  errorBackButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 10,
  },
  errorBackButtonText: {
    color: C.textSub,
    fontWeight: '600',
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: C.white,
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    padding: 24,
    alignItems: 'center',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.text,
  },
  modalSubtitle: {
    fontSize: 13,
    color: C.textSub,
    marginTop: 4,
  },
  resultInfo: {
    width: '100%',
    marginBottom: 20,
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoLabel: {
    fontSize: 13,
    color: C.textSub,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text,
    flex: 1,
    textAlign: 'right',
  },
  seatValue: {
    fontSize: 16,
    color: C.primary,
  },
  modalActions: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  closeButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: C.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  closeButtonText: {
    color: C.textSub,
    fontWeight: '600',
    fontSize: 15,
  },
  confirmButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: C.green,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmButtonText: {
    color: C.white,
    fontWeight: '700',
    fontSize: 15,
    marginLeft: 8,
  },
});