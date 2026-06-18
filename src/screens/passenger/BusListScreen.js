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
  red: '#EF4444',
  white: '#FFFFFF',
  headerBg: '#1E3A5F',
  headerText: '#FFFFFF',
  headerSub: '#93C5FD',
};

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
      activeOpacity={0.75}
    >
      <View style={styles.busHeader}>
        {item.bus.image ? (
          <Image source={{ uri: item.bus.image }} style={styles.busImage} />
        ) : (
          <View style={styles.busIconPlaceholder}>
            <Ionicons name="bus" size={24} color={C.primary} />
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
          <Text style={styles.timeText}>
            {new Date(item.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <Text style={styles.cityText}>{item.route.origin}</Text>
        </View>
        
        <View style={styles.durationInfo}>
          <Text style={styles.durationText}>{item.route.duration}</Text>
          <View style={styles.routeLine} />
          <Ionicons name="bus" size={14} color={C.primary} />
        </View>

        <View style={styles.timeInfo}>
          <Text style={styles.timeText}>
            {new Date(item.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <Text style={styles.cityText}>{item.route.destination}</Text>
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
        <View style={styles.availabilityBadge}>
          <Text style={styles.availableSeats}>
            {item.available_seats} / {item.bus.total_seats} kursi
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.headerBg} translucent={false} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={C.headerText} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{searchParams.departure} → {searchParams.destination}</Text>
          <Text style={styles.headerSubtitle}>
            {new Date(searchParams.departureDate).toLocaleDateString('id-ID', { 
              day: 'numeric', 
              month: 'short', 
              year: 'numeric' 
            })} • {searchParams.passengers} Penumpang
          </Text>
        </View>
      </View>

      <FlatList
        data={availableBuses}
        renderItem={renderBusItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="bus-outline" size={64} color={C.textMuted} />
            </View>
            <Text style={styles.emptyText}>Tidak ada bus tersedia</Text>
            <Text style={styles.emptySubtext}>
              Coba cari rute atau tanggal lain
            </Text>
          </View>
        }
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
    backgroundColor: C.headerBg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.headerText,
  },
  headerSubtitle: {
    fontSize: 12,
    color: C.headerSub,
    marginTop: 2,
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
    backgroundColor: C.surface,
    flexGrow: 1,
  },
  busCard: {
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  busHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  busImage: {
    width: 48,
    height: 48,
    borderRadius: 10,
    marginRight: 12,
  },
  busIconPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: C.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  busInfo: {
    flex: 1,
  },
  busName: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
  },
  busType: {
    fontSize: 12,
    color: C.textSub,
    marginTop: 2,
  },
  busPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: C.primary,
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  timeInfo: {
    alignItems: 'center',
    flex: 1,
  },
  timeText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
  },
  cityText: {
    fontSize: 12,
    color: C.textSub,
    marginTop: 4,
  },
  durationInfo: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 8,
  },
  durationText: {
    fontSize: 11,
    color: C.textMuted,
    marginBottom: 4,
  },
  routeLine: {
    height: 1,
    backgroundColor: C.border,
    width: '100%',
    marginBottom: 4,
  },
  busFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: C.surfaceAlt,
    paddingTop: 12,
  },
  facilities: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  facilityBadge: {
    backgroundColor: C.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
  },
  facilityText: {
    fontSize: 10,
    color: C.textSub,
    fontWeight: '500',
  },
  moreFacilities: {
    fontSize: 10,
    color: C.textMuted,
  },
  availabilityBadge: {
    backgroundColor: C.greenLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  availableSeats: {
    fontSize: 11,
    color: C.green,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: C.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: C.textSub,
    marginTop: 4,
  },
});

export default BusListScreen;