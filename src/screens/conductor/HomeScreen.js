import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
  FlatList,
  StatusBar,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { conductorService } from '../../services/conductorService';
import { useFocusEffect } from '@react-navigation/native';

const parseLocalDate = (dateStr) => {
  if (!dateStr) return new Date();
  return new Date(dateStr);
};

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

export default function ConductorHome({ navigation }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [schedules, setSchedules] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchTodaySchedule();
    }, [])
  );

  const fetchTodaySchedule = async () => {
    try {
      setLoading(true);
      const response = await conductorService.getTodaySchedule();
      const data = response.data?.data || [];
      setSchedules(data);
    } catch (error) {
      console.error('Error fetching schedule:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTodaySchedule();
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Apakah Anda yakin ingin keluar?',
      [
        { text: 'Batal', style: 'cancel' },
        { 
          text: 'Keluar', 
          onPress: () => dispatch(logout()),
          style: 'destructive'
        },
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return C.green;
      case 'completed': return C.primary;
      case 'cancelled': return C.red;
      default: return C.textMuted;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return 'AKTIF';
      case 'completed': return 'SELESAI';
      case 'cancelled': return 'DIBATALKAN';
      default: return status?.toUpperCase() || 'UNKNOWN';
    }
  };

  const renderScheduleItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.scheduleCard, { borderLeftColor: getStatusColor(item.status) }]}
      onPress={() => navigation.navigate('PassengerList', { scheduleId: item.id })}
      activeOpacity={0.75}
    >
      <View style={styles.scheduleHeader}>
        <View style={styles.busInfoContainer}>
          <View style={styles.busIconWrap}>
            <Icon name="directions-bus" size={22} color={C.primary} />
          </View>
          <View style={styles.busTextContainer}>
            <Text style={styles.busName}>{item.bus?.name || 'Bus'}</Text>
            <Text style={styles.busNumber}>{item.bus?.number || '-'} • {item.bus?.plate_number || '-'}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {getStatusText(item.status)}
          </Text>
        </View>
      </View>
      
      <View style={styles.routeInfo}>
        <View style={styles.location}>
          <Text style={styles.locationTime}>
            {item.departure_time ? parseLocalDate(item.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
          </Text>
          <Text style={styles.locationCity}>{item.departure_city}</Text>
        </View>
        
        <View style={styles.routeLine}>
          <View style={styles.line} />
          <View style={styles.arrowIcon}>
            <Icon name="arrow-forward" size={16} color={C.textMuted} />
          </View>
          <View style={styles.line} />
        </View>
        
        <View style={styles.location}>
          <Text style={styles.locationTime}>
            {item.arrival_time ? parseLocalDate(item.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
          </Text>
          <Text style={styles.locationCity}>{item.arrival_city}</Text>
        </View>
      </View>
      
      <View style={styles.scheduleFooter}>
        <View style={styles.statItem}>
          <Icon name="people" size={16} color={C.textSub} />
          <Text style={styles.statText}>{item.total_passengers || 0} Terdaftar</Text>
        </View>
        <View style={styles.statItem}>
          <Icon name="check-circle" size={16} color={C.green} />
          <Text style={[styles.statText, { color: C.green }]}>{item.boarded_passengers || 0} Sudah Naik</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.headerBg} translucent={false} />
      
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {user?.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>{user?.name ? user.name.charAt(0).toUpperCase() : 'U'}</Text>
            </View>
          )}
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.greeting}>Halo, {user?.name}</Text>
            <Text style={styles.role}>Kondektur</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Icon name="logout" size={22} color={C.headerText} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Jadwal Hari Ini</Text>
          <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
            <Icon name="refresh" size={20} color={C.primary} />
          </TouchableOpacity>
        </View>

        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={styles.loadingText}>Memuat jadwal...</Text>
          </View>
        ) : (
          <FlatList
            data={schedules}
            renderItem={renderScheduleItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContainer}
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
                  <Icon name="event-busy" size={64} color={C.textMuted} />
                </View>
                <Text style={styles.emptyTitle}>Tidak ada jadwal hari ini</Text>
                <Text style={styles.emptySubtext}>
                  Geser ke bawah untuk menyegarkan halaman
                </Text>
                <TouchableOpacity style={styles.emptyScanButton} onPress={() => navigation.navigate('ScanTicket')}>
                  <Icon name="qr-code-scanner" size={20} color={C.white} />
                  <Text style={styles.emptyScanButtonText}>Scan Tiket</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
      </View>

      {!loading && (
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => navigation.navigate('ScanTicket')}
          activeOpacity={0.8}
        >
          <Icon name="qr-code-scanner" size={24} color={C.white} />
          <Text style={styles.fabText}>Scan Tiket</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: C.headerBg,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#93C5FD',
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#93C5FD',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  greeting: {
    fontSize: 20,
    fontWeight: '700',
    color: C.headerText,
  },
  role: {
    fontSize: 12,
    color: C.headerSub,
    fontWeight: '500',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  logoutButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
  },
  content: {
    flex: 1,
    backgroundColor: C.surface,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: C.text,
  },
  refreshButton: {
    padding: 6,
    backgroundColor: C.primaryLight,
    borderRadius: 8,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  scheduleCard: {
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  busInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  busIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: C.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  busTextContainer: {
    flex: 1,
  },
  busName: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
  },
  busNumber: {
    fontSize: 12,
    color: C.textSub,
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    padding: 12,
    backgroundColor: C.surface,
    borderRadius: 10,
  },
  location: {
    flex: 1,
    alignItems: 'center',
  },
  locationTime: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
  },
  locationCity: {
    fontSize: 11,
    color: C.textSub,
    marginTop: 4,
    textAlign: 'center',
  },
  routeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 0.8,
    justifyContent: 'center',
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: C.border,
  },
  arrowIcon: {
    marginHorizontal: 6,
  },
  scheduleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.surfaceAlt,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    color: C.textSub,
    marginLeft: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: C.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: C.textSub,
    marginTop: 6,
    textAlign: 'center',
  },
  emptyScanButton: {
    backgroundColor: C.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 20,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyScanButtonText: {
    color: C.white,
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 24,
    backgroundColor: C.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 30,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  fabText: {
    color: C.white,
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 10,
  },
});