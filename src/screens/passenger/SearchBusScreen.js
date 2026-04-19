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
  Platform,
} from 'react-native';
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

const SearchBusScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  
  // Get state from Redux
  const searchParams = useSelector(selectSearchParams);
  const loading = useSelector(selectBusLoading);
  const error = useSelector(selectBusError);
  
  // Local state for form
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

  // Load saved search params on mount
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
      // Ensure return date is not before departure date
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

    // Update search params in Redux
    dispatch(updateSearchParams({
      departure: formData.departure.trim(),
      destination: formData.destination.trim(),
      departureDate: formData.departureDate.toISOString(),
      passengers: parseInt(formData.passengers),
      returnDate: isRoundTrip ? returnDate.toISOString() : null,
      tripType: isRoundTrip ? 'round-trip' : 'one-way',
    }));

    // Clear previous results
    dispatch(clearSearchResults());

    // Prepare search parameters
    const searchParams = {
      departure: formData.departure.trim(),
      destination: formData.destination.trim(),
      departureDate: formData.departureDate.toISOString(),
      passengers: parseInt(formData.passengers),
      returnDate: isRoundTrip ? returnDate.toISOString() : null,
    };

    try {
      // Fetch available buses
      const result = await dispatch(fetchAvailableBuses(searchParams)).unwrap();
      
      if (result.data && result.data.length > 0) {
        // Navigate to bus list
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
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#1E88E5" barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cari Bus</Text>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Trip Type Selector */}
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

        {/* Location Inputs */}
        <View style={styles.card}>
          <View style={styles.locationRow}>
            <View style={styles.locationIcon}>
              <Ionicons name="location" size={24} color="#1E88E5" />
            </View>
            <View style={styles.locationInputContainer}>
              <Text style={styles.inputLabel}>Dari</Text>
              <TextInput
                style={styles.input}
                placeholder="Kota keberangkatan"
                value={formData.departure}
                onChangeText={(text) => handleInputChange('departure', text)}
                autoCapitalize="words"
              />
            </View>
          </View>
          
          <TouchableOpacity style={styles.swapButton} onPress={swapLocations}>
            <Ionicons name="swap-vertical" size={20} color="#666" />
          </TouchableOpacity>
          
          <View style={styles.locationRow}>
            <View style={styles.locationIcon}>
              <Ionicons name="location-outline" size={24} color="#4CAF50" />
            </View>
            <View style={styles.locationInputContainer}>
              <Text style={styles.inputLabel}>Ke</Text>
              <TextInput
                style={styles.input}
                placeholder="Kota tujuan"
                value={formData.destination}
                onChangeText={(text) => handleInputChange('destination', text)}
                autoCapitalize="words"
              />
            </View>
          </View>
        </View>

        {/* Date Selection */}
        <View style={styles.card}>
          <View style={styles.dateRow}>
            <View style={styles.dateIcon}>
              <Ionicons name="calendar" size={24} color="#1E88E5" />
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
                <Ionicons name="calendar-outline" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          </View>
          
          {isRoundTrip && (
            <>
              <View style={styles.divider} />
              <View style={styles.dateRow}>
                <View style={styles.dateIcon}>
                  <Ionicons name="calendar" size={24} color="#FF9800" />
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
                    <Ionicons name="calendar-outline" size={20} color="#666" />
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Passengers Selection */}
        <View style={styles.card}>
          <View style={styles.passengerRow}>
            <View style={styles.passengerIcon}>
              <Ionicons name="people" size={24} color="#1E88E5" />
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
                    size={20} 
                    color={parseInt(formData.passengers) <= 1 ? '#CCC' : '#333'} 
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
                    size={20} 
                    color={parseInt(formData.passengers) >= 10 ? '#CCC' : '#333'} 
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Recent Searches (Optional) */}
        <View style={styles.recentSearches}>
          <Text style={styles.recentTitle}>Pencarian Terakhir</Text>
          {/* You can map through recent searches from Redux state */}
        </View>

        {/* Error Display */}
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color="#F44336" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Search Button */}
        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleSearch}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="search" size={20} color="#FFF" />
              <Text style={styles.searchButtonText}>Cari Bus</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => navigation.navigate('MyTickets')}
          >
            <Ionicons name="ticket" size={24} color="#1E88E5" />
            <Text style={styles.quickActionText}>Tiket Saya</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => {
              // Set today's date
              const today = new Date();
              setFormData({
                ...formData,
                departureDate: today,
              });
              handleSearch();
            }}
          >
            <Ionicons name="flash" size={24} color="#FF9800" />
            <Text style={styles.quickActionText}>Berangkat Hari Ini</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Date Pickers */}
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
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#1E88E5',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  tripTypeContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  tripTypeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tripTypeButtonActive: {
    backgroundColor: '#E3F2FD',
  },
  tripTypeText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  tripTypeTextActive: {
    color: '#1E88E5',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIcon: {
    marginRight: 12,
  },
  locationInputContainer: {
    flex: 1,
  },
  swapButton: {
    alignSelf: 'center',
    marginVertical: 8,
    backgroundColor: '#F5F5F5',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  input: {
    fontSize: 16,
    color: '#333',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateIcon: {
    marginRight: 12,
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
    borderBottomColor: '#E0E0E0',
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 12,
    marginLeft: 36,
  },
  passengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passengerIcon: {
    marginRight: 12,
  },
  passengerInputContainer: {
    flex: 1,
  },
  passengerCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: 120,
  },
  counterButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  passengerCount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    minWidth: 40,
    textAlign: 'center',
  },
  recentSearches: {
    marginTop: 8,
    marginBottom: 16,
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#F44336',
    flex: 1,
  },
  searchButton: {
    backgroundColor: '#1E88E5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  searchButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  quickAction: {
    alignItems: 'center',
    padding: 12,
  },
  quickActionText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});

export default SearchBusScreen;