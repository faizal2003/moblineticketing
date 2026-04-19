import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
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
  Animated,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import Entypo from 'react-native-vector-icons/Entypo';

import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';

const { width, height } = Dimensions.get('window');

const PassengerListScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedBus, setSelectedBus] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('all'); // 'all', 'checked-in', 'not-checked-in', 'no-show'
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showBusFilter, setShowBusFilter] = useState(false);
  const [showPassengerModal, setShowPassengerModal] = useState(false);
  const [selectedPassenger, setSelectedPassenger] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    checkedIn: 0,
    notCheckedIn: 0,
    noShow: 0,
    onboard: 0,
  });
  const slideAnim = useState(new Animated.Value(300))[0];

  // Data bus yang dikelola konduktor
  const buses = [
    { id: 'BUS001', name: 'Sinar Jaya Executive', number: 'SJ 7890 AB', route: 'Jakarta - Bandung' },
    { id: 'BUS002', name: 'Primajasa', number: 'PJ 1234 CD', route: 'Bandung - Yogyakarta' },
    { id: 'BUS003', name: 'Rosalia Indah', number: 'RI 5678 EF', route: 'Surabaya - Malang' },
  ];

  // Data penumpang dummy
  const samplePassengers = [
    {
      id: 'PASS001',
      bookingId: 'BKG001',
      ticketId: 'TKT001',
      passengerName: 'Ahmad Fauzi',
      seatNumber: 'A1',
      boardingPoint: 'Terminal Kampung Rambutan',
      dropPoint: 'Terminal Leuwi Panjang',
      status: 'checked-in', // 'checked-in', 'not-checked-in', 'no-show', 'onboard'
      checkInTime: '07:30',
      boardingTime: '07:45',
      phoneNumber: '081234567890',
      identityNumber: '1234567890123456',
      ticketPrice: 150000,
      paymentMethod: 'Bank Transfer',
      specialNotes: 'Membawa koper besar',
      passengerType: 'Dewasa',
      baggageCount: 2,
      hasPaid: true,
      qrCode: 'QR001',
    },
    {
      id: 'PASS002',
      bookingId: 'BKG001',
      ticketId: 'TKT001',
      passengerName: 'Siti Rahma',
      seatNumber: 'A2',
      boardingPoint: 'Terminal Kampung Rambutan',
      dropPoint: 'Terminal Leuwi Panjang',
      status: 'checked-in',
      checkInTime: '07:35',
      boardingTime: '07:45',
      phoneNumber: '081234567891',
      identityNumber: '1234567890123457',
      ticketPrice: 150000,
      paymentMethod: 'E-Wallet',
      specialNotes: 'Hamil trimester 2',
      passengerType: 'Dewasa',
      baggageCount: 1,
      hasPaid: true,
      qrCode: 'QR002',
    },
    {
      id: 'PASS003',
      bookingId: 'BKG002',
      ticketId: 'TKT002',
      passengerName: 'Budi Santoso',
      seatNumber: 'B3',
      boardingPoint: 'Terminal Kampung Rambutan',
      dropPoint: 'Terminal Leuwi Panjang',
      status: 'not-checked-in',
      checkInTime: null,
      boardingTime: null,
      phoneNumber: '081234567892',
      identityNumber: '1234567890123458',
      ticketPrice: 150000,
      paymentMethod: 'Credit Card',
      specialNotes: '',
      passengerType: 'Dewasa',
      baggageCount: 0,
      hasPaid: true,
      qrCode: 'QR003',
    },
    {
      id: 'PASS004',
      bookingId: 'BKG003',
      ticketId: 'TKT003',
      passengerName: 'Rina Wati',
      seatNumber: 'C1',
      boardingPoint: 'Terminal Kampung Rambutan',
      dropPoint: 'Terminal Leuwi Panjang',
      status: 'onboard',
      checkInTime: '07:25',
      boardingTime: '07:40',
      phoneNumber: '081234567893',
      identityNumber: '1234567890123459',
      ticketPrice: 150000,
      paymentMethod: 'Cash',
      specialNotes: 'Anak-anak usia 5 tahun',
      passengerType: 'Anak-anak',
      baggageCount: 1,
      hasPaid: true,
      qrCode: 'QR004',
    },
    {
      id: 'PASS005',
      bookingId: 'BKG004',
      ticketId: 'TKT004',
      passengerName: 'Joko Prasetyo',
      seatNumber: 'D4',
      boardingPoint: 'Terminal Kampung Rambutan',
      dropPoint: 'Terminal Leuwi Panjang',
      status: 'no-show',
      checkInTime: null,
      boardingTime: null,
      phoneNumber: '081234567894',
      identityNumber: '1234567890123460',
      ticketPrice: 150000,
      paymentMethod: 'Bank Transfer',
      specialNotes: '',
      passengerType: 'Dewasa',
      baggageCount: 0,
      hasPaid: true,
      qrCode: 'QR005',
    },
    {
      id: 'PASS006',
      bookingId: 'BKG005',
      ticketId: 'TKT005',
      passengerName: 'Dewi Lestari',
      seatNumber: 'E1',
      boardingPoint: 'Terminal Kampung Rambutan',
      dropPoint: 'Terminal Leuwi Panjang',
      status: 'checked-in',
      checkInTime: '07:40',
      boardingTime: null,
      phoneNumber: '081234567895',
      identityNumber: '1234567890123461',
      ticketPrice: 150000,
      paymentMethod: 'E-Wallet',
      specialNotes: 'Kursi dekat toilet',
      passengerType: 'Dewasa',
      baggageCount: 3,
      hasPaid: true,
      qrCode: 'QR006',
    },
    {
      id: 'PASS007',
      bookingId: 'BKG005',
      ticketId: 'TKT005',
      passengerName: 'Fajar Nugroho',
      seatNumber: 'E2',
      boardingPoint: 'Terminal Kampung Rambutan',
      dropPoint: 'Terminal Leuwi Panjang',
      status: 'not-checked-in',
      checkInTime: null,
      boardingTime: null,
      phoneNumber: '081234567896',
      identityNumber: '1234567890123462',
      ticketPrice: 150000,
      paymentMethod: 'Credit Card',
      specialNotes: '',
      passengerType: 'Dewasa',
      baggageCount: 0,
      hasPaid: true,
      qrCode: 'QR007',
    },
    {
      id: 'PASS008',
      bookingId: 'BKG006',
      ticketId: 'TKT006',
      passengerName: 'Maya Indah',
      seatNumber: 'F5',
      boardingPoint: 'Terminal Kampung Rambutan',
      dropPoint: 'Terminal Leuwi Panjang',
      status: 'onboard',
      checkInTime: '07:20',
      boardingTime: '07:35',
      phoneNumber: '081234567897',
      identityNumber: '1234567890123463',
      ticketPrice: 150000,
      paymentMethod: 'Bank Transfer',
      specialNotes: 'Disabilitas - kursi roda',
      passengerType: 'Dewasa',
      baggageCount: 1,
      hasPaid: true,
      qrCode: 'QR008',
    },
  ];

  const [passengers, setPassengers] = useState([]);
  const [filteredPassengers, setFilteredPassengers] = useState([]);

  // Filter options
  const filterOptions = [
    { id: 'all', label: 'Semua', icon: 'people', color: '#1E88E5' },
    { id: 'checked-in', label: 'Sudah Check-in', icon: 'checkmark-circle', color: '#4CAF50' },
    { id: 'not-checked-in', label: 'Belum Check-in', icon: 'time', color: '#FF9800' },
    { id: 'no-show', label: 'No Show', icon: 'close-circle', color: '#F44336' },
    { id: 'onboard', label: 'Di Bus', icon: 'bus', color: '#2196F3' },
  ];

  useEffect(() => {
    loadPassengers();
  }, [selectedDate, selectedBus]);

  useEffect(() => {
    filterPassengers();
  }, [passengers, searchQuery, selectedFilter]);

  useFocusEffect(
    useCallback(() => {
      loadPassengers();
      return () => {};
    }, [])
  );

  const loadPassengers = () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      // Set default selected bus if not set
      if (!selectedBus && buses.length > 0) {
        setSelectedBus(buses[0]);
      }
      
      // Filter by selected bus
      let data = [...samplePassengers];
      
      // Update stats
      const total = data.length;
      const checkedIn = data.filter(p => p.status === 'checked-in').length;
      const notCheckedIn = data.filter(p => p.status === 'not-checked-in').length;
      const noShow = data.filter(p => p.status === 'no-show').length;
      const onboard = data.filter(p => p.status === 'onboard').length;
      
      setStats({ total, checkedIn, notCheckedIn, noShow, onboard });
      setPassengers(data);
      setLoading(false);
      setRefreshing(false);
      
      // Animate slide in
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }).start();
    }, 1000);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPassengers();
  };

  const filterPassengers = () => {
    let filtered = [...passengers];
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(passenger =>
        passenger.passengerName.toLowerCase().includes(query) ||
        passenger.seatNumber.toLowerCase().includes(query) ||
        passenger.bookingId.toLowerCase().includes(query) ||
        passenger.ticketId.toLowerCase().includes(query) ||
        passenger.phoneNumber.includes(query)
      );
    }
    
    // Filter by status
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(passenger => passenger.status === selectedFilter);
    }
    
    // Sort by seat number
    filtered.sort((a, b) => {
      // Extract row and seat number for proper sorting
      const getSeatNumber = (seat) => {
        const row = seat.charAt(0);
        const number = parseInt(seat.substring(1));
        return { row, number };
      };
      
      const seatA = getSeatNumber(a.seatNumber);
      const seatB = getSeatNumber(b.seatNumber);
      
      if (seatA.row < seatB.row) return -1;
      if (seatA.row > seatB.row) return 1;
      return seatA.number - seatB.number;
    });
    
    setFilteredPassengers(filtered);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'checked-in':
        return '#4CAF50';
      case 'not-checked-in':
        return '#FF9800';
      case 'no-show':
        return '#F44336';
      case 'onboard':
        return '#2196F3';
      default:
        return '#757575';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'checked-in':
        return 'Sudah Check-in';
      case 'not-checked-in':
        return 'Belum Check-in';
      case 'no-show':
        return 'No Show';
      case 'onboard':
        return 'Di Bus';
      default:
        return status;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'checked-in':
        return 'checkmark-circle';
      case 'not-checked-in':
        return 'time-outline';
      case 'no-show':
        return 'close-circle';
      case 'onboard':
        return 'bus';
      default:
        return 'person';
    }
  };

  const handleCheckIn = (passenger) => {
    Alert.alert(
      'Konfirmasi Check-in',
      `Check-in penumpang ${passenger.passengerName} (Kursi: ${passenger.seatNumber})?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Check-in',
          onPress: () => {
            // Update passenger status
            const updatedPassengers = passengers.map(p =>
              p.id === passenger.id
                ? { ...p, status: 'checked-in', checkInTime: format(new Date(), 'HH:mm') }
                : p
            );
            
            setPassengers(updatedPassengers);
            Alert.alert('Berhasil', `Penumpang ${passenger.passengerName} berhasil check-in.`);
          },
        },
      ]
    );
  };

  const handleBoardPassenger = (passenger) => {
    Alert.alert(
      'Konfirmasi Naik Bus',
      `Konfirmasi penumpang ${passenger.passengerName} (Kursi: ${passenger.seatNumber}) sudah naik bus?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Konfirmasi',
          onPress: () => {
            // Update passenger status
            const updatedPassengers = passengers.map(p =>
              p.id === passenger.id
                ? { ...p, status: 'onboard', boardingTime: format(new Date(), 'HH:mm') }
                : p
            );
            
            setPassengers(updatedPassengers);
            Alert.alert('Berhasil', `Penumpang ${passenger.passengerName} telah naik bus.`);
          },
        },
      ]
    );
  };

  const handleMarkNoShow = (passenger) => {
    Alert.alert(
      'Tandai No Show',
      `Tandai penumpang ${passenger.passengerName} (Kursi: ${passenger.seatNumber}) sebagai No Show?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Tandai',
          onPress: () => {
            // Update passenger status
            const updatedPassengers = passengers.map(p =>
              p.id === passenger.id
                ? { ...p, status: 'no-show' }
                : p
            );
            
            setPassengers(updatedPassengers);
            Alert.alert('Berhasil', `Penumpang ${passenger.passengerName} ditandai sebagai No Show.`);
          },
        },
      ]
    );
  };

  const openPassengerDetail = (passenger) => {
    setSelectedPassenger(passenger);
    setShowPassengerModal(true);
  };

  const renderFilterButton = (filter) => (
    <TouchableOpacity
      key={filter.id}
      style={[
        styles.filterButton,
        selectedFilter === filter.id && { backgroundColor: `${filter.color}20`, borderColor: filter.color },
      ]}
      onPress={() => setSelectedFilter(filter.id)}
    >
      <Ionicons
        name={filter.icon}
        size={20}
        color={selectedFilter === filter.id ? filter.color : '#666'}
      />
      <Text
        style={[
          styles.filterButtonText,
          selectedFilter === filter.id && { color: filter.color, fontWeight: '600' },
        ]}
      >
        {filter.label}
      </Text>
      {selectedFilter === filter.id && (
        <View style={[styles.filterCount, { backgroundColor: filter.color }]}>
          <Text style={styles.filterCountText}>
            {filter.id === 'all' ? stats.total :
             filter.id === 'checked-in' ? stats.checkedIn :
             filter.id === 'not-checked-in' ? stats.notCheckedIn :
             filter.id === 'no-show' ? stats.noShow :
             stats.onboard}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderPassengerCard = ({ item }) => (
    <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>
      <TouchableOpacity
        style={styles.passengerCard}
        onPress={() => openPassengerDetail(item)}
        activeOpacity={0.7}
      >
        <View style={styles.passengerHeader}>
          <View style={styles.passengerInfo}>
            <View style={styles.seatBadge}>
              <Text style={styles.seatText}>{item.seatNumber}</Text>
            </View>
            <View style={styles.passengerMainInfo}>
              <Text style={styles.passengerName}>{item.passengerName}</Text>
              <Text style={styles.passengerId}>ID: {item.ticketId}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Ionicons name={getStatusIcon(item.status)} size={12} color="#FFF" />
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
        </View>

        <View style={styles.passengerDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={14} color="#666" />
            <Text style={styles.detailLabel}>Naik:</Text>
            <Text style={styles.detailValue} numberOfLines={1}>{item.boardingPoint}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="location" size={14} color="#666" />
            <Text style={styles.detailLabel}>Turun:</Text>
            <Text style={styles.detailValue} numberOfLines={1}>{item.dropPoint}</Text>
          </View>
          {item.checkInTime && (
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={14} color="#666" />
              <Text style={styles.detailLabel}>Check-in:</Text>
              <Text style={styles.detailValue}>{item.checkInTime}</Text>
            </View>
          )}
        </View>

        <View style={styles.actionButtons}>
          {item.status === 'not-checked-in' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.checkInButton]}
              onPress={() => handleCheckIn(item)}
            >
              <Ionicons name="checkmark-circle" size={16} color="#FFF" />
              <Text style={styles.actionButtonText}>Check-in</Text>
            </TouchableOpacity>
          )}
          
          {item.status === 'checked-in' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.boardButton]}
              onPress={() => handleBoardPassenger(item)}
            >
              <Ionicons name="bus" size={16} color="#FFF" />
              <Text style={styles.actionButtonText}>Naik Bus</Text>
            </TouchableOpacity>
          )}
          
          {(item.status === 'not-checked-in' || item.status === 'checked-in') && (
            <TouchableOpacity
              style={[styles.actionButton, styles.noShowButton]}
              onPress={() => handleMarkNoShow(item)}
            >
              <Ionicons name="close-circle" size={16} color="#FFF" />
              <Text style={styles.actionButtonText}>No Show</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.detailButton}
            onPress={() => openPassengerDetail(item)}
          >
            <Text style={styles.detailButtonText}>Detail</Text>
            <Ionicons name="chevron-forward" size={16} color="#1E88E5" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={80} color="#E0E0E0" />
      <Text style={styles.emptyTitle}>Tidak ada penumpang</Text>
      <Text style={styles.emptyText}>
        {selectedFilter !== 'all'
          ? `Tidak ada penumpang dengan status "${filterOptions.find(f => f.id === selectedFilter)?.label}"`
          : 'Tidak ada penumpang untuk bus dan tanggal yang dipilih'}
      </Text>
    </View>
  );

  const formatDateDisplay = (date) => {
    return format(date, 'EEEE, d MMMM yyyy', { locale: id });
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar backgroundColor="#1E88E5" barStyle="light-content" />
        <ActivityIndicator size="large" color="#1E88E5" />
        <Text style={styles.loadingText}>Memuat daftar penumpang...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#1E88E5" barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Daftar Penumpang</Text>
          {selectedBus && (
            <Text style={styles.headerSubtitle}>
              {selectedBus.name} • {selectedBus.route}
            </Text>
          )}
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.scanButton}
            onPress={() => navigation.navigate('ScanQR')}
          >
            <Ionicons name="qr-code" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Date and Bus Selection */}
      <View style={styles.selectionContainer}>
        <TouchableOpacity 
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Ionicons name="calendar" size={20} color="#1E88E5" />
          <Text style={styles.dateButtonText}>{formatDateDisplay(selectedDate)}</Text>
          <Ionicons name="chevron-down" size={16} color="#666" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.busButton}
          onPress={() => setShowBusFilter(true)}
        >
          <Ionicons name="bus" size={20} color="#1E88E5" />
          <Text style={styles.busButtonText} numberOfLines={1}>
            {selectedBus ? selectedBus.number : 'Pilih Bus'}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Stats Overview */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsContainer}>
        <View style={styles.statsCard}>
          <Text style={styles.statsNumber}>{stats.total}</Text>
          <Text style={styles.statsLabel}>Total Penumpang</Text>
        </View>
        
        <View style={[styles.statsCard, { backgroundColor: '#E8F5E9' }]}>
          <Text style={[styles.statsNumber, { color: '#4CAF50' }]}>{stats.checkedIn}</Text>
          <Text style={[styles.statsLabel, { color: '#4CAF50' }]}>Sudah Check-in</Text>
        </View>
        
        <View style={[styles.statsCard, { backgroundColor: '#FFF3E0' }]}>
          <Text style={[styles.statsNumber, { color: '#FF9800' }]}>{stats.notCheckedIn}</Text>
          <Text style={[styles.statsLabel, { color: '#FF9800' }]}>Belum Check-in</Text>
        </View>
        
        <View style={[styles.statsCard, { backgroundColor: '#FFEBEE' }]}>
          <Text style={[styles.statsNumber, { color: '#F44336' }]}>{stats.noShow}</Text>
          <Text style={[styles.statsLabel, { color: '#F44336' }]}>No Show</Text>
        </View>
        
        <View style={[styles.statsCard, { backgroundColor: '#E3F2FD' }]}>
          <Text style={[styles.statsNumber, { color: '#2196F3' }]}>{stats.onboard}</Text>
          <Text style={[styles.statsLabel, { color: '#2196F3' }]}>Di Bus</Text>
        </View>
      </ScrollView>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari nama penumpang, kursi, atau ID tiket..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter Buttons */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        {filterOptions.map(renderFilterButton)}
      </ScrollView>

      {/* Passenger List */}
      <FlatList
        data={filteredPassengers}
        renderItem={renderPassengerCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#1E88E5']}
            tintColor="#1E88E5"
          />
        }
        ListEmptyComponent={renderEmptyState}
        ListHeaderComponent={
          filteredPassengers.length > 0 ? (
            <Text style={styles.listHeader}>
              {filteredPassengers.length} penumpang ditemukan
            </Text>
          ) : null
        }
      />

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('ScanQR')}
        >
          <Ionicons name="qr-code" size={24} color="#1E88E5" />
          <Text style={styles.quickActionText}>Scan QR</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => {
            // Quick check-in for first un-checked passenger
            const unCheckedPassenger = passengers.find(p => p.status === 'not-checked-in');
            if (unCheckedPassenger) {
              handleCheckIn(unCheckedPassenger);
            } else {
              Alert.alert('Info', 'Semua penumpang sudah check-in');
            }
          }}
        >
          <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
          <Text style={styles.quickActionText}>Check-in</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => {
            // Generate report
            Alert.alert('Laporan', 'Laporan penumpang sedang diproses...');
          }}
        >
          <Ionicons name="document-text" size={24} color="#FF9800" />
          <Text style={styles.quickActionText}>Laporan</Text>
        </TouchableOpacity>
      </View>

      {/* Bus Selection Modal */}
      <Modal
        visible={showBusFilter}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowBusFilter(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pilih Bus</Text>
              <TouchableOpacity onPress={() => setShowBusFilter(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              {buses.map((bus) => (
                <TouchableOpacity
                  key={bus.id}
                  style={[
                    styles.busOption,
                    selectedBus?.id === bus.id && styles.busOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedBus(bus);
                    setShowBusFilter(false);
                  }}
                >
                  <View style={styles.busOptionIcon}>
                    <Ionicons name="bus" size={24} color={selectedBus?.id === bus.id ? '#1E88E5' : '#666'} />
                  </View>
                  <View style={styles.busOptionInfo}>
                    <Text style={[
                      styles.busOptionName,
                      selectedBus?.id === bus.id && { color: '#1E88E5', fontWeight: '600' },
                    ]}>
                      {bus.name}
                    </Text>
                    <Text style={styles.busOptionDetails}>
                      {bus.number} • {bus.route}
                    </Text>
                  </View>
                  {selectedBus?.id === bus.id && (
                    <Ionicons name="checkmark-circle" size={24} color="#1E88E5" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Passenger Detail Modal */}
      <Modal
        visible={showPassengerModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPassengerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.passengerModalContainer}>
            <View style={styles.passengerModalHeader}>
              <View>
                <Text style={styles.passengerModalTitle}>Detail Penumpang</Text>
                <Text style={styles.passengerModalSubtitle}>
                  {selectedPassenger?.passengerName} • Kursi {selectedPassenger?.seatNumber}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowPassengerModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.passengerModalContent}>
              {selectedPassenger && (
                <>
                  {/* Passenger Info */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Informasi Pribadi</Text>
                    <View style={styles.detailRowFull}>
                      <Text style={styles.detailLabelFull}>Nama Lengkap:</Text>
                      <Text style={styles.detailValueFull}>{selectedPassenger.passengerName}</Text>
                    </View>
                    <View style={styles.detailRowFull}>
                      <Text style={styles.detailLabelFull}>No. Identitas:</Text>
                      <Text style={styles.detailValueFull}>{selectedPassenger.identityNumber}</Text>
                    </View>
                    <View style={styles.detailRowFull}>
                      <Text style={styles.detailLabelFull}>No. Telepon:</Text>
                      <Text style={styles.detailValueFull}>{selectedPassenger.phoneNumber}</Text>
                    </View>
                    <View style={styles.detailRowFull}>
                      <Text style={styles.detailLabelFull}>Tipe Penumpang:</Text>
                      <Text style={styles.detailValueFull}>{selectedPassenger.passengerType}</Text>
                    </View>
                  </View>

                  {/* Ticket Info */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Informasi Tiket</Text>
                    <View style={styles.detailRowFull}>
                      <Text style={styles.detailLabelFull}>ID Tiket:</Text>
                      <Text style={styles.detailValueFull}>{selectedPassenger.ticketId}</Text>
                    </View>
                    <View style={styles.detailRowFull}>
                      <Text style={styles.detailLabelFull}>ID Booking:</Text>
                      <Text style={styles.detailValueFull}>{selectedPassenger.bookingId}</Text>
                    </View>
                    <View style={styles.detailRowFull}>
                      <Text style={styles.detailLabelFull}>Kursi:</Text>
                      <Text style={styles.detailValueFull}>{selectedPassenger.seatNumber}</Text>
                    </View>
                    <View style={styles.detailRowFull}>
                      <Text style={styles.detailLabelFull}>Harga:</Text>
                      <Text style={styles.detailValueFull}>Rp {selectedPassenger.ticketPrice.toLocaleString('id-ID')}</Text>
                    </View>
                    <View style={styles.detailRowFull}>
                      <Text style={styles.detailLabelFull}>Metode Bayar:</Text>
                      <Text style={styles.detailValueFull}>{selectedPassenger.paymentMethod}</Text>
                    </View>
                    <View style={styles.detailRowFull}>
                      <Text style={styles.detailLabelFull}>Status Bayar:</Text>
                      <Text style={[styles.detailValueFull, { color: selectedPassenger.hasPaid ? '#4CAF50' : '#F44336' }]}>
                        {selectedPassenger.hasPaid ? 'Lunas' : 'Belum Lunas'}
                      </Text>
                    </View>
                  </View>

                  {/* Trip Info */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Informasi Perjalanan</Text>
                    <View style={styles.detailRowFull}>
                      <Text style={styles.detailLabelFull}>Titik Naik:</Text>
                      <Text style={styles.detailValueFull}>{selectedPassenger.boardingPoint}</Text>
                    </View>
                    <View style={styles.detailRowFull}>
                      <Text style={styles.detailLabelFull}>Titik Turun:</Text>
                      <Text style={styles.detailValueFull}>{selectedPassenger.dropPoint}</Text>
                    </View>
                    <View style={styles.detailRowFull}>
                      <Text style={styles.detailLabelFull}>Status:</Text>
                      <View style={[styles.statusBadgeSmall, { backgroundColor: getStatusColor(selectedPassenger.status) }]}>
                        <Text style={styles.statusTextSmall}>{getStatusText(selectedPassenger.status)}</Text>
                      </View>
                    </View>
                    {selectedPassenger.checkInTime && (
                      <View style={styles.detailRowFull}>
                        <Text style={styles.detailLabelFull}>Waktu Check-in:</Text>
                        <Text style={styles.detailValueFull}>{selectedPassenger.checkInTime}</Text>
                      </View>
                    )}
                    {selectedPassenger.boardingTime && (
                      <View style={styles.detailRowFull}>
                        <Text style={styles.detailLabelFull}>Waktu Naik Bus:</Text>
                        <Text style={styles.detailValueFull}>{selectedPassenger.boardingTime}</Text>
                      </View>
                    )}
                  </View>

                  {/* Additional Info */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Informasi Tambahan</Text>
                    <View style={styles.detailRowFull}>
                      <Text style={styles.detailLabelFull}>Jumlah Bagasi:</Text>
                      <Text style={styles.detailValueFull}>{selectedPassenger.baggageCount} koper</Text>
                    </View>
                    {selectedPassenger.specialNotes && (
                      <View style={styles.detailRowFull}>
                        <Text style={styles.detailLabelFull}>Catatan Khusus:</Text>
                        <Text style={styles.detailValueFull}>{selectedPassenger.specialNotes}</Text>
                      </View>
                    )}
                    <View style={styles.detailRowFull}>
                      <Text style={styles.detailLabelFull}>Kode QR:</Text>
                      <Text style={styles.detailValueFull}>{selectedPassenger.qrCode}</Text>
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.modalActions}>
                    {selectedPassenger.status === 'not-checked-in' && (
                      <TouchableOpacity
                        style={[styles.modalActionButton, styles.modalCheckInButton]}
                        onPress={() => {
                          handleCheckIn(selectedPassenger);
                          setShowPassengerModal(false);
                        }}
                      >
                        <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                        <Text style={styles.modalActionButtonText}>Check-in</Text>
                      </TouchableOpacity>
                    )}
                    
                    {selectedPassenger.status === 'checked-in' && (
                      <TouchableOpacity
                        style={[styles.modalActionButton, styles.modalBoardButton]}
                        onPress={() => {
                          handleBoardPassenger(selectedPassenger);
                          setShowPassengerModal(false);
                        }}
                      >
                        <Ionicons name="bus" size={20} color="#FFF" />
                        <Text style={styles.modalActionButtonText}>Naik Bus</Text>
                      </TouchableOpacity>
                    )}
                    
                    <TouchableOpacity
                      style={[styles.modalActionButton, styles.modalCloseButton]}
                      onPress={() => setShowPassengerModal(false)}
                    >
                      <Text style={styles.modalCloseButtonText}>Tutup</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
  },
  scanButton: {
    padding: 4,
  },
  selectionContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  dateButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 8,
  },
  dateButtonText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginHorizontal: 8,
  },
  busButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  busButtonText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginHorizontal: 8,
  },
  statsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
  },
  statsCard: {
    width: 120,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginRight: 12,
  },
  statsNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statsLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    paddingVertical: 4,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
    marginHorizontal: 6,
  },
  filterCount: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterCountText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  listHeader: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  passengerCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  passengerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  passengerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  seatBadge: {
    backgroundColor: '#E3F2FD',
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  seatText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E88E5',
  },
  passengerMainInfo: {
    flex: 1,
  },
  passengerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  passengerId: {
    fontSize: 12,
    color: '#666',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  passengerDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
    marginRight: 4,
    width: 60,
  },
  detailValue: {
    fontSize: 12,
    color: '#333',
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  checkInButton: {
    backgroundColor: '#4CAF50',
  },
  boardButton: {
    backgroundColor: '#2196F3',
  },
  noShowButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  detailButtonText: {
    color: '#1E88E5',
    fontSize: 12,
    fontWeight: '500',
    marginRight: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    marginHorizontal: 32,
    lineHeight: 20,
  },
  quickActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  quickActionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  quickActionText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalContent: {
    padding: 16,
  },
  busOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F8F9FA',
  },
  busOptionSelected: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#1E88E5',
  },
  busOptionIcon: {
    marginRight: 12,
  },
  busOptionInfo: {
    flex: 1,
  },
  busOptionName: {
    fontSize: 16,
    color: '#333',
    marginBottom: 2,
  },
  busOptionDetails: {
    fontSize: 12,
    color: '#666',
  },
  passengerModalContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.9,
  },
  passengerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  passengerModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  passengerModalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  passengerModalContent: {
    padding: 16,
  },
  detailSection: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  detailRowFull: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabelFull: {
    fontSize: 14,
    color: '#666',
    width: 120,
  },
  detailValueFull: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    fontWeight: '500',
  },
  statusBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusTextSmall: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  modalActions: {
    marginTop: 16,
  },
  modalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  modalCheckInButton: {
    backgroundColor: '#4CAF50',
  },
  modalBoardButton: {
    backgroundColor: '#2196F3',
  },
  modalCloseButton: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  modalActionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalCloseButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default PassengerListScreen;