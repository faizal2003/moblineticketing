import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
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
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';

import { useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import {
  processPayment,
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
  const [countdown, setCountdown] = useState(300); // 5 minutes in seconds
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    cardExpiry: '',
    cardCVC: '',
    cardName: '',
  });
  const [paymentSteps, setPaymentSteps] = useState([
    { id: 1, title: 'Pilih Metode', completed: true, active: true },
    { id: 2, title: 'Bayar', completed: false, active: false },
    { id: 3, title: 'Konfirmasi', completed: false, active: false },
  ]);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Booking data from params or Redux
  const bookingData = route.params?.bookingData || {};
  const totalAmount = route.params?.totalAmount || currentBooking.totalAmount || 0;
  const bookingId = route.params?.bookingId || currentBooking.id;

  // Default booking data
  const defaultBookingData = {
    busName: currentBooking.busName || 'Sinar Jaya Executive',
    departure: currentBooking.departure || 'Jakarta',
    destination: currentBooking.destination || 'Bandung',
    departureDate: currentBooking.departureDate || new Date().toLocaleDateString('id-ID'),
    departureTime: currentBooking.departureTime || '08:00',
    passengerCount: currentBooking.passengerCount || 1,
    selectedSeats: currentBooking.seats?.map(s => s.number) || ['A1'],
    total: totalAmount,
  };

  const booking = { ...defaultBookingData, ...bookingData };

  // Recalculate breakdown based on total
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
      color: '#4CAF50',
      popular: true,
    },
    {
      id: 'e_wallet',
      name: 'E-Wallet',
      icon: 'mobile-alt',
      type: FontAwesome5,
      description: 'GoPay, OVO, DANA, ShopeePay',
      color: '#FF9800',
      popular: true,
    },
    {
      id: 'credit_card',
      name: 'Kartu Kredit',
      icon: 'credit-card',
      type: FontAwesome5,
      description: 'Visa, MasterCard, JCB',
      color: '#2196F3',
      popular: false,
    },
    {
      id: 'cash',
      name: 'Bayar di Tempat',
      icon: 'money-bill-wave',
      type: FontAwesome5,
      description: 'Bayar saat naik bus',
      color: '#607D8B',
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
    // Set initial payment method from Redux
    if (paymentInfo) {
      setSelectedMethod(paymentInfo);
    }

    // Start countdown timer
    const timer = setInterval(() => {
      setCountdown((prev) => {
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
            ]
          );
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
      dispatch(clearError());
    }
  }, [error]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePayment = async () => {
    if (selectedMethod === 'cash') {
      Alert.alert(
        'Pembayaran di Tempat',
        'Anda memilih pembayaran di tempat. Pastikan untuk membayar kepada sopir bus saat naik.',
        [
          { text: 'Batalkan', style: 'cancel' },
          { 
            text: 'Konfirmasi', 
            onPress: async () => {
              await processCashPayment();
            }
          },
        ]
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
      // Prepare payment data
      const paymentData = {
        payment_method: selectedMethod,
        amount: totalAmount,
        ...(selectedMethod === 'credit_card' && {
          card_details: cardDetails,
        }),
      };

      // Simulate API call using real thunk
      await dispatch(processPayment({ 
        bookingId: bookingId, 
        paymentData: paymentData 
      })).unwrap();
      
      updatePaymentSteps(3);
      await handlePaymentSuccess();
      
    } catch (error) {
      setProcessing(true); // Keep processing state while showing alert if you want, or set to false
      setProcessing(false);
      Alert.alert('Error', error || 'Pembayaran gagal. Silakan coba lagi.');
    }
  };

  const processCashPayment = async () => {
    setProcessing(true);
    
    try {
      // Prepare payment data for cash (Backend might expect something)
      const paymentData = {
        payment_method: 'cash',
        amount: totalAmount
      };

      await dispatch(processPayment({ 
        bookingId: bookingId, 
        paymentData: paymentData 
      })).unwrap();
      
      setProcessing(false);
      updatePaymentSteps(3);
      await handlePaymentSuccess();
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
    
    if (!cardDetails.cardExpiry.trim() || !/^\d{2}\/\d{2}$/.test(cardDetails.cardExpiry)) {
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

  const updatePaymentSteps = (stepIndex) => {
    const updatedSteps = paymentSteps.map((step, index) => ({
      ...step,
      completed: index < stepIndex,
      active: index === stepIndex - 1,
    }));
    setPaymentSteps(updatedSteps);
  };

  const renderPaymentStep = (step) => (
    <View key={step.id} style={styles.stepContainer}>
      <View style={[
        styles.stepCircle,
        step.completed && styles.stepCircleCompleted,
        step.active && styles.stepCircleActive,
      ]}>
        {step.completed ? (
          <Ionicons name="checkmark" size={20} color="#FFF" />
        ) : (
          <Text style={[
            styles.stepNumber,
            step.active && styles.stepNumberActive,
          ]}>
            {step.id}
          </Text>
        )}
      </View>
      <Text style={[
        styles.stepTitle,
        step.active && styles.stepTitleActive,
        step.completed && styles.stepTitleCompleted,
      ]}>
        {step.title}
      </Text>
    </View>
  );

  const renderPaymentMethod = (method) => {
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
          <View style={[styles.methodIcon, { backgroundColor: `${method.color}20` }]}>
            <IconComponent name={method.icon} size={24} color={method.color} />
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
            <Ionicons name="checkmark-circle" size={24} color={method.color} />
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
            <Text style={styles.instructionTitle}>Cara Pembayaran Transfer Bank:</Text>
            {banks.map((bank) => (
              <View key={bank.id} style={styles.bankCard}>
                <View style={styles.bankHeader}>
                  <View style={[styles.bankLogo, { backgroundColor: '#4CAF50' }]}>
                    <Text style={styles.bankInitials}>{bank.name.substring(0, 2)}</Text>
                  </View>
                  <View style={styles.bankInfo}>
                    <Text style={styles.bankName}>{bank.name}</Text>
                    <Text style={styles.bankCode}>Kode Bank: {bank.code}</Text>
                  </View>
                </View>
                <View style={styles.accountDetails}>
                  <View style={styles.accountRow}>
                    <Text style={styles.accountLabel}>Nomor Rekening:</Text>
                    <Text style={styles.accountValue}>{bank.accountNumber}</Text>
                  </View>
                  <View style={styles.accountRow}>
                    <Text style={styles.accountLabel}>Atas Nama:</Text>
                    <Text style={styles.accountValue}>{bank.accountName}</Text>
                  </View>
                  <View style={styles.accountRow}>
                    <Text style={styles.accountLabel}>Jumlah Transfer:</Text>
                    <Text style={[styles.accountValue, styles.amountHighlight]}>
                      Rp {booking.total.toLocaleString('id-ID')}
                    </Text>
                  </View>
                </View>
              </View>
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
              value={cardDetails.cardNumber}
              onChangeText={(text) => setCardDetails({...cardDetails, cardNumber: text})}
              keyboardType="numeric"
              maxLength={16}
            />
            
            <View style={styles.cardRow}>
              <TextInput
                style={[styles.cardInput, { flex: 2 }]}
                placeholder="MM/YY"
                value={cardDetails.cardExpiry}
                onChangeText={(text) => setCardDetails({...cardDetails, cardExpiry: text})}
                maxLength={5}
              />
              <TextInput
                style={[styles.cardInput, { flex: 1, marginLeft: 8 }]}
                placeholder="CVC"
                value={cardDetails.cardCVC}
                onChangeText={(text) => setCardDetails({...cardDetails, cardCVC: text})}
                keyboardType="numeric"
                maxLength={3}
              />
            </View>
            
            <TextInput
              style={styles.cardInput}
              placeholder="Nama Pemegang Kartu"
              value={cardDetails.cardName}
              onChangeText={(text) => setCardDetails({...cardDetails, cardName: text})}
              autoCapitalize="words"
            />
            
            <View style={styles.securityNote}>
              <Ionicons name="lock-closed" size={16} color="#4CAF50" />
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
        <ActivityIndicator size="large" color="#1E88E5" />
        <Text style={styles.loadingText}>Menyiapkan pembayaran...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#1E88E5" barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pembayaran</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.helpButton}>
            <Ionicons name="help-circle-outline" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Timer & Booking ID */}
        <View style={styles.timerContainer}>
          <View style={styles.timerCard}>
            <Ionicons name="time-outline" size={24} color="#FF9800" />
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

        {/* Payment Steps */}
        <View style={styles.stepsContainer}>
          {paymentSteps.map(renderPaymentStep)}
        </View>

        {/* Order Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Ringkasan Pemesanan</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Bus</Text>
            <Text style={styles.summaryValue}>{booking.busName}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Rute</Text>
            <Text style={styles.summaryValue}>{booking.departure} → {booking.destination}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tanggal & Waktu</Text>
            <Text style={styles.summaryValue}>{booking.departureDate} | {booking.departureTime}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Penumpang</Text>
            <Text style={styles.summaryValue}>{booking.passengerCount} orang</Text>
          </View>
          {booking.selectedSeats && booking.selectedSeats.length > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Kursi</Text>
              <Text style={styles.summaryValue}>{booking.selectedSeats.join(', ')}</Text>
            </View>
          )}
        </View>

        {/* Payment Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pilih Metode Pembayaran</Text>
          {paymentMethods.map(renderPaymentMethod)}
        </View>

        {/* Payment Instructions */}
        {renderInstruction()}

        {/* Price Breakdown */}
        <View style={styles.priceCard}>
          <Text style={styles.priceTitle}>Rincian Pembayaran</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Subtotal</Text>
            <Text style={styles.priceValue}>Rp {subtotal.toLocaleString('id-ID')}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Pajak (10%)</Text>
            <Text style={styles.priceValue}>Rp {tax.toLocaleString('id-ID')}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Biaya Layanan</Text>
            <Text style={styles.priceValue}>Rp {serviceFee.toLocaleString('id-ID')}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Pembayaran</Text>
            <Text style={styles.totalValue}>Rp {booking.total.toLocaleString('id-ID')}</Text>
          </View>
        </View>

        {/* Security Note */}
        <View style={styles.securityCard}>
          <View style={styles.securityHeader}>
            <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
            <Text style={styles.securityTitle}>Pembayaran 100% Aman</Text>
          </View>
          <Text style={styles.securityTextFull}>
            • Transaksi dienkripsi dengan teknologi SSL{'\n'}
            • Uang akan ditahan sampai tiket diterbitkan{'\n'}
            • Garansi uang kembali jika terjadi kendala{'\n'}
            • Dukungan customer service 24/7
          </Text>
        </View>

        {/* Action Button */}
        <View style={styles.actionContainer}>
          <TouchableOpacity 
            style={[styles.payButton, processing && styles.payButtonDisabled]}
            onPress={handlePayment}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Text style={styles.payButtonText}>
                  Bayar Rp {booking.total.toLocaleString('id-ID')}
                </Text>
                <Ionicons name="lock-closed" size={20} color="#FFF" style={styles.lockIcon} />
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

      {/* QR Code Modal */}
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
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalContent}>
              <View style={styles.qrContainer}>
                <View style={styles.qrPlaceholder}>
                  <Text style={styles.qrText}>QR Code</Text>
                  <Text style={styles.qrSubtext}>Scan dengan aplikasi e-wallet</Text>
                </View>
              </View>
              <Text style={styles.modalInstruction}>
                Buka aplikasi e-wallet Anda dan scan QR code di atas
              </Text>
              <View style={styles.timerModal}>
                <Ionicons name="time-outline" size={20} color="#FF9800" />
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

      {/* Success Overlay */}
      {showSuccess && (
        <View style={styles.successOverlay}>
          <Animated.View style={[styles.successContainer, { opacity: fadeAnim }]}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
            </View>
            <Text style={styles.successTitle}>Pembayaran Berhasil!</Text>
            <Text style={styles.successMessage}>
              Tiket Anda telah diterbitkan. Anda dapat melihatnya di menu 'Tiket Saya'.
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
                        params: { ticket: { id: bookingId } } 
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
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E88E5',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  headerRight: {
    flexDirection: 'row',
  },
  helpButton: {
    padding: 4,
  },
  timerContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  timerCard: {
    flex: 1,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  timerInfo: {
    marginLeft: 12,
  },
  timerLabel: {
    fontSize: 12,
    color: '#FF9800',
  },
  timerValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF9800',
    marginTop: 2,
  },
  bookingIdCard: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookingIdLabel: {
    fontSize: 10,
    color: '#666',
  },
  bookingIdValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 2,
  },
  stepsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  stepContainer: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepCircleCompleted: {
    backgroundColor: '#4CAF50',
  },
  stepCircleActive: {
    backgroundColor: '#1E88E5',
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  stepNumberActive: {
    color: '#FFF',
  },
  stepTitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  stepTitleActive: {
    color: '#1E88E5',
    fontWeight: '600',
  },
  stepTitleCompleted: {
    color: '#4CAF50',
  },
  summaryCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  paymentMethodSelected: {
    borderColor: '#1E88E5',
    backgroundColor: '#E3F2FD',
  },
  methodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  methodDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  methodRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  popularBadge: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  popularText: {
    fontSize: 10,
    color: '#FFF',
    fontWeight: 'bold',
  },
  instructionCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  bankCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  bankHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  bankInfo: {
    flex: 1,
  },
  bankName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  bankCode: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  accountDetails: {
    backgroundColor: '#FFF',
    borderRadius: 6,
    padding: 12,
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  accountLabel: {
    fontSize: 14,
    color: '#666',
  },
  accountValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  amountHighlight: {
    color: '#1E88E5',
    fontWeight: 'bold',
  },
  cardInput: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: 'row',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  securityText: {
    fontSize: 12,
    color: '#4CAF50',
    marginLeft: 8,
  },
  priceCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  priceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
  },
  priceValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E88E5',
  },
  securityCard: {
    backgroundColor: '#E8F5E9',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
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
    color: '#2E7D32',
    marginLeft: 8,
  },
  securityTextFull: {
    fontSize: 12,
    color: '#388E3C',
    lineHeight: 18,
    marginLeft: 28,
  },
  actionContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  payButton: {
    backgroundColor: '#1E88E5',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 12,
  },
  payButtonDisabled: {
    backgroundColor: '#90CAF9',
  },
  payButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  lockIcon: {
    marginLeft: 8,
  },
  saveButton: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    maxHeight: height * 0.8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalContent: {
    padding: 24,
    alignItems: 'center',
  },
  qrContainer: {
    width: 200,
    height: 200,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  qrPlaceholder: {
    alignItems: 'center',
  },
  qrText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  qrSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  modalInstruction: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  timerModal: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  timerModalText: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: '500',
    marginLeft: 8,
  },
  doneButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  doneButtonText: {
    color: '#FFF',
    fontSize: 16,
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
  },
  successIcon: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  successMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  successActions: {
    width: '100%',
    gap: 12,
  },
  viewTicketButton: {
    backgroundColor: '#1E88E5',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  viewTicketText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  backHomeButton: {
    backgroundColor: '#FFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    width: '100%',
  },
  backHomeText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  successSpinner: {
    marginTop: 16,
  },
});

export default PaymentScreen;