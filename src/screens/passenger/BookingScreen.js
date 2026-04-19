import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
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
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
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
      // Set initial form data from Redux if available
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
    
    // Clear validation error for this field
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
    const tax = (basePrice * seatCount) * 0.1; // 10% tax
    
    return (basePrice * seatCount) + tax + serviceFee;
  };

  const handleSubmitBooking = async () => {
    if (!validateForm()) return;

    // Update passenger info in Redux
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
      // Prepare booking data
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

      // Dispatch create booking action
      const result = await dispatch(createBooking(bookingData)).unwrap();
      
      setProcessing(false);
      setShowPaymentModal(true);
      
    } catch (error) {
      setProcessing(false);
      Alert.alert('Error', 'Gagal membuat booking. Silakan coba lagi.');
    }
  };

  const handlePayment = async () => {
    setShowPaymentModal(false);
    setBookingSuccess(true);
    
    // Navigate to payment screen with real booking ID from Redux state
    // currentBooking was updated by createBooking.fulfilled
    setTimeout(() => {
      navigation.navigate('Payment', {
        bookingId: currentBooking.id,
        totalAmount: currentBooking.totalAmount,
      });
    }, 2000);
  };

  const renderPassengerForm = (passenger, index, isMain = false) => (
    <View key={isMain ? 'main' : index} style={styles.passengerForm}>
      <Text style={styles.passengerTitle}>
        {isMain ? 'Penumpang Utama' : `Penumpang ${index + 2}`}
        {!isMain && (
          <TouchableOpacity 
            style={styles.removePassengerButton}
            onPress={() => handleRemovePassenger(index)}
          >
            <Text style={styles.removePassengerText}>Hapus</Text>
          </TouchableOpacity>
        )}
      </Text>
      
      <TextInput
        style={[styles.input, validationErrors[isMain ? 'fullName' : `passenger_${index}_name`] && styles.inputError]}
        placeholder="Nama Lengkap"
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
            <Ionicons name="chevron-down" size={16} color="#666" />
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
        <Text style={styles.bookingId}>
          ID: {currentBooking.bookingCode || 'Menunggu...'}
        </Text>
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
              <Text style={styles.durationText}>
                {selectedBus.duration || '4 jam'}
              </Text>
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
              <Ionicons name="bus-outline" size={20} color="#666" />
              <Text style={styles.detailLabel}>Bus</Text>
              <Text style={styles.detailValue}>{selectedBus.name}</Text>
            </View>
            
            <View style={styles.detailItem}>
              <Ionicons name="people-outline" size={20} color="#666" />
              <Text style={styles.detailLabel}>Penumpang</Text>
              <Text style={styles.detailValue}>{selectedSeats.length} orang</Text>
            </View>
            
            <View style={styles.detailItem}>
              <Ionicons name="calendar-outline" size={20} color="#666" />
              <Text style={styles.detailLabel}>Tanggal</Text>
              <Text style={styles.detailValue}>
                {selectedBus.departureDate 
                  ? new Date(selectedBus.departureDate).toLocaleDateString('id-ID')
                  : new Date().toLocaleDateString('id-ID')
                }
              </Text>
            </View>
            
            <View style={styles.detailItem}>
              <Ionicons name="time-outline" size={20} color="#666" />
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

  const renderPaymentMethod = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>Metode Pembayaran</Text>
      
      {['bank_transfer', 'e_wallet', 'credit_card', 'cash'].map((method) => (
        <TouchableOpacity
          key={method}
          style={[
            styles.paymentOption,
            paymentMethod === method && styles.paymentOptionSelected,
          ]}
          onPress={() => setPaymentMethod(method)}
        >
          <View style={styles.paymentIcon}>
            {method === 'bank_transfer' && <Ionicons name="business-outline" size={24} color="#4CAF50" />}
            {method === 'e_wallet' && <Ionicons name="phone-portrait-outline" size={24} color="#FF9800" />}
            {method === 'credit_card' && <Ionicons name="card-outline" size={24} color="#2196F3" />}
            {method === 'cash' && <Ionicons name="cash-outline" size={24} color="#9C27B0" />}
          </View>
          <View style={styles.paymentInfo}>
            <Text style={styles.paymentName}>
              {method === 'bank_transfer' && 'Transfer Bank'}
              {method === 'e_wallet' && 'E-Wallet'}
              {method === 'credit_card' && 'Kartu Kredit'}
              {method === 'cash' && 'Bayar di Tempat'}
            </Text>
            <Text style={styles.paymentDesc}>
              {method === 'bank_transfer' && 'BCA, Mandiri, BRI, BNI'}
              {method === 'e_wallet' && 'GoPay, OVO, DANA, ShopeePay'}
              {method === 'credit_card' && 'Visa, MasterCard, JCB'}
              {method === 'cash' && 'Bayar saat naik bus'}
            </Text>
          </View>
          {paymentMethod === method && (
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
          )}
        </TouchableOpacity>
      ))}
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
        <ActivityIndicator size="large" color="#1E88E5" />
        <Text style={styles.loadingText}>Memuat data pemesanan...</Text>
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
        <Text style={styles.headerTitle}>Pemesanan Tiket</Text>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Booking Summary */}
          {renderBookingSummary()}

          {/* Passenger Information */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Informasi Penumpang</Text>
            
            {/* Main Passenger */}
            {renderPassengerForm(null, 0, true)}
            
            {/* Additional Passengers */}
            {passengerInfo.additionalPassengers.map((passenger, index) => 
              renderPassengerForm(passenger, index, false)
            )}
            
            {/* Add Passenger Button */}
            {passengerInfo.additionalPassengers.length < selectedSeats.length - 1 && (
              <TouchableOpacity 
                style={styles.addPassengerButton}
                onPress={handleAddPassenger}
              >
                <Ionicons name="person-add-outline" size={20} color="#1E88E5" />
                <Text style={styles.addPassengerText}>Tambah Penumpang</Text>
              </TouchableOpacity>
            )}

            {/* Contact Information */}
            <View style={styles.contactForm}>
              <Text style={styles.contactTitle}>Kontak & Informasi Tambahan</Text>
              
              <TextInput
                style={[styles.input, validationErrors.email && styles.inputError]}
                placeholder="Email"
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
                value={formData.pickupPoint}
                onChangeText={(text) => handleInputChange('pickupPoint', text)}
              />
              
              <TextInput
                style={styles.input}
                placeholder="Titik Penurunan (Opsional)"
                value={formData.dropPoint}
                onChangeText={(text) => handleInputChange('dropPoint', text)}
              />
              
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Permintaan Khusus (Opsional)"
                value={formData.specialRequests}
                onChangeText={(text) => handleInputChange('specialRequests', text)}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Payment Method */}
          {renderPaymentMethod()}

          {/* Price Breakdown */}
          {renderPriceBreakdown()}

          {/* Terms and Conditions */}
          <View style={styles.termsCard}>
            <TouchableOpacity 
              style={styles.termsCheckbox}
              onPress={() => setTermsAccepted(!termsAccepted)}
            >
              <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                {termsAccepted && <Ionicons name="checkmark" size={16} color="#FFF" />}
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

          {/* Action Buttons */}
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
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Text style={styles.payButtonText}>Lanjut ke Pembayaran</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFF" />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer Note */}
          <View style={styles.footerNote}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#4CAF50" />
            <Text style={styles.footerText}>
              Data Anda aman dan terlindungi. Kami tidak akan membagikan informasi pribadi Anda.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Payment Modal */}
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
                <Ionicons name="close" size={24} color="#666" />
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
                  {paymentMethod === 'bank_transfer' && 'Transfer ke rekening berikut:'}
                  {paymentMethod === 'e_wallet' && 'Scan QR code dengan e-wallet:'}
                  {paymentMethod === 'credit_card' && 'Masukkan detail kartu kredit:'}
                  {paymentMethod === 'cash' && 'Bayar langsung kepada sopir:'}
                </Text>
                
                {paymentMethod === 'bank_transfer' && (
                  <View style={styles.bankInfo}>
                    <Text style={styles.bankName}>Bank Central Asia (BCA)</Text>
                    <Text style={styles.accountNumber}>1234567890 - PT Bus Ticketing</Text>
                  </View>
                )}
              </View>
              
              <TouchableOpacity 
                style={styles.confirmButton}
                onPress={handlePayment}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Text style={styles.confirmButtonText}>Konfirmasi Pembayaran</Text>
                    <Ionicons name="checkmark-circle" size={20} color="#FFF" />
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

      {/* Success Overlay */}
      {bookingSuccess && (
        <View style={styles.successOverlay}>
          <View style={styles.successContainer}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
            </View>
            <Text style={styles.successTitle}>Pemesanan Berhasil!</Text>
            <Text style={styles.successMessage}>
              Anda akan diarahkan ke halaman pembayaran.
            </Text>
            <ActivityIndicator size="large" color="#4CAF50" style={styles.successSpinner} />
          </View>
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
    width: 32,
  },
  keyboardView: {
    flex: 1,
  },
  summaryCard: {
    backgroundColor: '#FFF',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    fontWeight: '600',
    color: '#333',
  },
  bookingId: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  routeSummary: {
    marginBottom: 16,
  },
  routeStop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1E88E5',
    marginRight: 12,
  },
  dotDestination: {
    backgroundColor: '#4CAF50',
  },
  cityText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  timeText: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  routeDuration: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
    marginVertical: 4,
  },
  durationLine: {
    width: 2,
    height: 30,
    backgroundColor: '#1E88E5',
    marginLeft: 4,
    marginRight: 16,
  },
  durationText: {
    fontSize: 12,
    color: '#666',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  detailItem: {
    width: '50%',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginTop: 2,
  },
  seatsContainer: {
    marginTop: 8,
  },
  seatsTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  seatsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  seatBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  seatText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E88E5',
  },
  sectionContainer: {
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
    marginBottom: 16,
  },
  passengerForm: {
    marginBottom: 16,
  },
  passengerTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  removePassengerButton: {
    position: 'absolute',
    right: 0,
    top: 0,
  },
  removePassengerText: {
    color: '#F44336',
    fontSize: 12,
    fontWeight: '500',
  },
  input: {
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
  inputError: {
    borderColor: '#F44336',
    backgroundColor: '#FFF8F8',
  },
  errorText: {
    color: '#F44336',
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
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  identityTypeText: {
    fontSize: 14,
    color: '#333',
  },
  addPassengerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3F2FD',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  addPassengerText: {
    color: '#1E88E5',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  contactForm: {
    marginTop: 8,
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 12,
  },
  textArea: {
    minHeight: 80,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  paymentOptionSelected: {
    borderColor: '#1E88E5',
    backgroundColor: '#E3F2FD',
  },
  paymentIcon: {
    marginRight: 12,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  paymentDesc: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
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
  termsCard: {
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
  termsCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#1E88E5',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#1E88E5',
  },
  termsText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  termsLink: {
    alignSelf: 'flex-start',
  },
  termsLinkText: {
    color: '#1E88E5',
    fontSize: 14,
    fontWeight: '500',
  },
  actionContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  payButton: {
    flex: 2,
    backgroundColor: '#1E88E5',
    borderRadius: 8,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonDisabled: {
    backgroundColor: '#90CAF9',
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginRight: 8,
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 12,
    backgroundColor: '#F0F7FF',
    borderRadius: 8,
  },
  footerText: {
    fontSize: 12,
    color: '#1E88E5',
    marginLeft: 8,
    flex: 1,
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
    padding: 16,
  },
  paymentAmount: {
    alignItems: 'center',
    marginBottom: 24,
  },
  amountLabel: {
    fontSize: 14,
    color: '#666',
  },
  amountValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E88E5',
    marginTop: 4,
  },
  paymentInstruction: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  instructionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  bankInfo: {
    marginTop: 8,
  },
  bankName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  accountNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E88E5',
    marginTop: 4,
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginRight: 8,
  },
  modalNote: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 16,
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
  successSpinner: {
    marginTop: 16,
  },
});

export default BookingScreen;