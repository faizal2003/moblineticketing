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
    { id: 'all', label: 'Semua', color: C.primary },
    { id: 'boarded', label: 'Sudah Naik', color: C.green },
    { id: 'pending', label: 'Belum Naik', color: C.amber },
    { id: 'missed', label: 'No Show', color: C.red },
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
              loadPassengers();
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
      case 'boarded': return C.green;
      case 'pending': return C.amber;
      case 'missed': return C.red;
      default: return C.textMuted;
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

  const getStatusBgColor = (status) => {
    switch (status) {
      case 'boarded': return C.greenLight;
      case 'pending': return C.amberLight;
      case 'missed': return C.redLight;
      default: return C.surface;
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
        <View style={[styles.statusBadge, { backgroundColor: getStatusBgColor(item.boarding_status) }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.boarding_status) }]}>
            {getStatusText(item.boarding_status)}
          </Text>
        </View>
      </View>
      
      <View style={styles.cardFooter}>
        <View style={styles.contactInfo}>
          <Ionicons name="call-outline" size={14} color={C.textSub} />
          <Text style={styles.phoneText}>{item.phone || '-'}</Text>
        </View>
        
        <View style={styles.actionButtons}>
          {item.boarding_status === 'pending' && (
            <>
              <TouchableOpacity 
                style={[styles.actionButton, styles.boardButton]}
                onPress={() => handleUpdateStatus(item, 'boarded')}
              >
                <Ionicons name="bus" size={14} color={C.white} />
                <Text style={styles.actionButtonText}>Naik</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, styles.noShowButton]}
                onPress={() => handleUpdateStatus(item, 'missed')}
              >
                <Ionicons name="close-circle" size={14} color={C.white} />
                <Text style={styles.actionButtonText}>No Show</Text>
              </TouchableOpacity>
            </>
          )}
          {item.boarding_status !== 'pending' && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.resetButton]}
              onPress={() => handleUpdateStatus(item, 'pending')}
            >
              <Ionicons name="refresh" size={14} color={C.textSub} />
              <Text style={[styles.actionButtonText, { color: C.textSub }]}>Reset</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={styles.loadingText}>Memuat data penumpang...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.headerBg} translucent={false} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={C.headerText} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Daftar Penumpang</Text>
          <Text style={styles.headerSubtitle}>{scheduleInfo?.bus_name}</Text>
        </View>
        <TouchableOpacity 
          onPress={() => navigation.navigate('ScanTicket', { scheduleId })}
          style={styles.scanHeaderButton}
        >
          <Ionicons name="qr-code-scanner" size={24} color={C.headerText} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: C.green }]}>{stats.boarded}</Text>
          <Text style={styles.statLabel}>Naik</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: C.amber }]}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: C.red }]}>{stats.missed}</Text>
          <Text style={styles.statLabel}>No Show</Text>
        </View>
      </View>

      <View style={styles.filterSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={C.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari nama atau nomor kursi..."
            placeholderTextColor={C.textMuted}
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
                selectedFilter === option.id && { color: C.white }
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
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={[C.primary]}
            tintColor={C.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="people-outline" size={56} color={C.textMuted} />
            </View>
            <Text style={styles.emptyText}>Tidak ada penumpang ditemukan</Text>
            <Text style={styles.emptySubtext}>Coba ubah filter atau kata kunci pencarian</Text>
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
    backgroundColor: C.headerBg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    color: C.headerText,
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: C.headerSub,
    fontSize: 12,
    marginTop: 2,
  },
  scanHeaderButton: {
    padding: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: C.white,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: C.border,
    alignSelf: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: C.text,
  },
  statLabel: {
    fontSize: 11,
    color: C.textSub,
    marginTop: 2,
    fontWeight: '500',
  },
  filterSection: {
    backgroundColor: C.white,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    borderRadius: 10,
    height: 42,
    borderWidth: 1,
    borderColor: C.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: C.text,
    paddingVertical: 0,
  },
  filterScroll: {
    paddingLeft: 16,
    marginTop: 10,
  },
  filterBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: C.surface,
    marginRight: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  filterText: {
    fontSize: 12,
    color: C.textSub,
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    paddingBottom: 20,
    backgroundColor: C.surface,
    flexGrow: 1,
  },
  passengerCard: {
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  seatBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: C.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: C.primaryMuted,
  },
  seatText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.primary,
  },
  passengerInfo: {
    flex: 1,
  },
  passengerName: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
  },
  ticketCode: {
    fontSize: 11,
    color: C.textSub,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.surfaceAlt,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoneText: {
    fontSize: 12,
    color: C.textSub,
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
    borderRadius: 8,
    marginLeft: 8,
  },
  boardButton: {
    backgroundColor: C.green,
  },
  noShowButton: {
    backgroundColor: C.red,
  },
  resetButton: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  actionButtonText: {
    color: C.white,
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '600',
    color: C.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 13,
    color: C.textSub,
    marginTop: 4,
  },
});

export default PassengerListScreen;