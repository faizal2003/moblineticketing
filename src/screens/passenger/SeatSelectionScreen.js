import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

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

const SeatSelectionScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();

  const selectedBus = useSelector(selectSelectedBus);
  const selectedSeats = useSelector(selectSelectedSeats);
  const seatMap = useSelector(selectSeatMap);
  const loading = useSelector(selectSeatLoading);
  const error = useSelector(selectSeatError);

  const [seatLayout, setSeatLayout] = useState([]);
  const [passengerCount, setPassengerCount] = useState(1);

  const {
    busId,
    scheduleId,
    busName,
    departure,
    destination,
    departureTime,
    price,
    passengerCount: pc,
  } = route.params || {};

  useEffect(() => {
    // Clear any seats selected from a previous booking session so the
    // selection always starts fresh for this schedule.
    dispatch(clearSeatSelection());

    if (pc) {
      setPassengerCount(pc);
    } else if (selectedBus) {
      setPassengerCount(selectedBus.passengerCount || 1);
    }

    if (busId && scheduleId) {
      dispatch(
        checkSeatAvailability({
          busId,
          scheduleId,
        }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busId, scheduleId]);

  useEffect(() => {
    if (seatMap && seatMap.length > 0) {
      setSeatLayout(seatMap);
    }
  }, [seatMap]);

  const handleSeatSelect = seat => {
    if (seat.status === 'booked') {
      Alert.alert(
        'Kursi Tidak Tersedia',
        'Kursi ini sudah dipesan oleh penumpang lain.',
      );
      return;
    }

    const isSelected = selectedSeats.some(s => s.number === seat.number);
    if (!isSelected && selectedSeats.length >= passengerCount) {
      Alert.alert(
        'Maksimum Kursi',
        `Anda hanya dapat memilih maksimal ${passengerCount} kursi.`,
      );
      return;
    }

    dispatch(
      toggleSeatSelection({
        number: seat.number,
        price: price,
        type: seat.type,
      }),
    );
  };

  const handleContinue = () => {
    if (selectedSeats.length === 0) {
      Alert.alert('Pilih Kursi', 'Silakan pilih kursi terlebih dahulu.');
      return;
    }

    if (selectedSeats.length !== passengerCount) {
      Alert.alert(
        'Jumlah Kursi Tidak Sesuai',
        `Anda harus memilih ${passengerCount} kursi untuk ${passengerCount} penumpang.`,
      );
      return;
    }

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
    if (status === 'booked') return C.surfaceAlt;
    if (isSelected) return C.green;

    switch (type) {
      case 'premium':
        return C.amber;
      default:
        return C.primary;
    }
  };

  const renderSeatLegend = () => (
    <View style={styles.legendContainer}>
      <View style={styles.legendRow}>
        <View style={[styles.legendItem, { backgroundColor: C.primary }]} />
        <Text style={styles.legendText}>Tersedia</Text>

        <View
          style={[
            styles.legendItem,
            { backgroundColor: C.green, marginLeft: 16 },
          ]}
        />
        <Text style={styles.legendText}>Terpilih</Text>

        <View
          style={[
            styles.legendItem,
            { backgroundColor: C.surfaceAlt, marginLeft: 16 },
          ]}
        />
        <Text style={styles.legendText}>Terisi</Text>
      </View>
    </View>
  );

  const renderDriverSection = () => (
    <View style={styles.driverSection}>
      <View style={styles.driverIcon}>
        <MaterialCommunityIcons name="steering" size={32} color={C.textSub} />
      </View>
      <Text style={styles.driverText}>Sopir</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={styles.loadingText}>Memuat denah kursi...</Text>
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

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={C.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pilih Kursi</Text>
        <TouchableOpacity
          style={styles.clearButton}
          onPress={handleClearSelection}
          disabled={selectedSeats.length === 0}
        >
          <Text
            style={[
              styles.clearButtonText,
              selectedSeats.length === 0 && {
                color: 'rgba(255, 255, 255, 0.5)',
              },
            ]}
          >
            Hapus
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.busInfoCard}>
        <View style={styles.busInfoRow}>
          <Text style={styles.busName}>{busName || 'Bus'}</Text>
        </View>
        <Text style={styles.routeText}>
          {departure || 'Jakarta'} → {destination || 'Bandung'}
        </Text>
        <Text style={styles.dateText}>{departureTime || ''}</Text>
      </View>

      {selectedSeats.length > 0 && (
        <View style={styles.selectionSummary}>
          <Text style={styles.summaryTitle}>Kursi Terpilih:</Text>
          <View style={styles.seatsList}>
            {selectedSeats.map((seat, index) => (
              <View key={index} style={styles.selectedSeatBadge}>
                <Text style={styles.selectedSeatText}>{seat.number}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.totalText}>
            Total: Rp{' '}
            {selectedSeats
              .reduce((sum, seat) => sum + (price || 0), 0)
              .toLocaleString('id-ID')}
          </Text>
        </View>
      )}

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.seatLayoutContainer}>
          {renderDriverSection()}

          {seatLayout.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.seatRow}>
              <Text style={styles.rowLabel}>
                {row[0]?.number.charAt(0) || ''}
              </Text>

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
                          selectedSeats.some(s => s.number === seat.number),
                        ),
                        marginRight: seatIndex === 1 ? 16 : 6,
                      },
                      seat.status === 'booked' && styles.seatBooked,
                      selectedSeats.some(s => s.number === seat.number) &&
                        styles.seatSelected,
                    ]}
                    onPress={() => handleSeatSelect(seat)}
                    disabled={seat.status === 'booked' || loading}
                  >
                    <Text
                      style={[
                        styles.seatText,
                        (seat.status === 'booked' ||
                          selectedSeats.some(s => s.number === seat.number)) &&
                          styles.seatTextWhite,
                      ]}
                    >
                      {seat.number}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>

        {renderSeatLegend()}

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="information-circle" size={18} color={C.primary} />
            <Text style={styles.infoTitle}>Informasi Penting:</Text>
          </View>
          <Text style={styles.infoText}>
            • Pilih {passengerCount} kursi untuk {passengerCount} penumpang
          </Text>
          <Text style={styles.infoText}>• Kursi abu-abu sudah dipesan</Text>
          <Text style={styles.infoText}>
            • Kursi kuning memiliki fasilitas premium
          </Text>
        </View>
      </ScrollView>

      <View style={styles.actionContainer}>
        <View style={styles.priceSummary}>
          <Text style={styles.priceLabel}>Total Pembayaran</Text>
          <Text style={styles.priceValue}>
            Rp{' '}
            {selectedSeats
              .reduce((sum, seat) => sum + (price || 0), 0)
              .toLocaleString('id-ID')}
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
            <ActivityIndicator color={C.white} />
          ) : (
            <>
              <Text style={styles.continueButtonText}>Lanjutkan</Text>
              <Ionicons name="arrow-forward" size={18} color={C.white} />
            </>
          )}
        </TouchableOpacity>
      </View>
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
  clearButton: {
    padding: 4,
  },
  clearButtonText: {
    color: C.headerText,
    fontSize: 14,
    fontWeight: '500',
  },
  busInfoCard: {
    backgroundColor: C.white,
    margin: 16,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  busInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  busName: {
    fontSize: 17,
    fontWeight: '700',
    color: C.text,
  },
  routeText: {
    fontSize: 15,
    color: C.text,
    marginBottom: 2,
  },
  dateText: {
    fontSize: 13,
    color: C.textSub,
  },
  selectionSummary: {
    backgroundColor: C.white,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text,
    marginBottom: 8,
  },
  seatsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  selectedSeatBadge: {
    backgroundColor: C.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: C.primaryMuted,
  },
  selectedSeatText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.primary,
  },
  totalText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.primary,
  },
  content: {
    flex: 1,
    backgroundColor: C.surface,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  seatLayoutContainer: {
    backgroundColor: C.white,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 14,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  driverSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  driverIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: C.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  driverText: {
    fontSize: 11,
    color: C.textSub,
    fontWeight: '500',
  },
  seatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  rowLabel: {
    width: 22,
    fontSize: 13,
    fontWeight: '600',
    color: C.text,
    textAlign: 'center',
  },
  seatsInRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginLeft: 8,
  },
  seatButton: {
    width: 38,
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  seatBooked: {
    borderColor: C.border,
  },
  seatSelected: {
    borderColor: C.green,
    borderWidth: 2,
  },
  seatText: {
    fontSize: 11,
    fontWeight: '600',
    color: C.white,
  },
  seatTextWhite: {
    color: C.white,
  },
  legendContainer: {
    backgroundColor: C.white,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  legendItem: {
    width: 18,
    height: 18,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: C.textSub,
    marginRight: 12,
  },
  infoCard: {
    backgroundColor: C.white,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text,
    marginLeft: 8,
  },
  infoText: {
    fontSize: 12,
    color: C.textSub,
    marginBottom: 3,
    marginLeft: 26,
    lineHeight: 16,
  },
  actionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: C.border,
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
    fontSize: 11,
    color: C.textSub,
    fontWeight: '500',
  },
  priceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: C.primary,
  },
  continueButton: {
    backgroundColor: C.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonDisabled: {
    backgroundColor: C.primaryMuted,
    shadowOpacity: 0,
    elevation: 0,
  },
  continueButtonText: {
    color: C.white,
    fontSize: 15,
    fontWeight: '600',
    marginRight: 6,
  },
});

export default SeatSelectionScreen;
