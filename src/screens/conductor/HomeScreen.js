import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { conductorService } from '../../services/conductorService';

export default function ConductorHome({ navigation }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [todaySchedule, setTodaySchedule] = useState(null);
  const [passengerList, setPassengerList] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTodaySchedule();
  }, []);

  const fetchTodaySchedule = async () => {
    try {
      setLoading(true);
      const response = await conductorService.getTodaySchedule();
      setTodaySchedule(response.data.schedule);
      
      if (response.data.schedule) {
        fetchPassengerList(response.data.schedule.id);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load schedule');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchPassengerList = async (scheduleId) => {
    try {
      const response = await conductorService.getPassengerList(scheduleId);
      setPassengerList(response.data.passengers);
    } catch (error) {
      console.error('Error fetching passenger list:', error);
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

  const handleScanTicket = () => {
    navigation.navigate('ScanTicket', {
      scheduleId: todaySchedule?.id,
    });
  };

  const handlePassengerStatus = async (passengerId, currentStatus) => {
    const newStatus = currentStatus === 'checked_in' ? 'not_checked' : 'checked_in';
    
    try {
      await conductorService.updatePassengerStatus(passengerId, newStatus);
      // Refresh passenger list
      fetchPassengerList(todaySchedule.id);
      Alert.alert('Success', `Passenger status updated to ${newStatus}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update passenger status');
    }
  };

  const renderPassengerItem = ({ item }) => (
    <View style={styles.passengerCard}>
      <View style={styles.passengerInfo}>
        <Text style={styles.passengerName}>{item.passenger_name}</Text>
        <Text style={styles.passengerDetails}>
          Seat: {item.seat_number} • Ticket: {item.ticket_code}
        </Text>
      </View>
      <TouchableOpacity
        style={[
          styles.statusButton,
          item.status === 'checked_in' ? styles.statusChecked : styles.statusNotChecked,
        ]}
        onPress={() => handlePassengerStatus(item.id, item.status)}
      >
        <Text style={[
          styles.statusButtonText,
          item.status === 'checked_in' ? styles.statusButtonTextChecked : styles.statusButtonTextNotChecked,
        ]}>
          {item.status === 'checked_in' ? 'Checked' : 'Check In'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading schedule...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome, {user?.name}</Text>
          <Text style={styles.role}>Conductor</Text>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Icon name="logout" size={24} color="#F44336" />
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Today's Schedule Card */}
        {todaySchedule ? (
          <View style={styles.scheduleCard}>
            <View style={styles.scheduleHeader}>
              <Icon name="directions-bus" size={24} color="#1E88E5" />
              <Text style={styles.scheduleTitle}>Today's Schedule</Text>
            </View>
            
            <View style={styles.scheduleDetails}>
              <View style={styles.routeInfo}>
                <View style={styles.location}>
                  <Text style={styles.locationTime}>
                    {new Date(todaySchedule.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <Text style={styles.locationCity}>{todaySchedule.origin_city}</Text>
                </View>
                
                <View style={styles.routeLine}>
                  <View style={styles.line} />
                  <Icon name="arrow-forward" size={20} color="#666" />
                  <View style={styles.line} />
                </View>
                
                <View style={styles.location}>
                  <Text style={styles.locationTime}>
                    {new Date(todaySchedule.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <Text style={styles.locationCity}>{todaySchedule.destination_city}</Text>
                </View>
              </View>
              
              <View style={styles.busInfo}>
                <Text style={styles.busNumber}>Bus: {todaySchedule.bus?.bus_number}</Text>
                <Text style={styles.driverName}>Driver: {todaySchedule.bus?.driver_name}</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.noScheduleCard}>
            <Icon name="event-busy" size={48} color="#9E9E9E" />
            <Text style={styles.noScheduleText}>No schedule for today</Text>
            <Text style={styles.noScheduleSubtext}>Check back later</Text>
          </View>
        )}

        {/* Quick Actions */}
        {todaySchedule && (
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickActionCard} onPress={handleScanTicket}>
              <View style={[styles.quickActionIcon, { backgroundColor: '#E3F2FD' }]}>
                <Icon name="qr-code-scanner" size={32} color="#1E88E5" />
              </View>
              <Text style={styles.quickActionText}>Scan Ticket</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('PassengerList', { scheduleId: todaySchedule.id })}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#E8F5E8' }]}>
                <Icon name="people" size={32} color="#388E3C" />
              </View>
              <Text style={styles.quickActionText}>Passenger List</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Passenger List Preview */}
        {passengerList.length > 0 && (
          <View style={styles.passengerSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Passengers ({passengerList.length})</Text>
              <TouchableOpacity onPress={() => navigation.navigate('PassengerList', { scheduleId: todaySchedule.id })}>
                <Text style={styles.seeAll}>View All</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.passengerStats}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {passengerList.filter(p => p.status === 'checked_in').length}
                </Text>
                <Text style={styles.statLabel}>Checked In</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {passengerList.filter(p => p.status === 'not_checked').length}
                </Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{passengerList.length}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
            </View>
            
            {/* Sample passenger list (show first 3) */}
            {passengerList.slice(0, 3).map((passenger) => (
              <View key={passenger.id} style={styles.passengerCard}>
                <View style={styles.passengerInfo}>
                  <Text style={styles.passengerName}>{passenger.passenger_name}</Text>
                  <Text style={styles.passengerDetails}>
                    Seat: {passenger.seat_number} • {passenger.ticket_code}
                  </Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  passenger.status === 'checked_in' ? styles.statusCheckedBadge : styles.statusPendingBadge,
                ]}>
                  <Text style={[
                    styles.statusBadgeText,
                    passenger.status === 'checked_in' ? styles.statusBadgeTextChecked : styles.statusBadgeTextPending,
                  ]}>
                    {passenger.status === 'checked_in' ? '✓ Checked' : 'Pending'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  greeting: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  role: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  scheduleCard: {
    margin: 20,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  scheduleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  scheduleDetails: {
    marginTop: 10,
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  location: {
    flex: 1,
    alignItems: 'center',
  },
  locationTime: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  locationCity: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  routeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 2,
    justifyContent: 'center',
  },
  line: {
    flex: 1,
    height: 2,
    backgroundColor: '#E0E0E0',
  },
  busInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  busNumber: {
    fontSize: 14,
    color: '#666',
  },
  driverName: {
    fontSize: 14,
    color: '#666',
  },
  noScheduleCard: {
    margin: 20,
    padding: 40,
    backgroundColor: '#F5F5F5',
    borderRadius: 15,
    alignItems: 'center',
  },
  noScheduleText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 15,
  },
  noScheduleSubtext: {
    fontSize: 14,
    color: '#9E9E9E',
    marginTop: 5,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  quickActionCard: {
    alignItems: 'center',
    width: '45%',
  },
  quickActionIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  passengerSection: {
    paddingHorizontal: 20,
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
  passengerStats: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E0E0E0',
  },
  passengerCard: {
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
  passengerInfo: {
    flex: 1,
  },
  passengerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  passengerDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusCheckedBadge: {
    backgroundColor: '#E8F5E8',
  },
  statusPendingBadge: {
    backgroundColor: '#FFF3E0',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusBadgeTextChecked: {
    color: '#388E3C',
  },
  statusBadgeTextPending: {
    color: '#F57C00',
  },
  statusButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  statusChecked: {
    backgroundColor: '#E8F5E8',
  },
  statusNotChecked: {
    backgroundColor: '#FFF3E0',
  },
  statusButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusButtonTextChecked: {
    color: '#388E3C',
  },
  statusButtonTextNotChecked: {
    color: '#F57C00',
  },
});