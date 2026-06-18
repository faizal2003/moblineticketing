import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import Entypo from 'react-native-vector-icons/Entypo';

import { useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  createBooking,
  updatePassengerInfo,
  updateAdditionalPassenger,
  addAdditionalPassenger,
  removeAdditionalPassenger,
  setCurrentBooking,
  selectCurrentBooking,
  selectPassengerInfo,
  selectSelectedBus,
  selectSelectedSeats,
  selectLoading,
  selectError,
  selectSearchParams,
  clearError,
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

const BookingScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  
  // Get state from Redux
  const currentBooking = useSelector(selectCurrentBooking);
  const passengerInfo = useSelector(selectPassengerInfo);
  const selectedBus = useSelector(selectSelectedBus);
  const selectedSeats = useSelector(selectSelectedSeats);
  const loading = useSelector(selectLoading);
  const error = useSelector(selectError);
  const searchParams = useSelector(selectSearchParams);
  
  const [processing, setProcessing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [validationErrors, setValidationErrors] = useState({});

  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    identityNumber: '',
    identityType: 'KTP',
    pickupPoint: '',
    dropPoint: '',
    specialRequests: '',
  });

  // Initialize with Redux data
  useEffect(() => {
    if (selectedBus && selectedSeats) {
      if (passengerInfo.mainPassenger.name) {
        setFormData(prev => ({
          ...prev,
          fullName: passengerInfo.mainPassenger.name,
          email: passengerInfo.mainPassenger.email || '',
          phone: passengerInfo.mainPassenger.phone || '',
          identityNumber: passengerInfo.mainPassenger.identityNumber || '',
          identityType: passengerInfo.mainPassenger.identityType || 'KTP',
        }));
      }
      
      if (passengerInfo.pickupPoint) {
        setFormData(prev => ({
          ...prev,
          pickupPoint: passengerInfo.pickupPoint,
        }));
      }
      
      if (passengerInfo.dropPoint) {
        setFormData(prev => ({
          ...prev,
          dropPoint: passengerInfo.dropPoint,
        }));
      }
      
      if (passengerInfo.specialRequests) {
        setFormData(prev => ({
          ...prev,
          specialRequests: passengerInfo.specialRequests,
        }));
      }
    }
  }, [selectedBus, selectedSeats, passengerInfo]);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
      dispatch(clearError());
    }
  }, [error]);

  const handleInputChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value,
    });
    
    if (validationErrors[field]) {
      setValidationErrors({
        ...validationErrors,
        [field]: null,
      });
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.fullName.trim()) {
      errors.fullName = 'Nama lengkap harus diisi';
    }
    
    if (!formData.email.trim()) {
      errors.email = 'Email harus diisi';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Format email tidak valid';
    }
    
    if (!formData.phone.trim()) {
      errors.phone = 'Nomor telepon harus diisi';
    } else if (!/^[0-9]{10,13}$/.test(formData.phone)) {
      errors.phone = 'Nomor telepon harus 10-13 digit angka';
    }
    
    if (!formData.identityNumber.trim()) {
      errors.identityNumber = 'Nomor identitas harus diisi';
    }
    
    if (passengerInfo.additionalPassengers.length > 0) {
      passengerInfo.additionalPassengers.forEach((passenger, index) => {
        if (!passenger.name?.trim()) {
          errors[`passenger_${index}_name`] = `Nama penumpang ${index + 2} harus diisi`;
        }
        if (!passenger.identityNumber?.trim()) {
          errors[`passenger_${index}_identity`] = `Identitas penumpang ${index + 2} harus diisi`;
        }
      });
    }
    
    if (!termsAccepted) {
      errors.terms = 'Anda harus menyetujui syarat dan ketentuan';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAdditionalPassengerChange = (index, field, value) => {
    dispatch(updateAdditionalPassenger({ index, data: { [field]: value } }));
  };

  const handleAddPassenger = () => {
    if (passengerInfo.additionalPassengers.length < selectedSeats.length - 1) {
      dispatch(addAdditionalPassenger());
    } else {
      Alert.alert('Maksimum Penumpang', `Anda hanya memilih ${selectedSeats.length} kursi`);
    }
  };

  const handleRemovePassenger = (index) => {
    dispatch(removeAdditionalPassenger(index));
  };

  const calculateTotal = () => {
    if (!selectedBus || !selectedSeats.length) return 0;
    
    const basePrice = selectedBus.price || 150000;
    const seatCount = selectedSeats.length;
    const serviceFee = 5000;
    const tax = (basePrice * seatCount) * 0.1;
    
    return (basePrice * seatCount) + tax + serviceFee;
  };

  const handleSubmitBooking = async () => {
    if (!validateForm()) return;

    dispatch(updatePassengerInfo({
      mainPassenger: {
        name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        identityNumber: formData.identityNumber,
        identityType: formData.identityType,
      },
      pickupPoint: formData.pickupPoint,
      dropPoint: formData.dropPoint,
      specialRequests: formData.specialRequests,
    }));

    setProcessing(true);

    try {
      const bookingData = {
        busId: selectedBus.id,
        busName: selectedBus.name,
        departure: selectedBus.departure || searchParams.departure,
        destination: selectedBus.destination || searchParams.destination,
        departureDate: selectedBus.departureDate || searchParams.departureDate,
        departureTime: selectedBus.departureTime || '08:00',
        seats: selectedSeats.map(seat => ({
          number: seat.number,
          price: seat.price || selectedBus.price,
        })),
        passengerInfo: {
          mainPassenger: {
            name: formData.fullName,
            email: formData.email,
            phone: formData.phone,
            identityNumber: formData.identityNumber,
            identityType: formData.identityType,
          },
          additionalPassengers: passengerInfo.additionalPassengers,
          pickupPoint: formData.pickupPoint,
          dropPoint: formData.dropPoint,
          specialRequests: formData.specialRequests,
        },
        totalAmount: calculateTotal(),
        passengerCount: selectedSeats.length,
        bookingDate: new Date().toISOString(),
      };

      const result = await dispatch(createBooking(bookingData)).unwrap();
      
      setProcessing(false);
      setShowPaymentModal(true);
      
    } catch (error) {
      setProcessing(false);
      Alert.alert('Error', 'Gagal membuat booking. Silakan coba lagi.');
    }
  };

  const handleGoToPayment = async () => {
    setShowPaymentModal(false);
    setBookingSuccess(true);
    
    setTimeout(() => {
      navigation.navigate('Payment', {
        bookingId: currentBooking.id,
        totalAmount: currentBooking.totalAmount,
      });
    }, 2000);
  };

  const renderPassengerForm = (passenger, index, isMain = false) => (
    <View key={isMain ? 'main' : index} style={styles.passengerForm}>
      <View style={styles.passengerHeader}>
        <Text style={styles.passengerTitle}>
          {isMain ? 'Penumpang Utama' : `Penumpang ${index + 2}`}
        </Text>
        {!isMain && (
          <TouchableOpacity 
            style={styles.removePassengerButton}
            onPress={() => handleRemovePassenger(index)}
          >
            <Ionicons name="close-circle" size={20} color={C.red} />
            <Text style={styles.removePassengerText}>Hapus</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <TextInput
        style={[styles.input, validationErrors[isMain ? 'fullName' : `passenger_${index}_name`] && styles.inputError]}
        placeholder="Nama Lengkap"
        placeholderTextColor={C.textMuted}
        value={isMain ? formData.fullName : passenger.name}
        onChangeText={(text) => isMain 
          ? handleInputChange('fullName', text)
          : handleAdditionalPassengerChange(index, 'name', text)
        }
      />
      {validationErrors[isMain ? 'fullName' : `passenger_${index}_name`] && (
        <Text style={styles.errorText}>
          {validationErrors[isMain ? 'fullName' : `passenger_${index}_name`]}
        </Text>
      )}
      
      <View style={styles.identityRow}>
        <TextInput
          style={[styles.input, styles.identityInput, validationErrors[isMain ? 'identityNumber' : `passenger_${index}_identity`] && styles.inputError]}
          placeholder="Nomor Identitas"
          placeholderTextColor={C.textMuted}
          value={isMain ? formData.identityNumber : passenger.identityNumber}
          onChangeText={(text) => isMain 
            ? handleInputChange('identityNumber', text)
            : handleAdditionalPassengerChange(index, 'identityNumber', text)
          }
          keyboardType="numeric"
        />
        {isMain && (
          <TouchableOpacity style={styles.identityTypeButton}>
            <Text style={styles.identityTypeText}>{formData.identityType}</Text>
            <Ionicons name="chevron-down" size={16} color={C.textSub} />
          </TouchableOpacity>
        )}
      </View>
      {validationErrors[isMain ? 'identityNumber' : `passenger_${index}_identity`] && (
        <Text style={styles.errorText}>
          {validationErrors[isMain ? 'identityNumber' : `passenger_${index}_identity`]}
        </Text>
      )}
    </View>
  );

  const renderBookingSummary = () => (
    <View style={styles.summaryCard}>
      <View style={styles.summaryHeader}>
        <Text style={styles.summaryTitle}>Ringkasan Pemesanan</Text>
        <View style={styles.bookingIdBadge}>
          <Text style={styles.bookingId}>
            ID: {currentBooking.bookingCode || 'Menunggu...'}
          </Text>
        </View>
      </View>
      
      {selectedBus && (
        <>
          <View style={styles.routeSummary}>
            <View style={styles.routeStop}>
              <View style={styles.routeDot} />
              <View>
                <Text style={styles.cityText}>{selectedBus.departure}</Text>
                <Text style={styles.timeText}>{selectedBus.departureTime || '08:00'}</Text>
              </View>
            </View>
            
            <View style={styles.routeDuration}>
              <View style={styles.durationLine} />
              <View style={styles.durationBadge}>
                <Text style={styles.durationText}>
                  {selectedBus.duration || '4 jam'}
                </Text>
              </View>
            </View>
            
            <View style={styles.routeStop}>
              <View style={[styles.routeDot, styles.dotDestination]} />
              <View>
                <Text style={styles.cityText}>{selectedBus.destination}</Text>
                <Text style={styles.timeText}>{selectedBus.arrivalTime || '12:00'}</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <View style={styles.detailIconWrap}>
                <Ionicons name="bus-outline" size={18} color={C.primary} />
              </View>
              <Text style={styles.detailLabel}>Bus</Text>
              <Text style={styles.detailValue}>{selectedBus.name}</Text>
            </View>
            
            <View style={styles.detailItem}>
              <View style={styles.detailIconWrap}>
                <Ionicons name="people-outline" size={18} color={C.primary} />
              </View>
              <Text style={styles.detailLabel}>Penumpang</Text>
              <Text style={styles.detailValue}>{selectedSeats.length} orang</Text>
            </View>
            
            <View style={styles.detailItem}>
              <View style={styles.detailIconWrap}>
                <Ionicons name="calendar-outline" size={18} color={C.primary} />
              </View>
              <Text style={styles.detailLabel}>Tanggal</Text>
              <Text style={styles.detailValue}>
                {selectedBus.departureDate 
                  ? new Date(selectedBus.departureDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                  : new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                }
              </Text>
            </View>
            
            <View style={styles.detailItem}>
              <View style={styles.detailIconWrap}>
                <Ionicons name="time-outline" size={18} color={C.primary} />
              </View>
              <Text style={styles.detailLabel}>Waktu</Text>
              <Text style={styles.detailValue}>{selectedBus.departureTime || '08:00'}</Text>
            </View>
          </View>
        </>
      )}
      
      {selectedSeats.length > 0 && (
        <View style={styles.seatsContainer}>
          <Text style={styles.seatsTitle}>Kursi Terpilih:</Text>
          <View style={styles.seatsList}>
            {selectedSeats.map((seat, index) => (
              <View key={index} style={styles.seatBadge}>
                <Text style={styles.seatText}>{seat.number}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );

  const renderPriceBreakdown = () => (
    <View style={styles.priceCard}>
      <Text style={styles.priceTitle}>Rincian Harga</Text>
      
      <View style={styles.priceRow}>
        <Text style={styles.priceLabel}>Tiket ({selectedSeats.length} orang)</Text>
        <Text style={styles.priceValue}>
          Rp {((selectedBus?.price || 150000) * selectedSeats.length).toLocaleString('id-ID')}
        </Text>
      </View>
      
      <View style={styles.priceRow}>
        <Text style={styles.priceLabel}>Pajak (10%)</Text>
        <Text style={styles.priceValue}>
          Rp {((selectedBus?.price || 150000) * selectedSeats.length * 0.1).toLocaleString('id-ID')}
        </Text>
      </View>
      
      <View style={styles.priceRow}>
        <Text style={styles.priceLabel}>Biaya Layanan</Text>
        <Text style={styles.priceValue}>Rp 5.000</Text>
      </View>
      
      <View style={styles.divider} />
      
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total Pembayaran</Text>
        <Text style={styles.totalValue}>
          Rp {calculateTotal().toLocaleString('id-ID')}
        </Text>
      </View>
    </View>
  );

  if (loading && !processing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={styles.loadingText}>Memuat data pemesanan...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.headerBg} translucent={false} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={C.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pemesanan Tiket</Text>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {renderBookingSummary()}

          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Informasi Penumpang</Text>
            
            {renderPassengerForm(null, 0, true)}
            
            {passengerInfo.additionalPassengers.map((passenger, index) => 
              renderPassengerForm(passenger, index, false)
            )}
            
            {passengerInfo.additionalPassengers.length < selectedSeats.length - 1 && (
              <TouchableOpacity 
                style={styles.addPassengerButton}
                onPress={handleAddPassenger}
              >
                <Ionicons name="person-add-outline" size={20} color={C.primary} />
                <Text style={styles.addPassengerText}>Tambah Penumpang</Text>
              </TouchableOpacity>
            )}

            <View style={styles.contactForm}>
              <Text style={styles.contactTitle}>Kontak & Informasi Tambahan</Text>
              
              <TextInput
                style={[styles.input, validationErrors.email && styles.inputError]}
                placeholder="Email"
                placeholderTextColor={C.textMuted}
                value={formData.email}
                onChangeText={(text) => handleInputChange('email', text)}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {validationErrors.email && (
                <Text style={styles.errorText}>{validationErrors.email}</Text>
              )}
              
              <TextInput
                style={[styles.input, validationErrors.phone && styles.inputError]}
                placeholder="Nomor Telepon"
                placeholderTextColor={C.textMuted}
                value={formData.phone}
                onChangeText={(text) => handleInputChange('phone', text)}
                keyboardType="phone-pad"
              />
              {validationErrors.phone && (
                <Text style={styles.errorText}>{validationErrors.phone}</Text>
              )}
              
              <TextInput
                style={styles.input}
                placeholder="Titik Penjemputan (Opsional)"
                placeholderTextColor={C.textMuted}
                value={formData.pickupPoint}
                onChangeText={(text) => handleInputChange('pickupPoint', text)}
              />
              
              <TextInput
                style={styles.input}
                placeholder="Titik Penurunan (Opsional)"
                placeholderTextColor={C.textMuted}
                value={formData.dropPoint}
                onChangeText={(text) => handleInputChange('dropPoint', text)}
              />
              
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Permintaan Khusus (Opsional)"
                placeholderTextColor={C.textMuted}
                value={formData.specialRequests}
                onChangeText={(text) => handleInputChange('specialRequests', text)}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>

          {renderPriceBreakdown()}

          <View style={styles.termsCard}>
            <TouchableOpacity 
              style={styles.termsCheckbox}
              onPress={() => setTermsAccepted(!termsAccepted)}
            >
              <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                {termsAccepted && <Ionicons name="checkmark" size={14} color={C.white} />}
              </View>
              <Text style={styles.termsText}>
                Saya setuju dengan syarat dan ketentuan yang berlaku
              </Text>
            </TouchableOpacity>
            {validationErrors.terms && (
              <Text style={styles.errorText}>{validationErrors.terms}</Text>
            )}
            
            <TouchableOpacity style={styles.termsLink}>
              <Text style={styles.termsLinkText}>Baca Syarat & Ketentuan</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actionContainer}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => navigation.goBack()}
              disabled={processing}
            >
              <Text style={styles.cancelButtonText}>Kembali</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.payButton, processing && styles.payButtonDisabled]}
              onPress={handleSubmitBooking}
              disabled={processing || !selectedBus || selectedSeats.length === 0}
            >
              {processing ? (
                <ActivityIndicator color={C.white} />
              ) : (
                <>
                  <Text style={styles.payButtonText}>Lanjut ke Pembayaran</Text>
                  <Ionicons name="arrow-forward" size={20} color={C.white} />
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footerNote}>
            <Ionicons name="shield-checkmark-outline" size={16} color={C.green} />
            <Text style={styles.footerText}>
              Data Anda aman dan terlindungi. Kami tidak akan membagikan informasi pribadi Anda.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Konfirmasi Pemesanan</Text>
              <TouchableOpacity 
                onPress={() => setShowPaymentModal(false)}
                disabled={processing}
              >
                <Ionicons name="close" size={24} color={C.textSub} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <View style={styles.paymentAmount}>
                <Text style={styles.amountLabel}>Total yang harus dibayar</Text>
                <Text style={styles.amountValue}>
                  Rp {calculateTotal().toLocaleString('id-ID')}
                </Text>
              </View>
              
              <View style={styles.paymentInstruction}>
                <Text style={styles.instructionTitle}>
                  Silakan lanjutkan ke halaman pembayaran untuk memilih metode pembayaran
                </Text>
              </View>
              
              <TouchableOpacity 
                style={styles.confirmButton}
                onPress={handleGoToPayment}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator color={C.white} />
                ) : (
                  <>
                    <Text style={styles.confirmButtonText}>Lanjut ke Pembayaran</Text>
                    <Ionicons name="arrow-forward" size={20} color={C.white} />
                  </>
                )}
              </TouchableOpacity>
              
              <Text style={styles.modalNote}>
                Dengan menekan tombol ini, Anda menyetujui syarat dan ketentuan yang berlaku.
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {bookingSuccess && (
        <View style={styles.successOverlay}>
          <View style={styles.successContainer}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={80} color={C.green} />
            </View>
            <Text style={styles.successTitle}>Pemesanan Berhasil!</Text>
            <Text style={styles.successMessage}>
              Anda akan diarahkan ke halaman pembayaran.
            </Text>
            <ActivityIndicator size="large" color={C.green} style={styles.successSpinner} />
          </View>
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
    width: 32,
  },
  keyboardView: {
    flex: 1,
    backgroundColor: C.surface,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  
  // Summary Card
  summaryCard: {
    backgroundColor: C.white,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
  },
  bookingIdBadge: {
    backgroundColor: C.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  bookingId: {
    fontSize: 11,
    color: C.textSub,
    fontWeight: '500',
  },
  routeSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  routeStop: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.primary,
    marginRight: 12,
  },
  dotDestination: {
    backgroundColor: C.green,
  },
  cityText: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
  },
  timeText: {
    fontSize: 13,
    color: C.textSub,
    marginTop: 2,
  },
  routeDuration: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  durationLine: {
    width: 1,
    height: 30,
    backgroundColor: C.border,
    marginBottom: 4,
  },
  durationBadge: {
    backgroundColor: C.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    fontSize: 10,
    color: C.primary,
    fontWeight: '600',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  detailItem: {
    width: '50%',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: C.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 10,
    color: C.textMuted,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text,
    marginTop: 2,
  },
  seatsContainer: {
    marginTop: 4,
  },
  seatsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text,
    marginBottom: 8,
  },
  seatsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  seatBadge: {
    backgroundColor: C.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.primaryMuted,
  },
  seatText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.primary,
  },
  
  // Section Container
  sectionContainer: {
    backgroundColor: C.white,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
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
    marginBottom: 16,
  },
  
  // Passenger Form
  passengerForm: {
    marginBottom: 16,
  },
  passengerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  passengerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
  },
  removePassengerButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  removePassengerText: {
    color: C.red,
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  input: {
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
  inputError: {
    borderColor: C.red,
    backgroundColor: C.redLight,
  },
  errorText: {
    color: C.red,
    fontSize: 12,
    marginTop: -8,
    marginBottom: 12,
    marginLeft: 4,
  },
  identityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  identityInput: {
    flex: 3,
  },
  identityTypeButton: {
    flex: 1,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  identityTypeText: {
    fontSize: 14,
    color: C.text,
  },
  addPassengerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primaryLight,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.primaryMuted,
    borderStyle: 'dashed',
  },
  addPassengerText: {
    color: C.primary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  contactForm: {
    marginTop: 4,
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
    marginBottom: 12,
  },
  textArea: {
    minHeight: 80,
  },
  
  // Price Card
  priceCard: {
    backgroundColor: C.white,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
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
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: C.textSub,
  },
  priceValue: {
    fontSize: 14,
    color: C.text,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 12,
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
  
  // Terms
  termsCard: {
    backgroundColor: C.white,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  termsCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: C.primary,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: C.primary,
  },
  termsText: {
    fontSize: 13,
    color: C.text,
    flex: 1,
  },
  termsLink: {
    alignSelf: 'flex-start',
  },
  termsLinkText: {
    color: C.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  
  // Action Buttons
  actionContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: C.textSub,
  },
  payButton: {
    flex: 2,
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 15,
    fontWeight: '700',
    color: C.white,
    marginRight: 8,
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    padding: 12,
    backgroundColor: C.greenLight,
    borderRadius: 10,
  },
  footerText: {
    fontSize: 12,
    color: C.green,
    marginLeft: 8,
    flex: 1,
  },
  
  // Modal
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
    padding: 16,
  },
  paymentAmount: {
    alignItems: 'center',
    marginBottom: 24,
  },
  amountLabel: {
    fontSize: 14,
    color: C.textSub,
  },
  amountValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: C.primary,
    marginTop: 4,
  },
  paymentInstruction: {
    backgroundColor: C.surface,
    borderRadius: 10,
    padding: 16,
    marginBottom: 24,
  },
  instructionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: C.textSub,
    textAlign: 'center',
    lineHeight: 20,
  },
  confirmButton: {
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: C.white,
    marginRight: 8,
  },
  modalNote: {
    fontSize: 12,
    color: C.textSub,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 16,
  },
  
  // Success
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
    color: C.text,
    marginBottom: 12,
  },
  successMessage: {
    fontSize: 15,
    color: C.textSub,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  successSpinner: {
    marginTop: 16,
  },
});

export default BookingScreen;