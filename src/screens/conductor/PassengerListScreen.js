import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { conductorService } from '../../services/conductorService';

const { height } = Dimensions.get('window');

const PassengerListScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { scheduleId } = route.params;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [passengers, setPassengers] = useState([]);
  const [filteredPassengers, setFilteredPassengers] = useState([]);
  const [scheduleInfo, setScheduleInfo] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    boarded: 0,
    pending: 0,
    missed: 0,
  });

  const filterOptions = [
    { id: 'all', label: 'Semua', icon: 'people', color: '#1E88E5' },
    { id: 'boarded', label: 'Sudah Naik', icon: 'checkmark-circle', color: '#4CAF50' },
    { id: 'pending', label: 'Belum Naik', icon: 'time', color: '#FF9800' },
    { id: 'missed', label: 'No Show', icon: 'close-circle', color: '#F44336' },
  ];

  useFocusEffect(
    useCallback(() => {
      loadPassengers();
    }, [scheduleId])
  );

  useEffect(() => {
    filterPassengers();
  }, [passengers, searchQuery, selectedFilter]);

  const loadPassengers = async () => {
    try {
      if (!refreshing) setLoading(true);
      const response = await conductorService.getPassengerList(scheduleId);
      const data = response.data.data;
      
      setScheduleInfo({
        bus_name: data.bus_name,
        departure_time: data.departure_time,
      });
      
      const passengerList = data.passengers || [];
      setPassengers(passengerList);
      
      // Calculate stats
      const total = passengerList.length;
      const boarded = passengerList.filter(p => p.boarding_status === 'boarded').length;
      const pending = passengerList.filter(p => p.boarding_status === 'pending').length;
      const missed = passengerList.filter(p => p.boarding_status === 'missed').length;
      
      setStats({ total, boarded, pending, missed });
    } catch (error) {
      console.error('Error loading passengers:', error);
      Alert.alert('Error', 'Gagal memuat daftar penumpang');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPassengers();
  };

  const filterPassengers = () => {
    let filtered = [...passengers];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.seat_number.toString().includes(query) ||
        p.ticket_code?.toLowerCase().includes(query)
      );
    }
    
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(p => p.boarding_status === selectedFilter);
    }
    
    // Sort by seat number
    filtered.sort((a, b) => a.seat_number.localeCompare(b.seat_number, undefined, {numeric: true}));
    
    setFilteredPassengers(filtered);
  };

  const handleUpdateStatus = (passenger, newStatus) => {
    const statusLabel = newStatus === 'boarded' ? 'Naik Bus' : 'No Show';
    
    Alert.alert(
      'Konfirmasi',
      `Tandai ${passenger.name} (Kursi ${passenger.seat_number}) sebagai ${statusLabel}?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Update',
          onPress: async () => {
            try {
              await conductorService.updateTicketStatus(passenger.ticket_id, newStatus);
              loadPassengers(); // Refresh list
            } catch (error) {
              Alert.alert('Error', 'Gagal update status penumpang');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'boarded': return '#4CAF50';
      case 'pending': return '#FF9800';
      case 'missed': return '#F44336';
      default: return '#757575';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'boarded': return 'Sudah Naik';
      case 'pending': return 'Belum Naik';
      case 'missed': return 'No Show';
      default: return status;
    }
  };

  const renderPassengerCard = ({ item }) => (
    <View style={styles.passengerCard}>
      <View style={styles.cardHeader}>
        <View style={styles.seatBadge}>
          <Text style={styles.seatText}>{item.seat_number}</Text>
        </View>
        <View style={styles.passengerInfo}>
          <Text style={styles.passengerName}>{item.name}</Text>
          <Text style={styles.ticketCode}>{item.ticket_code}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.boarding_status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.boarding_status)}</Text>
        </View>
      </View>
      
      <View style={styles.cardFooter}>
        <View style={styles.contactInfo}>
          <Ionicons name="call-outline" size={14} color="#666" />
          <Text style={styles.phoneText}>{item.phone || '-'}</Text>
        </View>
        
        <View style={styles.actionButtons}>
          {item.boarding_status === 'pending' && (
            <>
              <TouchableOpacity 
                style={[styles.actionButton, styles.boardButton]}
                onPress={() => handleUpdateStatus(item, 'boarded')}
              >
                <Ionicons name="bus" size={16} color="#FFF" />
                <Text style={styles.actionButtonText}>Naik</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, styles.noShowButton]}
                onPress={() => handleUpdateStatus(item, 'missed')}
              >
                <Ionicons name="close-circle" size={16} color="#FFF" />
                <Text style={styles.actionButtonText}>No Show</Text>
              </TouchableOpacity>
            </>
          )}
          {item.boarding_status !== 'pending' && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.resetButton]}
              onPress={() => handleUpdateStatus(item, 'pending')}
            >
              <Ionicons name="refresh" size={16} color="#666" />
              <Text style={[styles.actionButtonText, { color: '#666' }]}>Reset</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E88E5" />
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
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Daftar Penumpang</Text>
          <Text style={styles.headerSubtitle}>{scheduleInfo?.bus_name}</Text>
        </View>
        <TouchableOpacity 
          onPress={() => navigation.navigate('ScanTicket', { scheduleId })}
          style={styles.scanHeaderButton}
        >
          <Ionicons name="qr-code-scanner" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Stats Overview */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: '#4CAF50' }]}>{stats.boarded}</Text>
          <Text style={styles.statLabel}>Naik</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: '#FF9800' }]}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: '#F44336' }]}>{stats.missed}</Text>
          <Text style={styles.statLabel}>No Show</Text>
        </View>
      </View>

      {/* Search and Filters */}
      <View style={styles.filterSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari nama atau nomor kursi..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {filterOptions.map(option => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.filterBadge,
                selectedFilter === option.id && { backgroundColor: option.color }
              ]}
              onPress={() => setSelectedFilter(option.id)}
            >
              <Text style={[
                styles.filterText,
                selectedFilter === option.id && { color: '#FFF' }
              ]}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredPassengers}
        renderItem={renderPassengerCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#CCC" />
            <Text style={styles.emptyText}>Tidak ada penumpang ditemukan</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#1E88E5',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#E3F2FD',
    fontSize: 12,
  },
  scanHeaderButton: {
    padding: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingVertical: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#EEE',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  filterSection: {
    backgroundColor: '#FFF',
    marginTop: 10,
    paddingVertical: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F3F4',
    marginHorizontal: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    height: 40,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
  },
  filterScroll: {
    paddingLeft: 16,
    marginTop: 10,
  },
  filterBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F3F4',
    marginRight: 8,
  },
  filterText: {
    fontSize: 12,
    color: '#666',
  },
  listContent: {
    padding: 16,
    paddingBottom: 20,
  },
  passengerCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  seatBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  seatText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E88E5',
  },
  passengerInfo: {
    flex: 1,
  },
  passengerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  ticketCode: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F3F4',
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoneText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  boardButton: {
    backgroundColor: '#4CAF50',
  },
  noShowButton: {
    backgroundColor: '#F44336',
  },
  resetButton: {
    backgroundColor: '#F1F3F4',
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyText: {
    marginTop: 10,
    color: '#999',
    fontSize: 16,
  },
});

export default PassengerListScreen;