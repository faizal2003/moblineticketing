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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { useDispatch, useSelector } from 'react-redux';
import DatePicker from 'react-native-date-picker';
import {
  updateSearchParams,
  fetchAvailableBuses,
  clearSearchResults,
  selectSearchParams,
  selectBusLoading,
  selectBusError,
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

const SearchBusScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  
  const searchParams = useSelector(selectSearchParams);
  const loading = useSelector(selectBusLoading);
  const error = useSelector(selectBusError);
  
  const [formData, setFormData] = useState({
    departure: '',
    destination: '',
    departureDate: new Date(),
    passengers: '1',
  });
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showReturnDatePicker, setShowReturnDatePicker] = useState(false);
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [returnDate, setReturnDate] = useState(new Date());

  useEffect(() => {
    if (searchParams.departure) {
      setFormData({
        departure: searchParams.departure,
        destination: searchParams.destination,
        departureDate: new Date(searchParams.departureDate),
        passengers: searchParams.passengers.toString(),
      });
    }
  }, []);

  const handleInputChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value,
    });
  };

  const handleDateChange = (selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFormData({
        ...formData,
        departureDate: selectedDate,
      });
      if (isRoundTrip && returnDate < selectedDate) {
        setReturnDate(selectedDate);
      }
    }
  };

  const handleReturnDateChange = (selectedDate) => {
    setShowReturnDatePicker(false);
    if (selectedDate) {
      setReturnDate(selectedDate);
    }
  };

  const validateForm = () => {
    if (!formData.departure.trim()) {
      Alert.alert('Error', 'Harap masukkan kota keberangkatan');
      return false;
    }
    if (!formData.destination.trim()) {
      Alert.alert('Error', 'Harap masukkan kota tujuan');
      return false;
    }
    if (formData.departure.toLowerCase() === formData.destination.toLowerCase()) {
      Alert.alert('Error', 'Kota keberangkatan dan tujuan tidak boleh sama');
      return false;
    }
    if (parseInt(formData.passengers) < 1) {
      Alert.alert('Error', 'Jumlah penumpang minimal 1');
      return false;
    }
    if (parseInt(formData.passengers) > 10) {
      Alert.alert('Error', 'Maksimal 10 penumpang per pemesanan');
      return false;
    }
    if (isRoundTrip && returnDate <= formData.departureDate) {
      Alert.alert('Error', 'Tanggal kembali harus setelah tanggal berangkat');
      return false;
    }
    return true;
  };

  const handleSearch = async () => {
    if (!validateForm()) return;

    dispatch(updateSearchParams({
      departure: formData.departure.trim(),
      destination: formData.destination.trim(),
      departureDate: formData.departureDate.toISOString(),
      passengers: parseInt(formData.passengers),
      returnDate: isRoundTrip ? returnDate.toISOString() : null,
      tripType: isRoundTrip ? 'round-trip' : 'one-way',
    }));

    dispatch(clearSearchResults());

    const searchParams = {
      departure: formData.departure.trim(),
      destination: formData.destination.trim(),
      departureDate: formData.departureDate.toISOString(),
      passengers: parseInt(formData.passengers),
      returnDate: isRoundTrip ? returnDate.toISOString() : null,
    };

    try {
      const result = await dispatch(fetchAvailableBuses(searchParams)).unwrap();
      
      if (result.data && result.data.length > 0) {
        navigation.navigate('BusList');
      } else {
        Alert.alert(
          'Tidak Ditemukan',
          'Tidak ada bus yang tersedia untuk rute dan tanggal tersebut.',
          [
            { text: 'OK', style: 'default' },
            { 
              text: 'Cari Tanggal Lain', 
              onPress: () => setShowDatePicker(true) 
            },
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Gagal mencari bus. Silakan coba lagi.');
    }
  };

  const swapLocations = () => {
    setFormData({
      ...formData,
      departure: formData.destination,
      destination: formData.departure,
    });
  };

  const incrementPassengers = () => {
    const current = parseInt(formData.passengers) || 1;
    if (current < 10) {
      handleInputChange('passengers', (current + 1).toString());
    }
  };

  const decrementPassengers = () => {
    const current = parseInt(formData.passengers) || 1;
    if (current > 1) {
      handleInputChange('passengers', (current - 1).toString());
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.headerBg} translucent={false} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={C.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cari Bus</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.tripTypeContainer}>
          <TouchableOpacity
            style={[
              styles.tripTypeButton,
              !isRoundTrip && styles.tripTypeButtonActive,
            ]}
            onPress={() => setIsRoundTrip(false)}
          >
            <Text style={[
              styles.tripTypeText,
              !isRoundTrip && styles.tripTypeTextActive,
            ]}>
              Sekali Jalan
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.tripTypeButton,
              isRoundTrip && styles.tripTypeButtonActive,
            ]}
            onPress={() => setIsRoundTrip(true)}
          >
            <Text style={[
              styles.tripTypeText,
              isRoundTrip && styles.tripTypeTextActive,
            ]}>
              Pulang Pergi
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.locationRow}>
            <View style={styles.locationIcon}>
              <Ionicons name="location" size={22} color={C.primary} />
            </View>
            <View style={styles.locationInputContainer}>
              <Text style={styles.inputLabel}>Dari</Text>
              <TextInput
                style={styles.input}
                placeholder="Kota keberangkatan"
                placeholderTextColor={C.textMuted}
                value={formData.departure}
                onChangeText={(text) => handleInputChange('departure', text)}
                autoCapitalize="words"
              />
            </View>
          </View>
          
          <TouchableOpacity style={styles.swapButton} onPress={swapLocations}>
            <Ionicons name="swap-vertical" size={18} color={C.textSub} />
          </TouchableOpacity>
          
          <View style={styles.locationRow}>
            <View style={styles.locationIcon}>
              <Ionicons name="location-outline" size={22} color={C.green} />
            </View>
            <View style={styles.locationInputContainer}>
              <Text style={styles.inputLabel}>Ke</Text>
              <TextInput
                style={styles.input}
                placeholder="Kota tujuan"
                placeholderTextColor={C.textMuted}
                value={formData.destination}
                onChangeText={(text) => handleInputChange('destination', text)}
                autoCapitalize="words"
              />
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.dateRow}>
            <View style={styles.dateIcon}>
              <Ionicons name="calendar" size={22} color={C.primary} />
            </View>
            <View style={styles.dateInputContainer}>
              <Text style={styles.inputLabel}>Tanggal Berangkat</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateText}>
                  {formatDate(formData.departureDate)}
                </Text>
                <Ionicons name="chevron-down" size={18} color={C.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
          
          {isRoundTrip && (
            <>
              <View style={styles.divider} />
              <View style={styles.dateRow}>
                <View style={styles.dateIcon}>
                  <Ionicons name="calendar" size={22} color={C.amber} />
                </View>
                <View style={styles.dateInputContainer}>
                  <Text style={styles.inputLabel}>Tanggal Kembali</Text>
                  <TouchableOpacity
                    style={styles.dateInput}
                    onPress={() => setShowReturnDatePicker(true)}
                  >
                    <Text style={styles.dateText}>
                      {formatDate(returnDate)}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color={C.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.passengerRow}>
            <View style={styles.passengerIcon}>
              <Ionicons name="people" size={22} color={C.primary} />
            </View>
            <View style={styles.passengerInputContainer}>
              <Text style={styles.inputLabel}>Penumpang</Text>
              <View style={styles.passengerCounter}>
                <TouchableOpacity
                  style={styles.counterButton}
                  onPress={decrementPassengers}
                  disabled={parseInt(formData.passengers) <= 1}
                >
                  <Ionicons 
                    name="remove" 
                    size={18} 
                    color={parseInt(formData.passengers) <= 1 ? C.textMuted : C.text} 
                  />
                </TouchableOpacity>
                
                <Text style={styles.passengerCount}>{formData.passengers}</Text>
                
                <TouchableOpacity
                  style={styles.counterButton}
                  onPress={incrementPassengers}
                  disabled={parseInt(formData.passengers) >= 10}
                >
                  <Ionicons 
                    name="add" 
                    size={18} 
                    color={parseInt(formData.passengers) >= 10 ? C.textMuted : C.text} 
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={18} color={C.red} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.searchButton, loading && styles.searchButtonDisabled]}
          onPress={handleSearch}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={C.white} />
          ) : (
            <>
              <Ionicons name="search" size={18} color={C.white} />
              <Text style={styles.searchButtonText}>Cari Bus</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => navigation.navigate('MyTickets')}
          >
            <Ionicons name="ticket" size={22} color={C.primary} />
            <Text style={styles.quickActionText}>Tiket Saya</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => {
              const today = new Date();
              setFormData({
                ...formData,
                departureDate: today,
              });
              handleSearch();
            }}
          >
            <Ionicons name="flash" size={22} color={C.amber} />
            <Text style={styles.quickActionText}>Berangkat Hari Ini</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <DatePicker
        modal
        open={showDatePicker}
        date={formData.departureDate}
        mode="date"
        onConfirm={handleDateChange}
        onCancel={() => setShowDatePicker(false)}
        minimumDate={new Date()}
        title="Pilih Tanggal Berangkat"
        confirmText="Pilih"
        cancelText="Batal"
      />

      <DatePicker
        modal
        open={showReturnDatePicker}
        date={returnDate}
        mode="date"
        onConfirm={handleReturnDateChange}
        onCancel={() => setShowReturnDatePicker(false)}
        minimumDate={formData.departureDate}
        title="Pilih Tanggal Kembali"
        confirmText="Pilih"
        cancelText="Batal"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.headerBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
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
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 32,
  },
  content: {
    flex: 1,
    backgroundColor: C.surface,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  tripTypeContainer: {
    flexDirection: 'row',
    backgroundColor: C.white,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tripTypeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tripTypeButtonActive: {
    backgroundColor: C.primaryLight,
  },
  tripTypeText: {
    fontSize: 14,
    color: C.textSub,
    fontWeight: '500',
  },
  tripTypeTextActive: {
    color: C.primary,
    fontWeight: '600',
  },
  card: {
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIcon: {
    marginRight: 12,
    width: 22,
    alignItems: 'center',
  },
  locationInputContainer: {
    flex: 1,
  },
  swapButton: {
    alignSelf: 'center',
    marginVertical: 8,
    backgroundColor: C.surface,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  inputLabel: {
    fontSize: 11,
    color: C.textMuted,
    marginBottom: 4,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    fontSize: 15,
    color: C.text,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateIcon: {
    marginRight: 12,
    width: 22,
    alignItems: 'center',
  },
  dateInputContainer: {
    flex: 1,
  },
  dateInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  dateText: {
    fontSize: 15,
    color: C.text,
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 12,
    marginLeft: 34,
  },
  passengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passengerIcon: {
    marginRight: 12,
    width: 22,
    alignItems: 'center',
  },
  passengerInputContainer: {
    flex: 1,
  },
  passengerCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: 120,
    paddingVertical: 4,
  },
  counterButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  passengerCount: {
    fontSize: 16,
    fontWeight: '600',
    color: C.text,
    minWidth: 40,
    textAlign: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.redLight,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.red,
  },
  errorText: {
    marginLeft: 8,
    fontSize: 13,
    color: C.red,
    flex: 1,
  },
  searchButton: {
    backgroundColor: C.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  searchButtonDisabled: {
    backgroundColor: C.primaryMuted,
    shadowOpacity: 0,
    elevation: 0,
  },
  searchButtonText: {
    color: C.white,
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
    backgroundColor: C.white,
    borderRadius: 12,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickAction: {
    alignItems: 'center',
    padding: 10,
  },
  quickActionText: {
    fontSize: 12,
    color: C.textSub,
    marginTop: 4,
    fontWeight: '500',
  },
});

export default SearchBusScreen;