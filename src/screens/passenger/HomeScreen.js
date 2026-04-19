import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  TextInput,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DatePicker from 'react-native-date-picker';
import { busService } from '../../services/busService';
import { logout } from '../../store/slices/authSlice';
import { 
  updateSearchParams, 
  fetchAvailableBuses, 
  clearSearchResults 
} from '../../store/slices/bookingSlice';

export default function PassengerHome({ navigation }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [searchParams, setSearchParams] = useState({
    origin: '',
    destination: '',
    date: new Date(),
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [popularRoutes, setPopularRoutes] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    fetchPopularRoutes();
    fetchRecentBookings();
  }, []);

  const fetchPopularRoutes = async () => {
    try {
      // Fetch popular routes from API
      const response = await busService.getPopularRoutes();
      setPopularRoutes(response.data.data);
    } catch (error) {
      console.error('Error fetching popular routes:', error);
    }
  };

  const fetchRecentBookings = async () => {
    try {
      const response = await busService.getMyBookings();
      setRecentBookings(response.data.data.slice(0, 3));
    } catch (error) {
      console.error('Error fetching recent bookings:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          onPress: () => dispatch(logout()),
          style: 'destructive'
        },
      ]
    );
  };

  const handleSearch = async () => {
    if (!searchParams.origin || !searchParams.destination) {
      Alert.alert('Error', 'Silakan pilih kota asal dan tujuan');
      return;
    }

    if (searchParams.origin.toLowerCase() === searchParams.destination.toLowerCase()) {
      Alert.alert('Error', 'Kota asal dan tujuan tidak boleh sama');
      return;
    }

    setIsSearching(true);
    try {
      const params = {
        departure: searchParams.origin,
        destination: searchParams.destination,
        departureDate: searchParams.date.toISOString(),
        passengers: 1,
      };

      // Update search params in Redux
      dispatch(updateSearchParams(params));
      
      // Clear previous results
      dispatch(clearSearchResults());

      // Fetch available buses
      const result = await dispatch(fetchAvailableBuses(params)).unwrap();
      
      if (result.data && result.data.length > 0) {
        navigation.navigate('BusList');
      } else {
        Alert.alert(
          'Tidak Ditemukan',
          'Tidak ada bus yang tersedia untuk rute dan tanggal tersebut.'
        );
      }
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Error', 'Gagal mencari bus. Silakan coba lagi.');
    } finally {
      setIsSearching(false);
    }
  };

  const renderPopularRoute = ({ item }) => (
    <TouchableOpacity
      style={styles.routeCard}
      onPress={async () => {
        setIsSearching(true);
        try {
          const params = {
            departure: item.origin,
            destination: item.destination,
            departureDate: searchParams.date.toISOString(),
            passengers: 1,
          };
          dispatch(updateSearchParams(params));
          dispatch(clearSearchResults());
          const result = await dispatch(fetchAvailableBuses(params)).unwrap();
          if (result.data && result.data.length > 0) {
            navigation.navigate('BusList');
          } else {
            Alert.alert('Tidak Ditemukan', 'Tidak ada bus tersedia untuk rute ini.');
          }
        } catch (error) {
          Alert.alert('Error', 'Gagal mencari bus.');
        } finally {
          setIsSearching(false);
        }
      }}
    >
      <View style={styles.routeInfo}>
        <Text style={styles.routeCities}>{item.origin} → {item.destination}</Text>
        <Text style={styles.routePrice}>{item.formatted_price}</Text>
      </View>
      <Icon name="arrow-forward-ios" size={16} color="#666" />
    </TouchableOpacity>
  );

  const renderRecentBooking = ({ item }) => (
    <TouchableOpacity
      style={styles.bookingCard}
      onPress={() => navigation.navigate('TicketDetail', { 
        ticket: { id: item.id } 
      })}
    >
      <View style={styles.bookingHeader}>
        <Text style={styles.bookingRoute}>{item.schedule?.departure_city} → {item.schedule?.arrival_city}</Text>
        <Text style={[styles.bookingStatus, 
          item.booking_status === 'confirmed' ? styles.statusConfirmed : styles.statusPending
        ]}>
          {item.booking_status}
        </Text>
      </View>
      <Text style={styles.bookingDate}>
        {new Date(item.schedule?.departure_time).toLocaleDateString()}
      </Text>
      <Text style={styles.bookingSeats}>Seats: {item.seats?.join(', ') || '-'}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {user?.name}</Text>
            <Text style={styles.subGreeting}>Where do you want to go?</Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity onPress={() => navigation.navigate('MyTickets')} style={styles.headerIcon}>
              <Icon name="confirmation-number" size={28} color="#1E88E5" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} style={styles.headerIcon}>
              <Icon name="logout" size={28} color="#F44336" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Section */}
        <View style={styles.searchSection}>
          <View style={styles.searchInputContainer}>
            <Icon name="location-on" size={20} color="#1E88E5" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="From"
              placeholderTextColor="#999"
              value={searchParams.origin}
              onChangeText={(text) => setSearchParams({ ...searchParams, origin: text })}
            />
          </View>
          
          <View style={styles.searchInputContainer}>
            <Icon name="location-on" size={20} color="#1E88E5" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="To"
              placeholderTextColor="#999"
              value={searchParams.destination}
              onChangeText={(text) => setSearchParams({ ...searchParams, destination: text })}
            />
          </View>
          
          <View style={styles.searchInputContainer}>
            <Icon name="calendar-today" size={20} color="#1E88E5" style={styles.searchIcon} />
            <TouchableOpacity 
              style={styles.searchInput} 
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={{ color: searchParams.date ? '#333' : '#999', fontSize: 16 }}>
                {searchParams.date.toLocaleDateString('id-ID')}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.searchButton, isSearching && { backgroundColor: '#90CAF9' }]} 
            onPress={handleSearch}
            disabled={isSearching}
          >
            {isSearching ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.searchButtonText}>Search Bus</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Popular Routes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Popular Routes</Text>
            <TouchableOpacity onPress={() => navigation.navigate('SearchBus')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={popularRoutes}
            renderItem={renderPopularRoute}
            keyExtractor={(item, index) => item.id?.toString() || index.toString()}
            scrollEnabled={false}
          />
        </View>

        {/* Recent Bookings */}
        {recentBookings.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Bookings</Text>
              <TouchableOpacity onPress={() => navigation.navigate('MyTickets')}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={recentBookings}
              renderItem={renderRecentBooking}
              keyExtractor={(item, index) => item.id?.toString() || index.toString()}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickAction} onPress={() => navigation.navigate('MyTickets')}>
            <View style={[styles.quickActionIcon, { backgroundColor: '#E3F2FD' }]}>
              <Icon name="confirmation-number" size={24} color="#1E88E5" />
            </View>
            <Text style={styles.quickActionText}>My Tickets</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickAction}>
            <View style={[styles.quickActionIcon, { backgroundColor: '#F3E5F5' }]}>
              <Icon name="history" size={24} color="#7B1FA2" />
            </View>
            <Text style={styles.quickActionText}>History</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickAction}>
            <View style={[styles.quickActionIcon, { backgroundColor: '#E8F5E8' }]}>
              <Icon name="support-agent" size={24} color="#388E3C" />
            </View>
            <Text style={styles.quickActionText}>Support</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <DatePicker
        modal
        open={showDatePicker}
        date={searchParams.date}
        mode="date"
        onConfirm={(date) => {
          setShowDatePicker(false);
          setSearchParams({ ...searchParams, date });
        }}
        onCancel={() => {
          setShowDatePicker(false);
        }}
        minimumDate={new Date()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginLeft: 15,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subGreeting: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  searchSection: {
    padding: 20,
    backgroundColor: '#F8F9FA',
    marginHorizontal: 20,
    borderRadius: 15,
    marginTop: 10,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 15,
    height: 50,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  searchButton: {
    backgroundColor: '#1E88E5',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  seeAll: {
    color: '#1E88E5',
    fontSize: 14,
  },
  routeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  routeInfo: {
    flex: 1,
  },
  routeCities: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  routePrice: {
    fontSize: 14,
    color: '#1E88E5',
    marginTop: 5,
  },
  bookingCard: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  bookingRoute: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  bookingStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  statusConfirmed: {
    backgroundColor: '#E8F5E8',
    color: '#388E3C',
  },
  statusPending: {
    backgroundColor: '#FFF3E0',
    color: '#F57C00',
  },
  bookingDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  bookingSeats: {
    fontSize: 14,
    color: '#666',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  quickAction: {
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    color: '#666',
  },
});