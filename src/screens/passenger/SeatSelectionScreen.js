import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  toggleSeatSelection,
  clearSeatSelection,
  checkSeatAvailability,
  selectSelectedSeats,
  selectSeatMap,
  selectSeatLoading,
  selectSeatError,
  selectSelectedBus,
} from '../../store/slices/bookingSlice';

const SeatSelectionScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  
  // Get state from Redux
  const selectedBus = useSelector(selectSelectedBus);
  const selectedSeats = useSelector(selectSelectedSeats);
  const seatMap = useSelector(selectSeatMap);
  const loading = useSelector(selectSeatLoading);
  const error = useSelector(selectSeatError);
  
  const [seatLayout, setSeatLayout] = useState([]);
  const [passengerCount, setPassengerCount] = useState(1);

  const { busId, scheduleId, busName, departure, destination, departureTime, price, passengerCount: pc } = route.params || {};

  useEffect(() => {
    // Initialize from route params or Redux state
    if (pc) {
      setPassengerCount(pc);
    } else if (selectedBus) {
      setPassengerCount(selectedBus.passengerCount || 1);
    }

    // Check seat availability
    if (busId && scheduleId) {
      dispatch(checkSeatAvailability({
        busId,
        scheduleId
      }));
    }
  }, [selectedBus]);

  useEffect(() => {
    if (seatMap && seatMap.length > 0) {
      setSeatLayout(seatMap);
    }
  }, [seatMap]);

  const handleSeatSelect = (seat) => {
    if (seat.status === 'booked') {
      Alert.alert('Kursi Tidak Tersedia', 'Kursi ini sudah dipesan oleh penumpang lain.');
      return;
    }

    // Check if max seats reached
    const isSelected = selectedSeats.some(s => s.number === seat.number);
    if (!isSelected && selectedSeats.length >= passengerCount) {
      Alert.alert(
        'Maksimum Kursi',
        `Anda hanya dapat memilih maksimal ${passengerCount} kursi.`
      );
      return;
    }

    dispatch(toggleSeatSelection({
      number: seat.number,
      price: price,
      type: seat.type,
    }));
  };

  const handleContinue = () => {
    if (selectedSeats.length === 0) {
      Alert.alert('Pilih Kursi', 'Silakan pilih kursi terlebih dahulu.');
      return;
    }

    if (selectedSeats.length !== passengerCount) {
      Alert.alert(
        'Jumlah Kursi Tidak Sesuai',
        `Anda harus memilih ${passengerCount} kursi untuk ${passengerCount} penumpang.`
      );
      return;
    }

    // Navigate to booking screen
    navigation.navigate('Booking', {
      busId,
      scheduleId,
      busName,
      departure,
      destination,
      departureTime,
      price,
      selectedSeats,
      passengerCount,
    });
  };

  const handleClearSelection = () => {
    dispatch(clearSeatSelection());
  };

  const getSeatTypeColor = (type, status, isSelected) => {
    if (status === 'booked') return '#E0E0E0';
    if (isSelected) return '#4CAF50';
    
    switch (type) {
      case 'premium':
        return '#FF9800';
      default:
        return '#1E88E5';
    }
  };

  const renderSeatLegend = () => (
    <View style={styles.legendContainer}>
      <View style={styles.legendRow}>
        <View style={[styles.legendItem, { backgroundColor: '#1E88E5' }]} />
        <Text style={styles.legendText}>Tersedia</Text>
        
        <View style={[styles.legendItem, { backgroundColor: '#4CAF50' }]} />
        <Text style={styles.legendText}>Terpilih</Text>
        
        <View style={[styles.legendItem, { backgroundColor: '#E0E0E0' }]} />
        <Text style={styles.legendText}>Terisi</Text>
      </View>
    </View>
  );

  const renderDriverSection = () => (
    <View style={styles.driverSection}>
      <View style={styles.driverIcon}>
        <Ionicons name="steering-wheel" size={40} color="#666" />
      </View>
      <Text style={styles.driverText}>Sopir</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E88E5" />
        <Text style={styles.loadingText}>Memuat denah kursi...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#1E88E5" barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pilih Kursi</Text>
        <TouchableOpacity 
          style={styles.clearButton}
          onPress={handleClearSelection}
          disabled={selectedSeats.length === 0}
        >
          <Text style={[
            styles.clearButtonText,
            selectedSeats.length === 0 && { color: 'rgba(255, 255, 255, 0.5)' }
          ]}>
            Hapus
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bus Info */}
      <View style={styles.busInfoCard}>
        <View style={styles.busInfoRow}>
          <Text style={styles.busName}>{busName || 'Bus'}</Text>
        </View>
        <Text style={styles.routeText}>
          {departure || 'Jakarta'} → {destination || 'Bandung'}
        </Text>
        <Text style={styles.dateText}>
          {departureTime || ''}
        </Text>
      </View>

      {/* Selected Seats Summary */}
      {selectedSeats.length > 0 && (
        <View style={styles.selectionSummary}>
          <Text style={styles.summaryTitle}>Kursi Terpilih:</Text>
          <View style={styles.seatsList}>
            {selectedSeats.map((seat, index) => (
              <View key={index} style={styles.selectedSeatBadge}>
                <Text style={styles.selectedSeatText}>{seat.number}</Text>
                <Text style={styles.selectedSeatPrice}>
                  Rp {price?.toLocaleString('id-ID') || '0'}
                </Text>
              </View>
            ))}
          </View>
          <Text style={styles.totalText}>
            Total: Rp {selectedSeats.reduce((sum, seat) => sum + (price || 0), 0).toLocaleString('id-ID')}
          </Text>
        </View>
      )}

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Seat Layout */}
        <View style={styles.seatLayoutContainer}>
          {renderDriverSection()}
          
          {seatLayout.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.seatRow}>
              <Text style={styles.rowLabel}>{row[0]?.number.charAt(0) || ''}</Text>
              
              <View style={styles.seatsInRow}>
                {row.map((seat, seatIndex) => (
                  <TouchableOpacity
                    key={seatIndex}
                    style={[
                      styles.seatButton,
                      { 
                        backgroundColor: getSeatTypeColor(
                          seat.type,
                          seat.status,
                          selectedSeats.some(s => s.number === seat.number)
                        ),
                        marginRight: seatIndex === 1 ? 20 : 8, // Aisle gap
                      },
                    ]}
                    onPress={() => handleSeatSelect(seat)}
                    disabled={seat.status === 'booked' || loading}
                  >
                    <Text style={[
                      styles.seatText,
                      (seat.status === 'booked' || selectedSeats.some(s => s.number === seat.number)) && { color: '#FFF' }
                    ]}>
                      {seat.number}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* Legend */}
        {renderSeatLegend()}

        {/* Additional Info */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="information-circle" size={20} color="#1E88E5" />
            <Text style={styles.infoTitle}>Informasi Penting:</Text>
          </View>
          <Text style={styles.infoText}>
            • Pilih {passengerCount} kursi untuk {passengerCount} penumpang
          </Text>
          <Text style={styles.infoText}>
            • Kursi berwarna abu-abu sudah dipesan
          </Text>
          <Text style={styles.infoText}>
            • Kursi premium memiliki fasilitas tambahan
          </Text>
          <Text style={styles.infoText}>
            • Silakan hubungi customer service untuk kebutuhan khusus
          </Text>
        </View>
      </ScrollView>

      {/* Action Button */}
      <View style={styles.actionContainer}>
        <View style={styles.priceSummary}>
          <Text style={styles.priceLabel}>Total Pembayaran</Text>
          <Text style={styles.priceValue}>
            Rp {selectedSeats.reduce((sum, seat) => sum + (price || 0), 0).toLocaleString('id-ID')}
          </Text>
        </View>
        
        <TouchableOpacity
          style={[
            styles.continueButton,
            selectedSeats.length === 0 && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={selectedSeats.length === 0 || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Text style={styles.continueButtonText}>Lanjutkan</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFF" />
            </>
          )}
        </TouchableOpacity>
      </View>
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
  clearButton: {
    padding: 4,
  },
  clearButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  busInfoCard: {
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
  busInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  busName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  busClass: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  routeText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    color: '#666',
  },
  selectionSummary: {
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
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  seatsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  selectedSeatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  selectedSeatText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E88E5',
    marginRight: 4,
  },
  selectedSeatPrice: {
    fontSize: 12,
    color: '#666',
  },
  totalText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E88E5',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  seatLayoutContainer: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  driverSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  driverIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  driverText: {
    fontSize: 12,
    color: '#666',
  },
  seatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rowLabel: {
    width: 24,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  seatsInRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginLeft: 12,
  },
  seatButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  seatText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  premiumIcon: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  legendContainer: {
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
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendItem: {
    width: 20,
    height: 20,
    borderRadius: 4,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
    marginRight: 16,
  },
  infoCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    marginLeft: 28,
    lineHeight: 16,
  },
  actionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceSummary: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
    color: '#666',
  },
  priceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E88E5',
  },
  continueButton: {
    backgroundColor: '#1E88E5',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  continueButtonDisabled: {
    backgroundColor: '#90CAF9',
  },
  continueButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
});

export default SeatSelectionScreen;