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

const { width } = Dimensions.get('window');

const MyTicketsScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const bookingHistory = useSelector(selectBookingHistory);
  const historyLoading = useSelector(selectHistoryLoading);
  const historyError = useSelector(selectHistoryError);
  const loading = useSelector(selectLoading);
  const error = useSelector(selectError);

  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const fadeAnim = useState(new Animated.Value(0))[0];

  const ticketFilters = [
    { id: 'all', label: 'Semua Tiket', icon: 'receipt' },
    { id: 'upcoming', label: 'Akan Datang', icon: 'calendar' },
    { id: 'past', label: 'Selesai', icon: 'checkmark-circle' },
    { id: 'cancelled', label: 'Dibatalkan', icon: 'close-circle' },
  ];

  useFocusEffect(
    useCallback(() => {
      loadTickets();
      return () => {};
    }, []),
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

  const getStatusColor = status => {
    switch (status) {
      case 'confirmed':
        return C.green;
      case 'pending':
        return C.amber;
      case 'cancelled':
        return C.red;
      case 'completed':
        return C.primary;
      case 'expired':
        return C.textMuted;
      default:
        return C.textMuted;
    }
  };

  const getStatusText = status => {
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

    if (filter !== 'all') {
      switch (filter) {
        case 'upcoming':
          filtered = filtered.filter(
            ticket =>
              ticket.booking_status === 'confirmed' ||
              ticket.booking_status === 'pending',
          );
          break;
        case 'past':
          filtered = filtered.filter(
            ticket => ticket.booking_status === 'completed',
          );
          break;
        case 'cancelled':
          filtered = filtered.filter(
            ticket => ticket.booking_status === 'cancelled',
          );
          break;
      }
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        ticket =>
          ticket.booking_code?.toLowerCase().includes(query) ||
          ticket.schedule?.bus_name?.toLowerCase().includes(query) ||
          ticket.schedule?.departure_city?.toLowerCase().includes(query) ||
          ticket.schedule?.arrival_city?.toLowerCase().includes(query),
      );
    }

    return filtered.sort((a, b) => {
      const dateA = a.created_at
        ? new Date(a.created_at.replace(' ', 'T'))
        : new Date(0);
      const dateB = b.created_at
        ? new Date(b.created_at.replace(' ', 'T'))
        : new Date(0);
      return dateB.getTime() - dateA.getTime();
    });
  };

  const formatShortDate = dateString => {
    if (!dateString) return '-';
    try {
      // Backend returns dates like "2024-06-18 10:30:00"
      // Replace space with T to make it ISO compliant
      const isoString = dateString.includes('T')
        ? dateString
        : dateString.replace(' ', 'T');
      const date = parseISO(isoString);
      return format(date, 'd MMM yyyy', { locale: id });
    } catch (error) {
      // Fallback to basic parsing
      try {
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
          return format(date, 'd MMM yyyy', { locale: id });
        }
      } catch {
        return dateString;
      }
      return dateString;
    }
  };

  const handleTicketPress = ticket => {
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
      await dispatch(
        cancelBooking({
          bookingId: selectedTicket.id,
          reason: cancellationReason,
        }),
      ).unwrap();

      setShowCancelModal(false);
      setSelectedTicket(null);
      setCancellationReason('');
      Alert.alert('Berhasil', 'Tiket berhasil dibatalkan.');
      dispatch(fetchBookingHistory());
    } catch (error) {
      Alert.alert('Error', 'Gagal membatalkan tiket.');
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="receipt-outline" size={64} color={C.textMuted} />
      </View>
      <Text style={styles.emptyTitle}>Tidak ada tiket</Text>
      <Text style={styles.emptyText}>Anda belum memiliki tiket aktif</Text>
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
        activeOpacity={0.75}
      >
        <View style={styles.ticketHeader}>
          <View style={styles.ticketIdContainer}>
            <Text style={styles.ticketId}>{item.booking_code}</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(item.booking_status) },
              ]}
            >
              <Text style={styles.statusText}>
                {getStatusText(item.booking_status)}
              </Text>
            </View>
          </View>
          <Text style={styles.bookingDate}>
            {item.created_at ? formatShortDate(item.created_at) : '-'}
          </Text>
        </View>

        <View style={styles.routeContainer}>
          <View style={styles.routeDotLine}>
            <View style={styles.routeDot} />
            <View style={styles.routeLine} />
            <View style={[styles.routeDot, styles.destinationDot]} />
          </View>
          <View style={styles.routeDetails}>
            <View style={styles.routeStop}>
              <View>
                <Text style={styles.cityName}>
                  {item.schedule?.departure_city}
                </Text>
                <Text style={styles.terminalName}>Terminal Keberangkatan</Text>
              </View>
              <Text style={styles.timeText}>
                {item.schedule?.departure_time
                  ? new Date(item.schedule.departure_time).toLocaleTimeString(
                      [],
                      { hour: '2-digit', minute: '2-digit' },
                    )
                  : '--:--'}
              </Text>
            </View>
            <View style={styles.durationContainer}>
              <View style={styles.durationBadge}>
                <Ionicons name="time-outline" size={12} color={C.primary} />
                <Text style={styles.durationText}>
                  {item.schedule?.duration || 'Perjalanan'}
                </Text>
              </View>
            </View>
            <View style={styles.routeStop}>
              <View>
                <Text style={styles.cityName}>
                  {item.schedule?.arrival_city}
                </Text>
                <Text style={styles.terminalName}>Terminal Kedatangan</Text>
              </View>
              <Text style={styles.timeText}>
                {item.schedule?.arrival_time
                  ? new Date(item.schedule.arrival_time).toLocaleTimeString(
                      [],
                      { hour: '2-digit', minute: '2-digit' },
                    )
                  : '--:--'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <View style={styles.detailIconWrap}>
                <Ionicons name="bus-outline" size={14} color={C.primary} />
              </View>
              <Text style={styles.detailLabel}>Bus</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {item.schedule?.bus_name || 'Bus'}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <View style={styles.detailIconWrap}>
                <Ionicons name="people-outline" size={14} color={C.primary} />
              </View>
              <Text style={styles.detailLabel}>Penumpang</Text>
              <Text style={styles.detailValue}>
                {item.total_passengers || 1}
              </Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <View style={styles.detailIconWrap}>
                <Ionicons name="calendar-outline" size={14} color={C.primary} />
              </View>
              <Text style={styles.detailLabel}>Berangkat</Text>
              <Text style={styles.detailValue}>
                {item.schedule?.departure_time
                  ? formatShortDate(item.schedule.departure_time)
                  : '-'}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <View style={styles.detailIconWrap}>
                <Ionicons name="cash-outline" size={14} color={C.primary} />
              </View>
              <Text style={styles.detailLabel}>Total</Text>
              <Text style={styles.detailValue}>
                Rp {parseFloat(item.total_price || 0).toLocaleString('id-ID')}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.ticketFooter}>
          <View style={styles.seatsContainer}>
            <Ionicons name="grid-outline" size={14} color={C.textSub} />
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
                <Text style={styles.viewButtonText}>Lihat</Text>
                <Ionicons name="chevron-forward" size={16} color={C.primary} />
              </TouchableOpacity>
            )}
            {item.booking_status === 'pending' && (
              <TouchableOpacity
                style={styles.payButton}
                onPress={() =>
                  navigation.navigate('Payment', {
                    bookingId: item.id,
                    totalAmount: parseFloat(item.total_price),
                  })
                }
              >
                <Text style={styles.payButtonText}>Bayar</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderFilterButton = filterItem => (
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
        color={filter === filterItem.id ? C.primary : C.textSub}
      />
      <Text
        style={[
          styles.filterButtonText,
          filter === filterItem.id && styles.filterButtonTextActive,
        ]}
      >
        {filterItem.label}
      </Text>
    </TouchableOpacity>
  );

  if (historyLoading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={styles.loadingText}>Memuat tiket...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={C.headerBg}
        translucent={false}
      />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Tiket Saya</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.filterIconButton}
            onPress={() => setShowFilterModal(true)}
          >
            <Ionicons name="filter" size={22} color={C.headerText} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={18}
          color={C.textSub}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari tiket..."
          placeholderTextColor={C.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
      </View>

      {filter !== 'all' && (
        <View style={styles.activeFilterContainer}>
          <Text style={styles.activeFilterText}>
            Filter: {ticketFilters.find(f => f.id === filter)?.label}
          </Text>
          <TouchableOpacity onPress={() => setFilter('all')}>
            <Ionicons name="close-circle" size={16} color={C.textSub} />
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={getFilteredTickets()}
        renderItem={renderTicketCard}
        keyExtractor={(item, index) =>
          item.id?.toString() ||
          item.booking_code?.toString() ||
          index.toString()
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[C.primary]}
            tintColor={C.primary}
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
                <Ionicons name="close" size={24} color={C.textSub} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalContent}>
              {ticketFilters.map(renderFilterButton)}
            </View>
          </View>
        </View>
      </Modal>

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
              <Text style={styles.actionModalTitle}>
                Tiket {selectedTicket?.bookingCode}
              </Text>
              <Text style={styles.actionModalSubtitle}>
                {selectedTicket?.busName} • {selectedTicket?.departure} →{' '}
                {selectedTicket?.destination}
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
                <Ionicons name="eye-outline" size={22} color={C.primary} />
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
                  <Ionicons name="download-outline" size={22} color={C.green} />
                  <Text style={styles.actionButtonText}>Download</Text>
                </TouchableOpacity>
              )}

              {(selectedTicket?.status === 'confirmed' ||
                selectedTicket?.status === 'pending') && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => {
                    setShowActionModal(false);
                    setShowCancelModal(true);
                  }}
                >
                  <Ionicons
                    name="close-circle-outline"
                    size={22}
                    color={C.red}
                  />
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
                  placeholderTextColor={C.textMuted}
                  value={cancellationReason}
                  onChangeText={setCancellationReason}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <Text style={styles.refundInfo}>
                Dana akan dikembalikan dalam 3-5 hari kerja ke metode pembayaran
                awal.
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
                    <ActivityIndicator color={C.white} />
                  ) : (
                    <Text style={styles.confirmCancelButtonText}>
                      Ya, Batalkan
                    </Text>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.headerBg,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.headerText,
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
    backgroundColor: C.white,
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: C.text,
    paddingVertical: 2,
  },
  activeFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.white,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  activeFilterText: {
    fontSize: 13,
    color: C.textSub,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  listHeader: {
    fontSize: 13,
    color: C.textSub,
    marginBottom: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
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
  emptyText: {
    fontSize: 14,
    color: C.textSub,
    textAlign: 'center',
    marginTop: 8,
    marginHorizontal: 32,
  },
  browseButton: {
    backgroundColor: C.primary,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 20,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  browseButtonText: {
    color: C.white,
    fontSize: 14,
    fontWeight: '600',
  },
  ticketCard: {
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  ticketIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ticketId: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    color: C.white,
    fontSize: 10,
    fontWeight: '600',
  },
  bookingDate: {
    fontSize: 12,
    color: C.textSub,
  },
  routeContainer: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  routeDotLine: {
    alignItems: 'center',
    marginRight: 12,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.primary,
  },
  destinationDot: {
    backgroundColor: C.green,
  },
  routeLine: {
    width: 2,
    height: 40,
    backgroundColor: C.primary,
    marginVertical: 4,
  },
  routeDetails: {
    flex: 1,
  },
  routeStop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cityName: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
  },
  terminalName: {
    fontSize: 11,
    color: C.textSub,
    marginTop: 1,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '500',
    color: C.text,
  },
  durationContainer: {
    alignItems: 'center',
    marginVertical: 4,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
  },
  durationText: {
    fontSize: 11,
    color: C.primary,
    fontWeight: '500',
  },
  detailsContainer: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  detailItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: C.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  detailLabel: {
    fontSize: 11,
    color: C.textSub,
    marginRight: 4,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text,
    flex: 1,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: C.surfaceAlt,
    paddingTop: 12,
  },
  seatsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seatsText: {
    fontSize: 12,
    color: C.textSub,
    marginLeft: 6,
  },
  actionButtons: {
    flexDirection: 'row',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewButtonText: {
    color: C.primary,
    fontSize: 12,
    fontWeight: '600',
    marginRight: 2,
  },
  payButton: {
    backgroundColor: C.green,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  payButtonText: {
    color: C.white,
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: C.white,
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
    borderBottomColor: C.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
  },
  modalContent: {
    padding: 16,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: C.surface,
  },
  filterButtonActive: {
    backgroundColor: C.primaryLight,
    borderWidth: 1,
    borderColor: C.primary,
  },
  filterButtonText: {
    fontSize: 15,
    color: C.textSub,
    marginLeft: 12,
  },
  filterButtonTextActive: {
    color: C.primary,
    fontWeight: '600',
  },
  actionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionModalContainer: {
    backgroundColor: C.white,
    borderRadius: 16,
    width: width * 0.85,
    overflow: 'hidden',
  },
  actionModalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  actionModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
    marginBottom: 4,
  },
  actionModalSubtitle: {
    fontSize: 14,
    color: C.textSub,
  },
  actionButtonsContainer: {
    padding: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: C.surface,
  },
  actionButtonText: {
    fontSize: 15,
    color: C.text,
    marginLeft: 12,
    flex: 1,
  },
  cancelActionButton: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    marginTop: 8,
  },
  cancelActionButtonText: {
    color: C.textSub,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  cancelModalContainer: {
    backgroundColor: C.white,
    borderRadius: 16,
    marginHorizontal: 20,
    overflow: 'hidden',
  },
  cancelModalHeader: {
    padding: 20,
    backgroundColor: C.redLight,
    alignItems: 'center',
  },
  cancelModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.red,
    marginBottom: 4,
  },
  cancelModalSubtitle: {
    fontSize: 14,
    color: C.red,
    textAlign: 'center',
  },
  cancelModalContent: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: C.text,
    marginBottom: 8,
  },
  inputContainer: {
    backgroundColor: C.surface,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  textInput: {
    padding: 12,
    fontSize: 14,
    color: C.text,
    minHeight: 80,
  },
  refundInfo: {
    fontSize: 12,
    color: C.textSub,
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
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelModalButton: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
  },
  cancelModalButtonText: {
    color: C.textSub,
    fontSize: 14,
    fontWeight: '500',
  },
  confirmCancelButton: {
    backgroundColor: C.red,
  },
  confirmCancelButtonText: {
    color: C.white,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default MyTicketsScreen;
