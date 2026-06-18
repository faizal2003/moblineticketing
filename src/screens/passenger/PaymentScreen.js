import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
  Modal,
  Animated,
  Dimensions,
  Platform,
  TextInput,
  Image,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import Clipboard from '@react-native-clipboard/clipboard';

import { useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import {
  processPayment,
  verifyPayment,
  updatePaymentInfo,
  updateBookingStatus,
  fetchBookingHistory,
  selectCurrentBooking,
  selectPaymentInfo,
  selectLoading,
  selectError,
  clearError,
  clearCurrentBooking,
} from '../../store/slices/bookingSlice';

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

const { width, height } = Dimensions.get('window');

const PaymentScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();

  // Get state from Redux
  const currentBooking = useSelector(selectCurrentBooking);
  const paymentInfo = useSelector(selectPaymentInfo);
  const loading = useSelector(selectLoading);
  const error = useSelector(selectError);

  const [processing, setProcessing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('bank_transfer');
  const [showQRModal, setShowQRModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [countdown, setCountdown] = useState(300);
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    cardExpiry: '',
    cardCVC: '',
    cardName: '',
  });
  const [selectedBank, setSelectedBank] = useState('bca');
  const [showVAModal, setShowVAModal] = useState(false);
  const [showEwalletModal, setShowEwalletModal] = useState(false);
  const [paymentSteps, setPaymentSteps] = useState([
    { id: 1, title: 'Pilih Metode', completed: true, active: true },
    { id: 2, title: 'Bayar', completed: false, active: false },
    { id: 3, title: 'Konfirmasi', completed: false, active: false },
  ]);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const bookingData = route.params?.bookingData || {};
  // Lock the total amount once on mount. currentBooking can be cleared after
  // a successful payment (clearCurrentBooking), which would otherwise reset
  // the displayed price to 0.
  const [totalAmount] = useState(
    () => route.params?.totalAmount || currentBooking.totalAmount || 0,
  );
  const [bookingId] = useState(
    () => route.params?.bookingId || currentBooking.id,
  );

  const defaultBookingData = {
    busName: currentBooking.busName || 'Sinar Jaya Executive',
    departure: currentBooking.departure || 'Jakarta',
    destination: currentBooking.destination || 'Bandung',
    departureDate:
      currentBooking.departureDate || new Date().toLocaleDateString('id-ID'),
    departureTime: currentBooking.departureTime || '08:00',
    passengerCount: currentBooking.passengerCount || 1,
    selectedSeats: currentBooking.seats?.map(s => s.number) || ['A1'],
    total: totalAmount,
  };

  const booking = { ...defaultBookingData, ...bookingData };
  const serviceFee = 5000;
  const tax = (totalAmount - serviceFee) * 0.1;
  const subtotal = totalAmount - serviceFee - tax;

  const paymentMethods = [
    {
      id: 'bank_transfer',
      name: 'Transfer Bank',
      icon: 'university',
      type: FontAwesome5,
      description: 'BCA, Mandiri, BRI, BNI',
      color: C.primary,
      popular: true,
    },
    {
      id: 'e_wallet',
      name: 'E-Wallet',
      icon: 'mobile-alt',
      type: FontAwesome5,
      description: 'GoPay, OVO, DANA, ShopeePay',
      color: C.amber,
      popular: true,
    },
    {
      id: 'cash',
      name: 'Bayar di Tempat',
      icon: 'money-bill-wave',
      type: FontAwesome5,
      description: 'Bayar ke admin/petugas',
      color: C.textSub,
      popular: false,
    },
  ];

  const banks = [
    {
      id: 'bca',
      name: 'Bank Central Asia (BCA)',
      code: '014',
      accountNumber: '1234567890',
      accountName: 'PT Bus Ticketing Indonesia',
    },
    {
      id: 'mandiri',
      name: 'Bank Mandiri',
      code: '008',
      accountNumber: '0987654321',
      accountName: 'PT Bus Ticketing Indonesia',
    },
    {
      id: 'bri',
      name: 'Bank BRI',
      code: '002',
      accountNumber: '1122334455',
      accountName: 'PT Bus Ticketing Indonesia',
    },
  ];

  useEffect(() => {
    if (paymentInfo) {
      setSelectedMethod(paymentInfo);
    }

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          Alert.alert(
            'Waktu Habis',
            'Waktu pembayaran telah habis. Silakan lakukan pemesanan ulang.',
            [
              {
                text: 'OK',
                onPress: () => navigation.navigate('SearchBus'),
              },
            ],
          );
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    return () => clearInterval(timer);
    // Run once on mount: start the countdown timer and fade-in animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const formatTime = seconds => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  const copyToClipboard = text => {
    Clipboard.setString(text);
    Alert.alert('Sukses', 'Nomor Virtual Account berhasil disalin!');
  };

  const handleVerify = async () => {
    if (!currentBooking?.payment_id) return;

    try {
      setProcessing(true);
      const res = await dispatch(
        verifyPayment(currentBooking.payment_id),
      ).unwrap();
      setProcessing(false);

      if (res.data && res.data.status === 'success') {
        setShowVAModal(false);
        setShowEwalletModal(false);
        setShowSuccess(true);
      } else {
        Alert.alert(
          'Status Pembayaran',
          'Pembayaran belum diterima. Silakan selesaikan pembayaran dan cek kembali.',
        );
      }
    } catch (error) {
      setProcessing(false);
      Alert.alert('Error', 'Gagal mengecek status pembayaran.');
    }
  };

  const handlePayment = async () => {
    if (selectedMethod === 'cash') {
      Alert.alert(
        'Pembayaran di Tempat',
        'Anda memilih pembayaran di tempat. Silakan bayar kepada admin/petugas di terminal atau saat naik bus. Pemesanan akan dikonfirmasi setelah admin memverifikasi pembayaran Anda.',
        [
          { text: 'Batalkan', style: 'cancel' },
          {
            text: 'Konfirmasi',
            onPress: async () => {
              await processCashPayment();
            },
          },
        ],
      );
      return;
    }

    if (selectedMethod === 'credit_card') {
      if (!validateCardDetails()) {
        return;
      }
    }

    setProcessing(true);

    try {
      const paymentData = {
        payment_method: selectedMethod,
        amount: totalAmount,
        ...(selectedMethod === 'credit_card' && {
          card_details: cardDetails,
        }),
        ...(selectedMethod === 'bank_transfer' && {
          bank: selectedBank,
        }),
      };

      const res = await dispatch(
        processPayment({
          bookingId: bookingId,
          paymentData: paymentData,
        }),
      ).unwrap();

      updatePaymentSteps(3);

      if (res.data && res.data.midtrans) {
        setProcessing(false);
        // E-wallet / QRIS returns a scannable QR code (and a deeplink);
        // bank transfer returns a virtual account number.
        if (
          res.data.qr_code_url ||
          res.data.deeplink_url ||
          selectedMethod === 'e_wallet'
        ) {
          setShowEwalletModal(true);
        } else {
          setShowVAModal(true);
        }
      } else {
        await handlePaymentSuccess();
      }
    } catch (error) {
      setProcessing(false);
      Alert.alert('Error', error || 'Pembayaran gagal. Silakan coba lagi.');
    }
  };

  const processCashPayment = async () => {
    setProcessing(true);

    try {
      const paymentData = {
        payment_method: 'cash',
        amount: totalAmount,
      };

      await dispatch(
        processPayment({
          bookingId: bookingId,
          paymentData: paymentData,
        }),
      ).unwrap();

      setProcessing(false);
      updatePaymentSteps(3);

      // Show pending payment success for cash
      Alert.alert(
        'Pemesanan Berhasil',
        'Pemesanan Anda telah dibuat. Silakan bayar kepada admin/petugas di terminal atau saat naik bus. Pemesanan akan dikonfirmasi setelah pembayaran diterima.',
        [
          {
            text: 'Lihat Tiket',
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'PassengerHome' }, { name: 'MyTickets' }],
              });
            },
          },
        ],
      );
    } catch (error) {
      setProcessing(false);
      Alert.alert('Error', 'Gagal memproses pembayaran.');
    }
  };

  const handlePaymentSuccess = async () => {
    setProcessing(false);
    setShowSuccess(true);

    // Refresh history
    dispatch(fetchBookingHistory());

    // Clear current booking if successful
    dispatch(clearCurrentBooking());
  };

  const validateCardDetails = () => {
    if (!cardDetails.cardNumber.trim() || cardDetails.cardNumber.length < 16) {
      Alert.alert('Error', 'Nomor kartu tidak valid');
      return false;
    }

    if (
      !cardDetails.cardExpiry.trim() ||
      !/^\d{2}\/\d{2}$/.test(cardDetails.cardExpiry)
    ) {
      Alert.alert('Error', 'Tanggal kadaluarsa tidak valid (MM/YY)');
      return false;
    }

    if (!cardDetails.cardCVC.trim() || cardDetails.cardCVC.length < 3) {
      Alert.alert('Error', 'CVC tidak valid');
      return false;
    }

    if (!cardDetails.cardName.trim()) {
      Alert.alert('Error', 'Nama pemegang kartu harus diisi');
      return false;
    }

    return true;
  };

  const updatePaymentSteps = stepIndex => {
    const updatedSteps = paymentSteps.map((step, index) => ({
      ...step,
      completed: index < stepIndex,
      active: index === stepIndex - 1,
    }));
    setPaymentSteps(updatedSteps);
  };

  const renderPaymentStep = step => (
    <View key={step.id} style={styles.stepContainer}>
      <View
        style={[
          styles.stepCircle,
          step.completed && styles.stepCircleCompleted,
          step.active && styles.stepCircleActive,
        ]}
      >
        {step.completed ? (
          <Ionicons name="checkmark" size={16} color={C.white} />
        ) : (
          <Text
            style={[styles.stepNumber, step.active && styles.stepNumberActive]}
          >
            {step.id}
          </Text>
        )}
      </View>
      <Text
        style={[
          styles.stepTitle,
          step.active && styles.stepTitleActive,
          step.completed && styles.stepTitleCompleted,
        ]}
      >
        {step.title}
      </Text>
    </View>
  );

  const renderPaymentMethod = method => {
    const IconComponent = method.type;
    return (
      <TouchableOpacity
        key={method.id}
        style={[
          styles.paymentMethodCard,
          selectedMethod === method.id && styles.paymentMethodSelected,
        ]}
        onPress={() => setSelectedMethod(method.id)}
      >
        <View style={styles.methodLeft}>
          <View
            style={[
              styles.methodIcon,
              { backgroundColor: `${method.color}20` },
            ]}
          >
            <IconComponent name={method.icon} size={22} color={method.color} />
          </View>
          <View style={styles.methodInfo}>
            <Text style={styles.methodName}>{method.name}</Text>
            <Text style={styles.methodDescription}>{method.description}</Text>
          </View>
        </View>
        <View style={styles.methodRight}>
          {method.popular && (
            <View style={styles.popularBadge}>
              <Text style={styles.popularText}>POPULAR</Text>
            </View>
          )}
          {selectedMethod === method.id && (
            <View style={styles.checkmarkCircle}>
              <Ionicons name="checkmark" size={14} color={C.white} />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderInstruction = () => {
    switch (selectedMethod) {
      case 'bank_transfer':
        return (
          <View style={styles.instructionCard}>
            <Text style={styles.instructionTitle}>Pilih Bank Tujuan:</Text>
            {banks.map(bank => (
              <TouchableOpacity
                key={bank.id}
                style={[
                  styles.bankCard,
                  selectedBank === bank.id && styles.bankCardSelected,
                ]}
                onPress={() => setSelectedBank(bank.id)}
              >
                <View style={styles.bankHeader}>
                  <View
                    style={[styles.bankLogo, { backgroundColor: C.primary }]}
                  >
                    <Text style={styles.bankInitials}>
                      {bank.name.substring(0, 2)}
                    </Text>
                  </View>
                  <View style={styles.bankInfo}>
                    <Text style={styles.bankName}>{bank.name}</Text>
                    <Text style={styles.bankCode}>
                      Proses Cepat via Virtual Account
                    </Text>
                  </View>
                  <View>
                    {selectedBank === bank.id && (
                      <View style={styles.checkmarkCircle}>
                        <Ionicons name="checkmark" size={14} color={C.white} />
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'credit_card':
        return (
          <View style={styles.instructionCard}>
            <Text style={styles.instructionTitle}>Informasi Kartu Kredit:</Text>

            <TextInput
              style={styles.cardInput}
              placeholder="Nomor Kartu"
              placeholderTextColor={C.textMuted}
              value={cardDetails.cardNumber}
              onChangeText={text =>
                setCardDetails({ ...cardDetails, cardNumber: text })
              }
              keyboardType="numeric"
              maxLength={16}
            />

            <View style={styles.cardRow}>
              <TextInput
                style={[styles.cardInput, { flex: 2 }]}
                placeholder="MM/YY"
                placeholderTextColor={C.textMuted}
                value={cardDetails.cardExpiry}
                onChangeText={text =>
                  setCardDetails({ ...cardDetails, cardExpiry: text })
                }
                maxLength={5}
              />
              <TextInput
                style={[styles.cardInput, { flex: 1, marginLeft: 8 }]}
                placeholder="CVC"
                placeholderTextColor={C.textMuted}
                value={cardDetails.cardCVC}
                onChangeText={text =>
                  setCardDetails({ ...cardDetails, cardCVC: text })
                }
                keyboardType="numeric"
                maxLength={3}
              />
            </View>

            <TextInput
              style={styles.cardInput}
              placeholder="Nama Pemegang Kartu"
              placeholderTextColor={C.textMuted}
              value={cardDetails.cardName}
              onChangeText={text =>
                setCardDetails({ ...cardDetails, cardName: text })
              }
              autoCapitalize="words"
            />

            <View style={styles.securityNote}>
              <Ionicons name="lock-closed" size={14} color={C.green} />
              <Text style={styles.securityText}>
                Informasi kartu Anda aman dan terenkripsi
              </Text>
            </View>
          </View>
        );

      case 'e_wallet':
        return (
          <View style={styles.instructionCard}>
            <Text style={styles.instructionTitle}>E-Wallet:</Text>
            <Text style={styles.instructionText}>
              Pilih metode e-wallet di atas, lalu scan QR code yang akan muncul
            </Text>
          </View>
        );

      default:
        return (
          <View style={styles.instructionCard}>
            <Text style={styles.instructionText}>
              Pilih metode pembayaran untuk melihat instruksi pembayaran.
            </Text>
          </View>
        );
    }
  };

  if (loading && !processing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={styles.loadingText}>Menyiapkan pembayaran...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={C.headerBg}
        translucent={false}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={C.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pembayaran</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.helpButton}>
            <Ionicons
              name="help-circle-outline"
              size={24}
              color={C.headerText}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.timerContainer}>
          <View style={styles.timerCard}>
            <Ionicons name="time-outline" size={22} color={C.amber} />
            <View style={styles.timerInfo}>
              <Text style={styles.timerLabel}>Selesaikan dalam</Text>
              <Text style={styles.timerValue}>{formatTime(countdown)}</Text>
            </View>
          </View>
          <View style={styles.bookingIdCard}>
            <Text style={styles.bookingIdLabel}>ID Pemesanan</Text>
            <Text style={styles.bookingIdValue}>{bookingId}</Text>
          </View>
        </View>

        <View style={styles.stepsContainer}>
          {paymentSteps.map(renderPaymentStep)}
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Ringkasan Pemesanan</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Bus</Text>
            <Text style={styles.summaryValue}>{booking.busName}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Rute</Text>
            <Text style={styles.summaryValue}>
              {booking.departure} → {booking.destination}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tanggal & Waktu</Text>
            <Text style={styles.summaryValue}>
              {booking.departureDate} | {booking.departureTime}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Penumpang</Text>
            <Text style={styles.summaryValue}>
              {booking.passengerCount} orang
            </Text>
          </View>
          {booking.selectedSeats && booking.selectedSeats.length > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Kursi</Text>
              <Text style={styles.summaryValue}>
                {booking.selectedSeats.join(', ')}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pilih Metode Pembayaran</Text>
          {paymentMethods.map(renderPaymentMethod)}
        </View>

        {renderInstruction()}

        <View style={styles.priceCard}>
          <Text style={styles.priceTitle}>Rincian Pembayaran</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Subtotal</Text>
            <Text style={styles.priceValue}>
              Rp {subtotal.toLocaleString('id-ID')}
            </Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Pajak (10%)</Text>
            <Text style={styles.priceValue}>
              Rp {tax.toLocaleString('id-ID')}
            </Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Biaya Layanan</Text>
            <Text style={styles.priceValue}>
              Rp {serviceFee.toLocaleString('id-ID')}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Pembayaran</Text>
            <Text style={styles.totalValue}>
              Rp {booking.total.toLocaleString('id-ID')}
            </Text>
          </View>
        </View>

        <View style={styles.securityCard}>
          <View style={styles.securityHeader}>
            <Ionicons name="shield-checkmark" size={18} color={C.green} />
            <Text style={styles.securityTitle}>Pembayaran 100% Aman</Text>
          </View>
          <Text style={styles.securityTextFull}>
            • Transaksi dienkripsi dengan teknologi SSL{'\n'}• Uang akan ditahan
            sampai tiket diterbitkan{'\n'}• Garansi uang kembali jika terjadi
            kendala{'\n'}• Dukungan customer service 24/7
          </Text>
        </View>

        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.payButton, processing && styles.payButtonDisabled]}
            onPress={handlePayment}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator color={C.white} />
            ) : (
              <>
                <Text style={styles.payButtonText}>
                  Bayar Rp {booking.total.toLocaleString('id-ID')}
                </Text>
                <Ionicons
                  name="lock-closed"
                  size={18}
                  color={C.white}
                  style={styles.lockIcon}
                />
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={() => navigation.navigate('MyTickets')}
          >
            <Text style={styles.saveButtonText}>Lihat Tiket Saya</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={showQRModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowQRModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Scan QR Code</Text>
              <TouchableOpacity
                onPress={() => setShowQRModal(false)}
                disabled={processing}
              >
                <Ionicons name="close" size={24} color={C.textSub} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalContent}>
              <View style={styles.qrContainer}>
                <View style={styles.qrPlaceholder}>
                  <Text style={styles.qrText}>QR Code</Text>
                  <Text style={styles.qrSubtext}>
                    Scan dengan aplikasi e-wallet
                  </Text>
                </View>
              </View>
              <Text style={styles.modalInstruction}>
                Buka aplikasi e-wallet Anda dan scan QR code di atas
              </Text>
              <View style={styles.timerModal}>
                <Ionicons name="time-outline" size={18} color={C.amber} />
                <Text style={styles.timerModalText}>
                  Berlaku selama {formatTime(countdown)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => {
                  setShowQRModal(false);
                  updatePaymentSteps(3);
                }}
                disabled={processing}
              >
                <Text style={styles.doneButtonText}>Sudah Bayar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {showVAModal && (
        <View style={styles.successOverlay}>
          <Animated.View
            style={[styles.successContainer, { opacity: fadeAnim }]}
          >
            <View style={styles.successIcon}>
              <Ionicons name="card" size={64} color={C.primary} />
            </View>
            <Text style={styles.successTitle}>Menunggu Pembayaran</Text>
            <Text style={styles.successMessage}>
              Silakan selesaikan pembayaran ke Virtual Account berikut:
            </Text>

            <View style={[styles.bankCard, styles.vaCard]}>
              <Text style={styles.vaLabel}>Nomor Virtual Account</Text>
              <View style={styles.vaRow}>
                <Text style={styles.vaNumber}>
                  {currentBooking?.midtrans?.va_numbers?.[0]?.va_number || '-'}
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    copyToClipboard(
                      currentBooking?.midtrans?.va_numbers?.[0]?.va_number ||
                        '',
                    )
                  }
                >
                  <Ionicons name="copy-outline" size={22} color={C.primary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.vaBank}>
                Bank{' '}
                {currentBooking?.midtrans?.va_numbers?.[0]?.bank?.toUpperCase() ||
                  '-'}
              </Text>
            </View>

            <View style={styles.successActions}>
              <TouchableOpacity
                style={styles.viewTicketButton}
                onPress={handleVerify}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator color={C.white} />
                ) : (
                  <Text style={styles.viewTicketText}>
                    Cek Status Pembayaran
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backHomeButton}
                onPress={() => {
                  setShowVAModal(false);
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'PassengerHome' }],
                  });
                }}
              >
                <Text style={styles.backHomeText}>Tutup</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      )}

      {/* E-Wallet / QRIS Overlay */}
      {showEwalletModal && (
        <View style={styles.successOverlay}>
          <Animated.View
            style={[styles.successContainer, { opacity: fadeAnim }]}
          >
            <View style={styles.successIcon}>
              <FontAwesome5 name="qrcode" size={64} color={C.amber} />
            </View>
            <Text style={styles.successTitle}>Selesaikan Pembayaran</Text>
            <Text style={styles.successMessage}>
              Scan QR code berikut dengan aplikasi e-wallet (GoPay, OVO, DANA,
              ShopeePay) atau aplikasi bank yang mendukung QRIS.
            </Text>

            {currentBooking?.qr_code_url ? (
              <View style={styles.qrImageWrapper}>
                <Image
                  source={{ uri: currentBooking.qr_code_url }}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
              </View>
            ) : (
              <View style={styles.qrImageWrapper}>
                <ActivityIndicator size="large" color={C.amber} />
                <Text style={styles.qrSubtext}>Menyiapkan QR code...</Text>
              </View>
            )}

            <Text style={styles.ewalletAmount}>
              Rp {totalAmount.toLocaleString('id-ID')}
            </Text>

            <View style={styles.timerModal}>
              <Ionicons name="time-outline" size={20} color={C.amber} />
              <Text style={styles.timerModalText}>
                Berlaku selama {formatTime(countdown)}
              </Text>
            </View>

            <View style={styles.successActions}>
              {currentBooking?.deeplink_url && (
                <TouchableOpacity
                  style={[
                    styles.viewTicketButton,
                    { backgroundColor: C.amber },
                  ]}
                  onPress={() => Linking.openURL(currentBooking.deeplink_url)}
                  disabled={processing}
                >
                  <Text style={styles.viewTicketText}>
                    Buka Aplikasi E-Wallet
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.viewTicketButton}
                onPress={handleVerify}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator color={C.white} />
                ) : (
                  <Text style={styles.viewTicketText}>
                    Cek Status Pembayaran
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backHomeButton}
                onPress={() => {
                  setShowEwalletModal(false);
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'PassengerHome' }],
                  });
                }}
              >
                <Text style={styles.backHomeText}>Tutup</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      )}

      {/* Success Overlay */}
      {showSuccess && (
        <View style={styles.successOverlay}>
          <Animated.View
            style={[styles.successContainer, { opacity: fadeAnim }]}
          >
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={64} color={C.green} />
            </View>
            <Text style={styles.successTitle}>Pembayaran Berhasil!</Text>
            <Text style={styles.successMessage}>
              Tiket Anda telah diterbitkan. Anda dapat melihatnya di menu 'Tiket
              Saya'.
            </Text>

            <View style={styles.successActions}>
              <TouchableOpacity
                style={styles.viewTicketButton}
                onPress={() => {
                  setShowSuccess(false);
                  navigation.reset({
                    index: 1,
                    routes: [
                      { name: 'PassengerHome' },
                      {
                        name: 'TicketDetail',
                        params: { ticket: { id: bookingId } },
                      },
                    ],
                  });
                }}
              >
                <Text style={styles.viewTicketText}>Lihat Tiket</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backHomeButton}
                onPress={() => {
                  setShowSuccess(false);
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'PassengerHome' }],
                  });
                }}
              >
                <Text style={styles.backHomeText}>Kembali ke Beranda</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.headerBg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: C.surface,
  },
  loadingText: {
    marginTop: 10,
    color: C.textSub,
    fontSize: 15,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.headerBg,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.headerText,
  },
  headerRight: {
    flexDirection: 'row',
  },
  helpButton: {
    padding: 4,
  },
  scrollContent: {
    paddingBottom: 24,
    backgroundColor: C.surface,
  },
  timerContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 8,
  },
  timerCard: {
    flex: 1,
    backgroundColor: C.amberLight,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerInfo: {
    marginLeft: 12,
  },
  timerLabel: {
    fontSize: 11,
    color: C.amber,
    fontWeight: '500',
  },
  timerValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: C.amber,
    marginTop: 1,
  },
  bookingIdCard: {
    backgroundColor: C.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  bookingIdLabel: {
    fontSize: 10,
    color: C.textSub,
    fontWeight: '500',
  },
  bookingIdValue: {
    fontSize: 13,
    fontWeight: '700',
    color: C.text,
    marginTop: 1,
  },
  stepsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  stepContainer: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepCircleCompleted: {
    backgroundColor: C.green,
  },
  stepCircleActive: {
    backgroundColor: C.primary,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textSub,
  },
  stepNumberActive: {
    color: C.white,
  },
  stepTitle: {
    fontSize: 11,
    color: C.textSub,
    textAlign: 'center',
  },
  stepTitleActive: {
    color: C.primary,
    fontWeight: '600',
  },
  stepTitleCompleted: {
    color: C.green,
  },
  summaryCard: {
    backgroundColor: C.white,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: C.textSub,
  },
  summaryValue: {
    fontSize: 13,
    color: C.text,
    fontWeight: '500',
  },
  section: {
    backgroundColor: C.white,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
    marginBottom: 12,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  paymentMethodSelected: {
    borderColor: C.primary,
    backgroundColor: C.primaryLight,
  },
  methodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  methodIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
  },
  methodDescription: {
    fontSize: 12,
    color: C.textSub,
    marginTop: 1,
  },
  methodRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  popularBadge: {
    backgroundColor: C.amber,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  popularText: {
    fontSize: 9,
    color: C.white,
    fontWeight: 'bold',
  },
  checkmarkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionCard: {
    backgroundColor: C.white,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  instructionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 14,
    color: C.textSub,
    lineHeight: 20,
  },
  bankCard: {
    backgroundColor: C.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  bankCardSelected: {
    borderColor: C.primary,
    backgroundColor: C.primaryLight,
  },
  bankHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bankLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bankInitials: {
    color: C.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  bankInfo: {
    flex: 1,
  },
  bankName: {
    fontSize: 14,
    fontWeight: '500',
    color: C.text,
  },
  bankCode: {
    fontSize: 11,
    color: C.textSub,
    marginTop: 1,
  },
  cardInput: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: C.text,
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: 'row',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  securityText: {
    fontSize: 12,
    color: C.green,
    marginLeft: 8,
  },
  priceCard: {
    backgroundColor: C.white,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  priceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  priceLabel: {
    fontSize: 13,
    color: C.textSub,
  },
  priceValue: {
    fontSize: 13,
    color: C.text,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: C.primary,
  },
  securityCard: {
    backgroundColor: C.greenLight,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 14,
    padding: 16,
  },
  securityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: C.green,
    marginLeft: 8,
  },
  securityTextFull: {
    fontSize: 12,
    color: C.green,
    lineHeight: 18,
    marginLeft: 26,
  },
  actionContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  payButton: {
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 12,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  payButtonDisabled: {
    backgroundColor: C.primaryMuted,
    shadowOpacity: 0,
    elevation: 0,
  },
  payButtonText: {
    color: C.white,
    fontSize: 15,
    fontWeight: '700',
  },
  lockIcon: {
    marginLeft: 8,
  },
  saveButton: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    color: C.textSub,
    fontSize: 15,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: C.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
  },
  modalContent: {
    padding: 24,
    alignItems: 'center',
  },
  qrContainer: {
    width: 180,
    height: 180,
    backgroundColor: C.surface,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  qrPlaceholder: {
    alignItems: 'center',
  },
  qrText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: C.text,
  },
  qrSubtext: {
    fontSize: 11,
    color: C.textSub,
    marginTop: 6,
  },
  qrImageWrapper: {
    width: 220,
    height: 220,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEE',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginVertical: 16,
    padding: 8,
  },
  qrImage: {
    width: '100%',
    height: '100%',
  },
  ewalletAmount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalInstruction: {
    fontSize: 14,
    color: C.textSub,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  timerModal: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  timerModalText: {
    fontSize: 14,
    color: C.amber,
    fontWeight: '500',
    marginLeft: 8,
  },
  doneButton: {
    backgroundColor: C.green,
    borderRadius: 10,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  doneButtonText: {
    color: C.white,
    fontSize: 15,
    fontWeight: '600',
  },
  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successContainer: {
    alignItems: 'center',
    padding: 32,
    width: '100%',
  },
  successIcon: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: C.text,
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 14,
    color: C.textSub,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  vaCard: {
    width: '100%',
    backgroundColor: C.surfaceAlt,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  vaLabel: {
    fontSize: 12,
    color: C.textSub,
    textAlign: 'center',
  },
  vaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    gap: 10,
  },
  vaNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: C.text,
    letterSpacing: 1,
  },
  vaBank: {
    fontSize: 13,
    color: C.primary,
    textAlign: 'center',
    marginTop: 6,
    fontWeight: '500',
  },
  successActions: {
    width: '100%',
    gap: 10,
  },
  viewTicketButton: {
    backgroundColor: C.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  viewTicketText: {
    color: C.white,
    fontSize: 15,
    fontWeight: '600',
  },
  backHomeButton: {
    backgroundColor: C.white,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    width: '100%',
  },
  backHomeText: {
    color: C.textSub,
    fontSize: 15,
    fontWeight: '600',
  },
});

export default PaymentScreen;
