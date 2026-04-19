import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  StatusBar,
  FlatList,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import Entypo from 'react-native-vector-icons/Entypo';

import { useNavigation, useRoute } from '@react-navigation/native';

const BusDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { busId, busName, departure, destination, departureTime, arrivalTime, price } = route.params || {};

  const [loading, setLoading] = useState(false);
  const [busDetails, setBusDetails] = useState({
    id: busId || 'BUS001',
    name: busName || 'Sinar Jaya Executive',
    type: 'Executive Class',
    facilities: ['AC', 'Reclining Seats', 'TV', 'Toilet', 'WiFi', 'Charger'],
    totalSeats: 40,
    availableSeats: 24,
    rating: 4.5,
    reviews: 128,
    departure: departure || 'Jakarta',
    destination: destination || 'Bandung',
    departureTime: departureTime || '08:00',
    arrivalTime: arrivalTime || '12:00',
    duration: '4 jam',
    price: price || 150000,
    policies: [
      'Tiket tidak dapat diubah atau dibatalkan',
      'Check-in minimal 30 menit sebelum keberangkatan',
      'Dilarang merokok di dalam bus',
      'Binatang peliharaan tidak diperbolehkan',
    ],
  });

  const [selectedFacilities, setSelectedFacilities] = useState([]);

  useEffect(() => {
    // Simulasi fetch data dari API
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, []);

  const handleBookNow = () => {
    navigation.navigate('SeatSelection', {
      busId: busDetails.id,
      busName: busDetails.name,
      departure: busDetails.departure,
      destination: busDetails.destination,
      departureTime: busDetails.departureTime,
      price: busDetails.price,
      totalSeats: busDetails.totalSeats,
      availableSeats: busDetails.availableSeats,
    });
  };

  const renderFacilityItem = ({ item }) => (
    <View style={styles.facilityItem}>
      <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
      <Text style={styles.facilityText}>{item}</Text>
    </View>
  );

  const renderPolicyItem = ({ item, index }) => (
    <View style={styles.policyItem}>
      <Text style={styles.policyNumber}>{index + 1}.</Text>
      <Text style={styles.policyText}>{item}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E88E5" />
        <Text style={styles.loadingText}>Memuat detail bus...</Text>
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
        <Text style={styles.headerTitle}>Detail Bus</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Bus Info Card */}
        <View style={styles.busInfoCard}>
          <View style={styles.busHeader}>
            <View style={styles.busIconContainer}>
              <Ionicons name="bus" size={32} color="#1E88E5" />
            </View>
            <View style={styles.busTitleContainer}>
              <Text style={styles.busName}>{busDetails.name}</Text>
              <Text style={styles.busType}>{busDetails.type}</Text>
            </View>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text style={styles.ratingText}>{busDetails.rating} ({busDetails.reviews} review)</Text>
            </View>
          </View>

          {/* Route Information */}
          <View style={styles.routeContainer}>
            <View style={styles.routeItem}>
              <View style={styles.routeDot} />
              <View style={styles.routeLine} />
              <View style={styles.routeDot} />
            </View>
            <View style={styles.routeDetails}>
              <View style={styles.routeStop}>
                <Text style={styles.departureText}>{busDetails.departure}</Text>
                <Text style={styles.timeText}>{busDetails.departureTime}</Text>
              </View>
              <View style={styles.durationContainer}>
                <Text style={styles.durationText}>{busDetails.duration}</Text>
                <Ionicons name="time-outline" size={16} color="#666" />
              </View>
              <View style={styles.routeStop}>
                <Text style={styles.destinationText}>{busDetails.destination}</Text>
                <Text style={styles.timeText}>{busDetails.arrivalTime}</Text>
              </View>
            </View>
          </View>

          {/* Seats Information */}
          <View style={styles.seatsInfo}>
            <View style={styles.seatItem}>
              <Ionicons name="person-outline" size={20} color="#666" />
              <Text style={styles.seatLabel}>Total Kursi</Text>
              <Text style={styles.seatValue}>{busDetails.totalSeats}</Text>
            </View>
            <View style={styles.seatDivider} />
            <View style={styles.seatItem}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#4CAF50" />
              <Text style={styles.seatLabel}>Tersedia</Text>
              <Text style={[styles.seatValue, styles.availableSeats]}>{busDetails.availableSeats}</Text>
            </View>
            <View style={styles.seatDivider} />
            <View style={styles.seatItem}>
              <Ionicons name="close-circle-outline" size={20} color="#F44336" />
              <Text style={styles.seatLabel}>Terisi</Text>
              <Text style={[styles.seatValue, styles.bookedSeats]}>
                {busDetails.totalSeats - busDetails.availableSeats}
              </Text>
            </View>
          </View>
        </View>

        {/* Facilities Section */}
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

        {/* Price Section */}
        <View style={styles.priceCard}>
          <View>
            <Text style={styles.priceLabel}>Harga per orang</Text>
            <Text style={styles.priceValue}>Rp {busDetails.price.toLocaleString('id-ID')}</Text>
          </View>
          <TouchableOpacity style={styles.bookButton} onPress={handleBookNow}>
            <Text style={styles.bookButtonText}>Pilih Kursi</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Policies Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Kebijakan & Ketentuan</Text>
          <FlatList
            data={busDetails.policies}
            renderItem={renderPolicyItem}
            keyExtractor={(item, index) => index.toString()}
            scrollEnabled={false}
          />
        </View>

        {/* Contact Support */}
        <View style={styles.contactCard}>
          <Ionicons name="headset-outline" size={24} color="#1E88E5" />
          <View style={styles.contactInfo}>
            <Text style={styles.contactTitleButuh}>Butuh Bantuan?</Text>
            <Text style={styles.contactText}>Hubungi customer service kami</Text>
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
  busHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  busIconContainer: {
    backgroundColor: '#E3F2FD',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  busTitleContainer: {
    flex: 1,
  },
  busName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  busType: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '500',
  },
  routeContainer: {
    flexDirection: 'row',
    marginVertical: 16,
  },
  routeItem: {
    alignItems: 'center',
    marginRight: 16,
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#1E88E5',
  },
  routeLine: {
    width: 2,
    height: 40,
    backgroundColor: '#1E88E5',
    marginVertical: 4,
  },
  routeDetails: {
    flex: 1,
  },
  routeStop: {
    justifyContent: 'space-between',
    flexDirection: 'row',
    marginBottom: 8,
  },
  departureText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  destinationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  timeText: {
    fontSize: 14,
    color: '#666',
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  durationText: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  seatsInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  seatItem: {
    alignItems: 'center',
    flex: 1,
  },
  seatLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  seatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 2,
  },
  availableSeats: {
    color: '#4CAF50',
  },
  bookedSeats: {
    color: '#F44336',
  },
  seatDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#E0E0E0',
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
    marginBottom: 12,
  },
  facilitiesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  facilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: 12,
  },
  facilityText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#555',
  },
  priceCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
  },
  priceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E88E5',
    marginTop: 4,
  },
  bookButton: {
    backgroundColor: '#1E88E5',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  bookButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  policyItem: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  policyNumber: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
    minWidth: 20,
  },
  policyText: {
    fontSize: 14,
    color: '#555',
    flex: 1,
    lineHeight: 20,
  },
  contactCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  contactInfo: {
    flex: 1,
    marginLeft: 12,
  },
  contactTitleButuh: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  contactText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  contactButton: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  contactButtonText: {
    color: '#1E88E5',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default BusDetailScreen;