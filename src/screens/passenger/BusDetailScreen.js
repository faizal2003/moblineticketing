import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  StatusBar,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import Entypo from 'react-native-vector-icons/Entypo';

import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { selectSearchParams } from '../../store/slices/bookingSlice';
import { busService } from '../../services/busService';

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

const BusDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const searchParams = useSelector(selectSearchParams);

  const {
    busId,
    scheduleId,
    busName,
    departure,
    destination,
    departureTime,
    arrivalTime,
    price,
  } = route.params || {};

  const [loading, setLoading] = useState(false);
  const [busDetails, setBusDetails] = useState({
    id: busId,
    name: busName || 'Bus',
    type: 'Executive Class',
    facilities: [],
    totalSeats: 0,
    availableSeats: 0,
    departure: departure || '',
    destination: destination || '',
    departureTime: departureTime || '',
    arrivalTime: arrivalTime || '',
    duration: '',
    price: price || 0,
    policies: [
      'Tiket tidak dapat diubah atau dibatalkan',
      'Check-in minimal 30 menit sebelum keberangkatan',
      'Dilarang merokok di dalam bus',
      'Binatang peliharaan tidak diperbolehkan',
    ],
  });

  useEffect(() => {
    fetchBusDetails();
  }, [busId]);

  const fetchBusDetails = async () => {
    try {
      setLoading(true);
      const response = await busService.getBusDetails(busId);
      const data = response.data.data.bus;

      const schedule =
        data.schedules.find(s => s.id === scheduleId) || data.schedules[0];

      setBusDetails({
        ...busDetails,
        name: data.name,
        type: data.type,
        image: data.image,
        facilities: data.facilities || [],
        totalSeats: data.total_seats,
        availableSeats: schedule ? schedule.available_seats : data.total_seats,
        departureTime: schedule
          ? new Date(schedule.departure_time).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })
          : busDetails.departureTime,
        arrivalTime: schedule
          ? new Date(schedule.arrival_time).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })
          : busDetails.arrivalTime,
        price: schedule ? schedule.price : busDetails.price,
        duration: schedule
          ? calculateDuration(schedule.departure_time, schedule.arrival_time)
          : '4 jam',
      });
    } catch (error) {
      console.error('Error fetching bus details:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDuration = (start, end) => {
    const diff = new Date(end) - new Date(start);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours} jam ${minutes} menit`;
  };

  const handleBookNow = () => {
    // Get passenger count from Redux searchParams
    const passengerCount = searchParams?.passengers || 1;

    navigation.navigate('SeatSelection', {
      busId: busId,
      scheduleId: scheduleId,
      busName: busDetails.name,
      departure: busDetails.departure,
      destination: busDetails.destination,
      departureTime: busDetails.departureTime,
      price: busDetails.price,
      totalSeats: busDetails.totalSeats,
      availableSeats: busDetails.availableSeats,
      passengerCount: passengerCount,
    });
  };

  const renderFacilityItem = ({ item }) => (
    <View style={styles.facilityItem}>
      <View style={styles.facilityIcon}>
        <Ionicons name="checkmark-circle" size={16} color={C.green} />
      </View>
      <Text style={styles.facilityText}>{item}</Text>
    </View>
  );

  const renderPolicyItem = ({ item, index }) => (
    <View style={styles.policyItem}>
      <View style={styles.policyNumber}>
        <Text style={styles.policyNumberText}>{index + 1}</Text>
      </View>
      <Text style={styles.policyText}>{item}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={styles.loadingText}>Memuat detail bus...</Text>
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
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={C.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detail Bus</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {busDetails.image && (
          <Image
            source={{ uri: busDetails.image }}
            style={styles.heroImage}
            resizeMode="cover"
          />
        )}

        <View
          style={[
            styles.busInfoCard,
            busDetails.image && styles.busInfoCardOverlap,
          ]}
        >
          <View style={styles.busHeader}>
            <View style={styles.busIconContainer}>
              <Ionicons name="bus" size={30} color={C.primary} />
            </View>
            <View style={styles.busTitleContainer}>
              <Text style={styles.busName}>{busDetails.name}</Text>
              <Text style={styles.busType}>{busDetails.type}</Text>
            </View>
          </View>

          <View style={styles.routeContainer}>
            <View style={styles.routeTimeline}>
              <View style={styles.timelineDot} />
              <View style={styles.timelineLine} />
              <View
                style={[styles.timelineDot, styles.timelineDotDestination]}
              />
            </View>
            <View style={styles.routeDetails}>
              <View style={styles.routeStop}>
                <Text style={styles.routeCity}>{busDetails.departure}</Text>
                <Text style={styles.routeTime}>{busDetails.departureTime}</Text>
              </View>
              <View style={styles.durationContainer}>
                <View style={styles.durationBadge}>
                  <Ionicons name="time-outline" size={14} color={C.primary} />
                  <Text style={styles.durationText}>{busDetails.duration}</Text>
                </View>
              </View>
              <View style={styles.routeStop}>
                <Text style={[styles.routeCity, styles.destinationCity]}>
                  {busDetails.destination}
                </Text>
                <Text style={styles.routeTime}>{busDetails.arrivalTime}</Text>
              </View>
            </View>
          </View>

          <View style={styles.seatsInfo}>
            <View style={styles.seatItem}>
              <Ionicons name="bus-outline" size={18} color={C.textSub} />
              <Text style={styles.seatLabel}>Total</Text>
              <Text style={styles.seatValue}>{busDetails.totalSeats}</Text>
            </View>
            <View style={styles.seatDivider} />
            <View style={styles.seatItem}>
              <Ionicons
                name="checkmark-circle-outline"
                size={18}
                color={C.green}
              />
              <Text style={styles.seatLabel}>Tersedia</Text>
              <Text style={[styles.seatValue, styles.availableSeats]}>
                {busDetails.availableSeats}
              </Text>
            </View>
            <View style={styles.seatDivider} />
            <View style={styles.seatItem}>
              <Ionicons name="close-circle-outline" size={18} color={C.red} />
              <Text style={styles.seatLabel}>Terisi</Text>
              <Text style={[styles.seatValue, styles.bookedSeats]}>
                {busDetails.totalSeats - busDetails.availableSeats}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Fasilitas</Text>
          <FlatList
            data={busDetails.facilities}
            renderItem={renderFacilityItem}
            keyExtractor={(item, index) => index.toString()}
            numColumns={2}
            scrollEnabled={false}
            contentContainerStyle={styles.facilitiesList}
          />
        </View>

        <View style={styles.priceCard}>
          <View>
            <Text style={styles.priceLabel}>Harga per orang</Text>
            <Text style={styles.priceValue}>
              Rp {busDetails.price.toLocaleString('id-ID')}
            </Text>
          </View>
          <TouchableOpacity style={styles.bookButton} onPress={handleBookNow}>
            <Text style={styles.bookButtonText}>Pilih Kursi</Text>
            <Ionicons name="arrow-forward" size={20} color={C.white} />
          </TouchableOpacity>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Kebijakan & Ketentuan</Text>
          <FlatList
            data={busDetails.policies}
            renderItem={renderPolicyItem}
            keyExtractor={(item, index) => index.toString()}
            scrollEnabled={false}
          />
        </View>

        <View style={styles.contactCard}>
          <View style={styles.contactIconWrap}>
            <Ionicons name="headset-outline" size={22} color={C.primary} />
          </View>
          <View style={styles.contactInfo}>
            <Text style={styles.contactTitle}>Butuh Bantuan?</Text>
            <Text style={styles.contactText}>
              Hubungi customer service kami
            </Text>
          </View>
          <TouchableOpacity style={styles.contactButton}>
            <Text style={styles.contactButtonText}>Hubungi</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  scrollContent: {
    paddingBottom: 24,
  },
  heroImage: {
    width: '100%',
    height: 200,
    backgroundColor: C.primaryLight,
  },
  busInfoCard: {
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
  busInfoCardOverlap: {
    marginTop: -20,
  },
  busHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  busIconContainer: {
    backgroundColor: C.primaryLight,
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: C.primaryMuted,
  },
  busTitleContainer: {
    flex: 1,
  },
  busName: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
  },
  busType: {
    fontSize: 13,
    color: C.textSub,
    marginTop: 2,
  },
  routeContainer: {
    flexDirection: 'row',
    marginVertical: 16,
  },
  routeTimeline: {
    alignItems: 'center',
    marginRight: 16,
    paddingTop: 4,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: C.primary,
  },
  timelineDotDestination: {
    backgroundColor: C.green,
  },
  timelineLine: {
    width: 2,
    height: 40,
    backgroundColor: C.primary,
    marginVertical: 4,
  },
  routeDetails: {
    flex: 1,
  },
  routeStop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  routeCity: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
  },
  destinationCity: {
    color: C.green,
  },
  routeTime: {
    fontSize: 13,
    color: C.textSub,
  },
  durationContainer: {
    alignItems: 'center',
    marginVertical: 6,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 6,
  },
  durationText: {
    fontSize: 12,
    color: C.primary,
    fontWeight: '500',
  },
  seatsInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: C.surface,
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  seatItem: {
    alignItems: 'center',
    flex: 1,
  },
  seatLabel: {
    fontSize: 11,
    color: C.textMuted,
    marginTop: 4,
    fontWeight: '500',
  },
  seatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
    marginTop: 2,
  },
  availableSeats: {
    color: C.green,
  },
  bookedSeats: {
    color: C.red,
  },
  seatDivider: {
    width: 1,
    height: '80%',
    backgroundColor: C.border,
  },
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
    marginBottom: 12,
  },
  facilitiesList: {
    paddingBottom: 4,
  },
  facilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: 10,
  },
  facilityIcon: {
    marginRight: 8,
  },
  facilityText: {
    fontSize: 13,
    color: C.textSub,
  },
  priceCard: {
    backgroundColor: C.white,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  priceLabel: {
    fontSize: 13,
    color: C.textSub,
  },
  priceValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: C.primary,
    marginTop: 2,
  },
  bookButton: {
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
  bookButtonText: {
    color: C.white,
    fontSize: 15,
    fontWeight: '700',
    marginRight: 8,
  },
  policyItem: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  policyNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  policyNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.primary,
  },
  policyText: {
    fontSize: 13,
    color: C.textSub,
    flex: 1,
    lineHeight: 20,
  },
  contactCard: {
    backgroundColor: C.white,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  contactIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: C.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
  },
  contactText: {
    fontSize: 12,
    color: C.textSub,
    marginTop: 1,
  },
  contactButton: {
    backgroundColor: C.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  contactButtonText: {
    color: C.primary,
    fontSize: 13,
    fontWeight: '600',
  },
});

export default BusDetailScreen;
