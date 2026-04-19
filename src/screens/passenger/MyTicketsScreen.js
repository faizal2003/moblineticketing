import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Image,
  FlatList,
  Modal,
  Alert,
  Animated,
  Dimensions,
  Platform,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import Entypo from 'react-native-vector-icons/Entypo';

import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import {
  fetchBookingHistory,
  cancelBooking,
  downloadTicket,
  fetchBookingDetail,
  selectBookingHistory,
  selectHistoryLoading,
  selectHistoryError,
  selectLoading,
  selectError,
  clearError,
} from '../../store/slices/bookingSlice';

const { width } = Dimensions.get('window');

const MyTicketsScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  
  // Get state from Redux
  const bookingHistory = useSelector(selectBookingHistory);
  const historyLoading = useSelector(selectHistoryLoading);
  const historyError = useSelector(selectHistoryError);
  const loading = useSelector(selectLoading);
  const error = useSelector(selectError);
  
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'upcoming', 'past', 'cancelled'
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [activeTab, setActiveTab] = useState('active'); // 'active', 'history'
  const [searchQuery, setSearchQuery] = useState('');
  const fadeAnim = useState(new Animated.Value(0))[0];

  const ticketFilters = [
    { id: 'all', label: 'Semua Tiket', icon: 'receipt' },
    { id: 'upcoming', label: 'Akan Datang', icon: 'calendar' },
    { id: 'past', label: 'Selesai', icon: 'checkmark-circle' },
    { id: 'cancelled', label: 'Dibatalkan', icon: 'close-circle' },
  ];

  const tabs = [
    { id: 'active', label: 'Aktif' },
    { id: 'history', label: 'Riwayat' },
  ];

  useFocusEffect(
    useCallback(() => {
      loadTickets();
      return () => {};
    }, [])
  );

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
      dispatch(clearError());
    }
    
    if (historyError) {
      Alert.alert('Error', historyError);
      dispatch(clearError());
    }
  }, [error, historyError]);

  const loadTickets = () => {
    dispatch(fetchBookingHistory());
    
    // Animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  const onRefresh = () => {
    setRefreshing(true);
    dispatch(fetchBookingHistory()).finally(() => {
      setRefreshing(false);
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return '#4CAF50';
      case 'pending':
        return '#FF9800';
      case 'cancelled':
        return '#F44336';
      case 'completed':
        return '#2196F3';
      case 'expired':
        return '#757575';
      default:
        return '#757575';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'confirmed':
        return 'Terkonfirmasi';
      case 'pending':
        return 'Menunggu Pembayaran';
      case 'cancelled':
        return 'Dibatalkan';
      case 'completed':
        return 'Selesai';
      case 'expired':
        return 'Kadaluarsa';
      default:
        return status;
    }
  };

  const getFilteredTickets = () => {
    if (!bookingHistory || !Array.isArray(bookingHistory)) return [];
    
    let filtered = [...bookingHistory];
    
    // Filter by active/history tab
    if (activeTab === 'active') {
      filtered = filtered.filter(ticket => 
        (ticket.booking_status === 'confirmed' || ticket.booking_status === 'pending')
      );
    } else {
      filtered = filtered.filter(ticket => 
        (ticket.booking_status === 'completed' || ticket.booking_status === 'cancelled' || ticket.booking_status === 'expired')
      );
    }
    
    // Filter by selected filter
    if (filter !== 'all') {
      switch (filter) {
        case 'upcoming':
          filtered = filtered.filter(ticket => 
            (ticket.booking_status === 'confirmed' || ticket.booking_status === 'pending')
          );
          break;
        case 'past':
          filtered = filtered.filter(ticket => ticket.booking_status === 'completed');
          break;
        case 'cancelled':
          filtered = filtered.filter(ticket => ticket.booking_status === 'cancelled');
          break;
      }
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(ticket =>
        ticket.booking_code?.toLowerCase().includes(query) ||
        ticket.schedule?.bus_name?.toLowerCase().includes(query) ||
        ticket.schedule?.departure_city?.toLowerCase().includes(query) ||
        ticket.schedule?.arrival_city?.toLowerCase().includes(query)
      );
    }
    
    // Sort by date (newest created first)
    return filtered.sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at.replace(' ', 'T')) : new Date(0);
      const dateB = b.created_at ? new Date(b.created_at.replace(' ', 'T')) : new Date(0);
      return dateB.getTime() - dateA.getTime();
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = parseISO(dateString);
      return format(date, 'EEEE, d MMMM yyyy', { locale: id });
    } catch (error) {
      return dateString;
    }
  };

  const formatShortDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = parseISO(dateString);
      return format(date, 'd MMM yyyy', { locale: id });
    } catch (error) {
      return dateString;
    }
  };

  const handleTicketPress = (ticket) => {
    // Fetch ticket details first
    dispatch(fetchBookingDetail(ticket.id))
      .unwrap()
      .then(() => {
        navigation.navigate('TicketDetail', { ticket });
      })
      .catch(error => {
        Alert.alert('Error', 'Gagal memuat detail tiket');
      });
  };

  const handleCancelTicket = async () => {
    if (!cancellationReason.trim()) {
      Alert.alert('Error', 'Harap masukkan alasan pembatalan');
      return;
    }

    try {
      await dispatch(cancelBooking({ 
        bookingId: selectedTicket.id, 
        reason: cancellationReason 
      })).unwrap();
      
      setShowCancelModal(false);
      setSelectedTicket(null);
      setCancellationReason('');
      
      Alert.alert('Berhasil', 'Tiket berhasil dibatalkan.');
      
      // Refresh ticket list
      dispatch(fetchBookingHistory());
      
    } catch (error) {
      Alert.alert('Error', 'Gagal membatalkan tiket.');
    }
  };

  const handleDownloadTicket = async (ticket) => {
    try {
      await dispatch(downloadTicket(ticket.id)).unwrap();
      Alert.alert('Berhasil', 'Tiket berhasil didownload.');
    } catch (error) {
      Alert.alert('Error', 'Gagal mendownload tiket.');
    }
  };

  const handleShareTicket = (ticket) => {
    Alert.alert(
      'Bagikan Tiket',
      'Bagikan tiket melalui:',
      [
        { text: 'WhatsApp', onPress: () => console.log('Share via WhatsApp') },
        { text: 'Email', onPress: () => console.log('Share via Email') },
        { text: 'Batal', style: 'cancel' },
      ]
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="receipt-outline" size={80} color="#E0E0E0" />
      <Text style={styles.emptyTitle}>Tidak ada tiket</Text>
      <Text style={styles.emptyText}>
        {activeTab === 'active' 
          ? 'Anda belum memiliki tiket aktif'
          : 'Belum ada riwayat tiket'}
      </Text>
      <TouchableOpacity 
        style={styles.browseButton}
        onPress={() => navigation.navigate('SearchBus')}
      >
        <Text style={styles.browseButtonText}>Cari Bus Sekarang</Text>
      </TouchableOpacity>
    </View>
  );

  const renderTicketCard = ({ item }) => (
    <Animated.View style={{ opacity: fadeAnim }}>
      <TouchableOpacity 
        style={styles.ticketCard}
        onPress={() => handleTicketPress(item)}
        onLongPress={() => {
          setSelectedTicket(item);
          setShowActionModal(true);
        }}
        activeOpacity={0.7}
      >
        {/* Ticket Header */}
        <View style={styles.ticketHeader}>
          <View style={styles.ticketIdContainer}>
            <Text style={styles.ticketId}>{item.booking_code}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.booking_status) }]}>
              <Text style={styles.statusText}>{getStatusText(item.booking_status)}</Text>
            </View>
          </View>
          <Text style={styles.bookingDate}>
            {item.created_at ? formatShortDate(item.created_at) : '-'}
          </Text>
        </View>

        {/* Route Information */}
        <View style={styles.routeContainer}>
          <View style={styles.routeDotLine}>
            <View style={styles.routeDot} />
            <View style={styles.routeLine} />
            <View style={[styles.routeDot, styles.destinationDot]} />
          </View>
          <View style={styles.routeDetails}>
            <View style={styles.routeStop}>
              <View>
                <Text style={styles.cityName}>{item.schedule?.departure_city}</Text>
                <Text style={styles.terminalName}>
                  Terminal Keberangkatan
                </Text>
              </View>
              <Text style={styles.timeText}>
                {item.schedule?.departure_time ? new Date(item.schedule.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
              </Text>
            </View>
            <View style={styles.durationContainer}>
              <Ionicons name="time-outline" size={14} color="#666" />
              <Text style={styles.durationText}>
                {item.schedule?.duration || 'Perjalanan'}
              </Text>
            </View>
            <View style={styles.routeStop}>
              <View>
                <Text style={styles.cityName}>{item.schedule?.arrival_city}</Text>
                <Text style={styles.terminalName}>
                  Terminal Kedatangan
                </Text>
              </View>
              <Text style={styles.timeText}>
                {item.schedule?.arrival_time ? new Date(item.schedule.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
              </Text>
            </View>
          </View>
        </View>

        {/* Ticket Details */}
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Ionicons name="bus-outline" size={16} color="#666" />
              <Text style={styles.detailLabel}>Bus</Text>
              <Text style={styles.detailValue} numberOfLines={1}>{item.schedule?.bus_name || 'Bus'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="people-outline" size={16} color="#666" />
              <Text style={styles.detailLabel}>Penumpang</Text>
              <Text style={styles.detailValue}>{item.total_passengers || 1}</Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Ionicons name="calendar-outline" size={16} color="#666" />
              <Text style={styles.detailLabel}>Berangkat</Text>
              <Text style={styles.detailValue}>
                {item.schedule?.departure_time ? formatShortDate(item.schedule.departure_time) : '-'}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="cash-outline" size={16} color="#666" />
              <Text style={styles.detailLabel}>Total</Text>
              <Text style={styles.detailValue}>
                Rp {parseFloat(item.total_price || 0).toLocaleString('id-ID')}
              </Text>
            </View>
          </View>
        </View>

        {/* Ticket Footer */}
        <View style={styles.ticketFooter}>
          <View style={styles.seatsContainer}>
            <Ionicons name="grid-outline" size={14} color="#666" />
            <Text style={styles.seatsText}>
              Kursi: {item.seats?.join(', ') || '-'}
            </Text>
          </View>
          <View style={styles.actionButtons}>
            {item.booking_status === 'confirmed' && (
              <TouchableOpacity 
                style={styles.viewButton}
                onPress={() => handleTicketPress(item)}
              >
                <Text style={styles.viewButtonText}>Lihat Tiket</Text>
                <Ionicons name="chevron-forward" size={16} color="#1E88E5" />
              </TouchableOpacity>
            )}
            {item.booking_status === 'pending' && (
              <TouchableOpacity 
                style={styles.payButton}
                onPress={() => navigation.navigate('Payment', {
                  bookingId: item.id,
                  totalAmount: parseFloat(item.total_price),
                })}
              >
                <Text style={styles.payButtonText}>Bayar</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderFilterButton = (filterItem) => (
    <TouchableOpacity
      key={filterItem.id}
      style={[
        styles.filterButton,
        filter === filterItem.id && styles.filterButtonActive,
      ]}
      onPress={() => {
        setFilter(filterItem.id);
        setShowFilterModal(false);
      }}
    >
      <Ionicons 
        name={filterItem.icon} 
        size={20} 
        color={filter === filterItem.id ? '#1E88E5' : '#666'} 
      />
      <Text style={[
        styles.filterButtonText,
        filter === filterItem.id && styles.filterButtonTextActive,
      ]}>
        {filterItem.label}
      </Text>
    </TouchableOpacity>
  );

  if (historyLoading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E88E5" />
        <Text style={styles.loadingText}>Memuat tiket...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#1E88E5" barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Tiket Saya</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.filterIconButton}
            onPress={() => setShowFilterModal(true)}
          >
            <Ionicons name="filter" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari tiket..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tabButton,
              activeTab === tab.id && styles.tabButtonActive,
            ]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[
              styles.tabText,
              activeTab === tab.id && styles.tabTextActive,
            ]}>
              {tab.label}
            </Text>
            {activeTab === tab.id && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Active Filter */}
      {filter !== 'all' && (
        <View style={styles.activeFilterContainer}>
          <Text style={styles.activeFilterText}>
            Filter: {ticketFilters.find(f => f.id === filter)?.label}
          </Text>
          <TouchableOpacity onPress={() => setFilter('all')}>
            <Ionicons name="close-circle" size={18} color="#666" />
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      <FlatList
        data={getFilteredTickets()}
        renderItem={renderTicketCard}
        keyExtractor={(item, index) => item.id?.toString() || item.booking_code?.toString() || index.toString()}
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
          getFilteredTickets().length > 0 ? (
            <Text style={styles.listHeader}>
              {getFilteredTickets().length} tiket ditemukan
            </Text>
          ) : null
        }
      />

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Tiket</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalContent}>
              {ticketFilters.map(renderFilterButton)}
            </View>
          </View>
        </View>
      </Modal>

      {/* Action Modal */}
      <Modal
        visible={showActionModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowActionModal(false)}
      >
        <TouchableOpacity 
          style={styles.actionModalOverlay}
          activeOpacity={1}
          onPress={() => setShowActionModal(false)}
        >
          <View style={styles.actionModalContainer}>
            <View style={styles.actionModalHeader}>
              <Text style={styles.actionModalTitle}>Tiket {selectedTicket?.bookingCode}</Text>
              <Text style={styles.actionModalSubtitle}>
                {selectedTicket?.busName} • {selectedTicket?.departure} → {selectedTicket?.destination}
              </Text>
            </View>
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => {
                  setShowActionModal(false);
                  handleTicketPress(selectedTicket);
                }}
              >
                <Ionicons name="eye-outline" size={24} color="#1E88E5" />
                <Text style={styles.actionButtonText}>Lihat Detail</Text>
              </TouchableOpacity>
              
              {selectedTicket?.status === 'confirmed' && (
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => {
                    setShowActionModal(false);
                    handleDownloadTicket(selectedTicket);
                  }}
                >
                  <Ionicons name="download-outline" size={24} color="#4CAF50" />
                  <Text style={styles.actionButtonText}>Download</Text>
                </TouchableOpacity>
              )}
              
              {selectedTicket?.status === 'confirmed' && (
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => {
                    setShowActionModal(false);
                    handleShareTicket(selectedTicket);
                  }}
                >
                  <Ionicons name="share-social-outline" size={24} color="#FF9800" />
                  <Text style={styles.actionButtonText}>Bagikan</Text>
                </TouchableOpacity>
              )}
              
              {(selectedTicket?.status === 'confirmed' || selectedTicket?.status === 'pending') && (
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => {
                    setShowActionModal(false);
                    setShowCancelModal(true);
                  }}
                >
                  <Ionicons name="close-circle-outline" size={24} color="#F44336" />
                  <Text style={styles.actionButtonText}>Batalkan</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.cancelActionButton]}
                onPress={() => setShowActionModal(false)}
              >
                <Text style={styles.cancelActionButtonText}>Tutup</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Cancel Ticket Modal */}
      <Modal
        visible={showCancelModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.cancelModalContainer}>
            <View style={styles.cancelModalHeader}>
              <Text style={styles.cancelModalTitle}>Batalkan Tiket</Text>
              <Text style={styles.cancelModalSubtitle}>
                Apakah Anda yakin ingin membatalkan tiket ini?
              </Text>
            </View>
            
            <View style={styles.cancelModalContent}>
              <Text style={styles.inputLabel}>Alasan Pembatalan</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Masukkan alasan pembatalan"
                  value={cancellationReason}
                  onChangeText={setCancellationReason}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
              
              <Text style={styles.refundInfo}>
                {selectedTicket?.status === 'confirmed' 
                  ? 'Dana akan dikembalikan dalam 3-5 hari kerja ke metode pembayaran awal.'
                  : 'Pembayaran akan dibatalkan dan tidak akan diproses.'
                }
              </Text>
              
              <View style={styles.cancelModalActions}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelModalButton]}
                  onPress={() => {
                    setShowCancelModal(false);
                    setCancellationReason('');
                  }}
                >
                  <Text style={styles.cancelModalButtonText}>Batal</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.modalButton, styles.confirmCancelButton]}
                  onPress={handleCancelTicket}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.confirmCancelButtonText}>Ya, Batalkan</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
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
  headerRight: {
    flexDirection: 'row',
  },
  filterIconButton: {
    padding: 4,
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  tabButtonActive: {
    backgroundColor: '#FFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  tabTextActive: {
    color: '#1E88E5',
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '25%',
    right: '25%',
    height: 3,
    backgroundColor: '#1E88E5',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  activeFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  activeFilterText: {
    fontSize: 14,
    color: '#666',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  listHeader: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
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
  browseButton: {
    backgroundColor: '#1E88E5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  browseButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  ticketCard: {
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
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  ticketIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ticketId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  bookingDate: {
    fontSize: 12,
    color: '#666',
  },
  routeContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  routeDotLine: {
    alignItems: 'center',
    marginRight: 12,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1E88E5',
  },
  destinationDot: {
    backgroundColor: '#4CAF50',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cityName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  terminalName: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    marginLeft: 4,
  },
  durationText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
  },
  detailsContainer: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
    marginRight: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 12,
  },
  seatsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seatsText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
  },
  actionButtons: {
    flexDirection: 'row',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewButtonText: {
    color: '#1E88E5',
    fontSize: 12,
    fontWeight: '500',
    marginRight: 4,
  },
  payButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  payButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '500',
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
    paddingBottom: 24,
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
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F8F9FA',
  },
  filterButtonActive: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#1E88E5',
  },
  filterButtonText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 12,
  },
  filterButtonTextActive: {
    color: '#1E88E5',
    fontWeight: '500',
  },
  actionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionModalContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    width: width * 0.85,
    overflow: 'hidden',
  },
  actionModalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  actionModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  actionModalSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  actionButtonsContainer: {
    padding: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F8F9FA',
  },
  actionButtonText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  cancelActionButton: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginTop: 8,
  },
  cancelActionButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    flex: 1,
  },
  cancelModalContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginHorizontal: 20,
    overflow: 'hidden',
  },
  cancelModalHeader: {
    padding: 20,
    backgroundColor: '#FFEBEE',
    alignItems: 'center',
  },
  cancelModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#D32F2F',
    marginBottom: 4,
  },
  cancelModalSubtitle: {
    fontSize: 14,
    color: '#D32F2F',
    textAlign: 'center',
  },
  cancelModalContent: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  inputContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginBottom: 16,
  },
  textInput: {
    padding: 12,
    fontSize: 14,
    color: '#333',
    minHeight: 80,
  },
  refundInfo: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 16,
  },
  cancelModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelModalButton: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cancelModalButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  confirmCancelButton: {
    backgroundColor: '#F44336',
  },
  confirmCancelButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default MyTicketsScreen;