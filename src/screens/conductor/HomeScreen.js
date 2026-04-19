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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { conductorService } from '../../services/conductorService';
import { useFocusEffect } from '@react-navigation/native';

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
      // Backend returns array of schedules in response.data.data
      const data = response.data?.data || [];
      console.log('Conductor schedules loaded:', data.length);
      setSchedules(data);
    } catch (error) {
      console.error('Error fetching schedule:', error);
      // Don't show alert every time to avoid annoying user if network is flaky
      // but log it for debugging
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

  const renderScheduleItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.scheduleCard}
      onPress={() => navigation.navigate('PassengerList', { scheduleId: item.id })}
    >
      <View style={styles.scheduleHeader}>
        <View style={styles.busInfoContainer}>
          <Icon name="directions-bus" size={24} color="#1E88E5" />
          <View style={styles.busTextContainer}>
            <Text style={styles.busName}>{item.bus?.name || 'Bus'}</Text>
            <Text style={styles.busNumber}>{item.bus?.number || '-'} • {item.bus?.plate_number || '-'}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, item.status === 'active' ? styles.statusActive : styles.statusInactive]}>
          <Text style={styles.statusText}>{item.status?.toUpperCase() || 'UNKNOWN'}</Text>
        </View>
      </View>
      
      <View style={styles.routeInfo}>
        <View style={styles.location}>
          <Text style={styles.locationTime}>
            {item.departure_time ? new Date(item.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
          </Text>
          <Text style={styles.locationCity}>{item.departure_city}</Text>
        </View>
        
        <View style={styles.routeLine}>
          <View style={styles.line} />
          <Icon name="arrow-forward" size={20} color="#666" />
          <View style={styles.line} />
        </View>
        
        <View style={styles.location}>
          <Text style={styles.locationTime}>
            {item.arrival_time ? new Date(item.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
          </Text>
          <Text style={styles.locationCity}>{item.arrival_city}</Text>
        </View>
      </View>
      
      <View style={styles.scheduleFooter}>
        <View style={styles.statItem}>
          <Icon name="people" size={18} color="#666" />
          <Text style={styles.statText}>{item.total_passengers || 0} Terdaftar</Text>
        </View>
        <View style={styles.statItem}>
          <Icon name="check-circle" size={18} color="#4CAF50" />
          <Text style={styles.statText}>{item.boarded_passengers || 0} Sudah Naik</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Halo, {user?.name}</Text>
          <Text style={styles.role}>Kondektur Dashboard</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Icon name="logout" size={24} color="#F44336" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Jadwal Hari Ini</Text>
          <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
            <Icon name="refresh" size={22} color="#1E88E5" />
          </TouchableOpacity>
        </View>

        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1E88E5" />
            <Text style={styles.loadingText}>Memuat jadwal...</Text>
          </View>
        ) : (
          <FlatList
            data={schedules}
            renderItem={renderScheduleItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.noScheduleCard}>
                <Icon name="event-busy" size={60} color="#CCC" />
                <Text style={styles.noScheduleText}>Tidak ada jadwal hari ini</Text>
                <Text style={styles.noScheduleSubtext}>
                  Geser ke bawah untuk menyegarkan halaman atau hubungi admin.
                </Text>
                <TouchableOpacity style={styles.scanEmptyButton} onPress={() => navigation.navigate('ScanTicket')}>
                  <Icon name="qr-code-scanner" size={24} color="#FFF" />
                  <Text style={styles.scanEmptyButtonText}>Scan Tiket Saja</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
      </View>

      {/* Floating Action Button (Always shown if not loading) */}
      {!loading && (
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => navigation.navigate('ScanTicket')}
          activeOpacity={0.8}
        >
          <Icon name="qr-code-scanner" size={28} color="#FFF" />
          <Text style={styles.fabText}>Scan Tiket</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

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
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  greeting: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  role: {
    fontSize: 12,
    color: '#1E88E5',
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  logoutButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  refreshButton: {
    padding: 4,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  scheduleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#1E88E5',
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
  busTextContainer: {
    marginLeft: 10,
  },
  busName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  busNumber: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: '#E8F5E8',
  },
  statusInactive: {
    backgroundColor: '#FFEBEE',
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333',
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#F1F3F4',
    borderRadius: 8,
  },
  location: {
    flex: 1,
    alignItems: 'center',
  },
  locationTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  locationCity: {
    fontSize: 11,
    color: '#666',
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
    backgroundColor: '#CCC',
  },
  scheduleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
  },
  noScheduleCard: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    backgroundColor: '#FFF',
    borderRadius: 20,
    marginHorizontal: 10,
    elevation: 2,
  },
  noScheduleText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 15,
  },
  noScheduleSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  scanEmptyButton: {
    backgroundColor: '#1E88E5',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 25,
  },
  scanEmptyButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    marginLeft: 10,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 25,
    backgroundColor: '#1E88E5',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 35,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  fabText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});