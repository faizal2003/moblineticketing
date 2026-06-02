import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSelector, useDispatch } from 'react-redux';
import { selectBus } from '../../store/slices/bookingSlice';

const BusListScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { availableBuses, searchParams, busLoading } = useSelector((state) => state.booking);

  const handleSelectBus = (bus) => {
    dispatch(selectBus(bus));
    navigation.navigate('BusDetail', {
      busId: bus.bus_id,
      scheduleId: bus.id,
      busName: bus.bus.name,
      departure: bus.route.origin,
      destination: bus.route.destination,
      departureTime: new Date(bus.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      arrivalTime: new Date(bus.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      price: bus.price,
    });
  };

  const renderBusItem = ({ item }) => (
    <TouchableOpacity
      style={styles.busCard}
      onPress={() => handleSelectBus(item)}
    >
      <View style={styles.busHeader}>
        {item.bus.image ? (
          <Image source={{ uri: item.bus.image }} style={styles.listBusImage} />
        ) : (
          <View style={styles.listBusIconPlaceholder}>
            <Ionicons name="bus" size={24} color="#1E88E5" />
          </View>
        )}
        <View style={styles.busInfo}>
          <Text style={styles.busName}>{item.bus.name}</Text>
          <Text style={styles.busType}>{item.bus.type}</Text>
        </View>
        <Text style={styles.busPrice}>Rp {item.price.toLocaleString('id-ID')}</Text>
      </View>

      <View style={styles.routeContainer}>
        <View style={styles.timeInfo}>
          <Text style={styles.time}>{new Date(item.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          <Text style={styles.city}>{item.route.origin}</Text>
        </View>
        
        <View style={styles.durationInfo}>
          <Text style={styles.duration}>{item.route.duration}</Text>
          <View style={styles.line} />
          <Ionicons name="bus" size={16} color="#1E88E5" />
        </View>

        <View style={styles.timeInfo}>
          <Text style={styles.time}>{new Date(item.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          <Text style={styles.city}>{item.route.destination}</Text>
        </View>
      </View>

      <View style={styles.busFooter}>
        <View style={styles.facilities}>
          {item.bus.facilities.slice(0, 3).map((facility, index) => (
            <View key={index} style={styles.facilityBadge}>
              <Text style={styles.facilityText}>{facility}</Text>
            </View>
          ))}
          {item.bus.facilities.length > 3 && (
            <Text style={styles.moreFacilities}>+{item.bus.facilities.length - 3}</Text>
          )}
        </View>
        <Text style={styles.availableSeats}>{item.available_seats} / {item.bus.total_seats} kursi tersedia</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#1E88E5" barStyle="light-content" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{searchParams.departure} → {searchParams.destination}</Text>
          <Text style={styles.headerSubtitle}>
            {new Date(searchParams.departureDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} • {searchParams.passengers} Penumpang
          </Text>
        </View>
      </View>

      <FlatList
        data={availableBuses}
        renderItem={renderBusItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="bus-outline" size={80} color="#CCC" />
            <Text style={styles.emptyText}>Tidak ada bus tersedia</Text>
          </View>
        }
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#E3F2FD',
  },
  listContent: {
    padding: 16,
  },
  busCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  busHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  listBusImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  listBusIconPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  busInfo: {
    flex: 1,
  },
  busName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  busType: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  busPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E88E5',
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  timeInfo: {
    alignItems: 'center',
    flex: 1,
  },
  time: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  city: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  durationInfo: {
    alignItems: 'center',
    flex: 1,
  },
  duration: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  line: {
    height: 1,
    backgroundColor: '#E0E0E0',
    width: '100%',
    marginBottom: 4,
  },
  busFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  facilities: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  facilityBadge: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 6,
  },
  facilityText: {
    fontSize: 10,
    color: '#666',
  },
  moreFacilities: {
    fontSize: 10,
    color: '#999',
  },
  availableSeats: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
});

export default BusListScreen;