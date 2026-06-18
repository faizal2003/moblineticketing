import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  Share as RNShareNative,
  Linking,
  Platform,
  Animated,
  Dimensions,
  Modal,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import Entypo from 'react-native-vector-icons/Entypo';

import { useNavigation, useRoute } from '@react-navigation/native';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import ViewShot from 'react-native-view-shot';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import QRCode from 'react-native-qrcode-svg';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { busService } from '../../services/busService';

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

const { width, height } = Dimensions.get('window');

const TicketDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { ticket } = route.params || {};
  const bookingId = ticket?.id;

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentTicket, setCurrentTicket] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [activeTicketIndex, setActiveTicketIndex] = useState(0);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const viewShotRef = useRef();
  const printableRef = useRef();
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (bookingId) {
      fetchTicketDetails();
    }
  }, [bookingId]);

  const fetchTicketDetails = async () => {
    try {
      setLoading(true);
      const response = await busService.getBookingDetail(bookingId);
      const data = response.data.data;

      // Fetch tickets if booking is confirmed and has tickets
      let ticketsData = [];
      if (
        data.booking_status === 'confirmed' &&
        data.payment_status === 'paid'
      ) {
        try {
          const ticketsResponse = await busService.getTickets(bookingId);
          ticketsData = ticketsResponse.data.data.tickets || [];
        } catch (err) {
          console.warn('Could not fetch tickets:', err);
        }
      }

      // Store all tickets array
      setTickets(ticketsData);

      // Build common ticket data
      const commonTicketData = {
        bookingId: data.booking_code,
        busName: data.schedule?.bus?.name || data.schedule?.bus_name || '-',
        busNumber:
          data.schedule?.bus?.number || data.schedule?.bus_number || '-',
        departure: data.schedule?.departure_city,
        destination: data.schedule?.arrival_city,
        departureDate: new Date(data.schedule?.departure_time),
        departureTime: new Date(
          data.schedule?.departure_time,
        ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        arrivalTime: new Date(data.schedule?.arrival_time).toLocaleTimeString(
          [],
          { hour: '2-digit', minute: '2-digit' },
        ),
        passengerCount: data.total_passengers,
        seats: data.passengers.map(p => p.seat_number),
        price: parseFloat(data.total_price),
        status: data.booking_status,
        paymentStatus: data.payment_status,
        bookingDate: new Date(data.created_at),
        boardingPoint: data.schedule?.departure_city,
        dropPoint: data.schedule?.arrival_city,
        bookingClass:
          data.schedule?.bus?.type || data.schedule?.bus_type || 'Executive',
        facilities: data.schedule?.facilities || [],
        passengerInfo: data.passengers.map(p => ({
          name: p.full_name,
          identityNumber: p.id_number,
          phone: p.phone,
          email: '-',
        })),
      };

      // If we have multiple tickets, use the first ticket for display
      // Otherwise fallback to old behavior
      if (ticketsData.length > 0) {
        const firstTicket = ticketsData[0];
        setCurrentTicket({
          ...commonTicketData,
          id: firstTicket.ticket_code,
          qrCode: firstTicket.ticket_code,
          currentPassengerName: firstTicket.passenger?.name,
          currentSeatNumber: firstTicket.passenger?.seat_number,
        });
      } else {
        setCurrentTicket({
          ...commonTicketData,
          id: data.ticket?.ticket_code || 'N/A',
          qrCode: data.ticket?.ticket_code || '-',
        });
      }
    } catch (error) {
      console.error('Error fetching ticket details:', error);
      Alert.alert('Error', 'Gagal memuat detail tiket');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = date => {
    if (!date) return '-';
    return format(date, 'EEEE, d MMMM yyyy', { locale: id });
  };

  const formatTime = time => {
    if (!time) return '-';
    return `${time} WIB`;
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
        return 'Perjalanan Selesai';
      default:
        return status;
    }
  };

  const getPaymentStatusText = paymentStatus => {
    switch (paymentStatus) {
      case 'paid':
        return 'Lunas';
      case 'pending':
        return 'Menunggu Pembayaran';
      case 'refunded':
        return 'Dikembalikan';
      case 'failed':
        return 'Gagal';
      default:
        return paymentStatus;
    }
  };

  const handleShare = async () => {
    try {
      setShowShareOptions(false);
      setActionLoading(true);
      if (!printableRef.current) return;

      const uri = await printableRef.current.capture();

      const shareOptions = {
        title: 'Tiket Bus Saya',
        message:
          'Lihat tiket bus saya untuk perjalanan ' +
          currentTicket.departure +
          ' ke ' +
          currentTicket.destination,
        url: 'file://' + uri,
        type: 'image/png',
      };

      await Share.open(shareOptions);
    } catch (error) {
      if (error.message !== 'User did not share') {
        console.error('Error sharing ticket:', error);
        Alert.alert('Error', 'Gagal membagikan tiket');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      setActionLoading(true);
      if (!printableRef.current) return;

      const uri = await printableRef.current.capture();
      await CameraRoll.save(uri, { type: 'photo' });
      Alert.alert('Berhasil', 'Tiket berhasil disimpan ke galeri');
    } catch (error) {
      console.error('Error downloading ticket:', error);
      Alert.alert(
        'Error',
        'Gagal menyimpan tiket. Pastikan aplikasi memiliki izin galeri.',
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelTicket = async () => {
    if (!cancellationReason.trim()) {
      Alert.alert('Error', 'Harap masukkan alasan pembatalan');
      return;
    }

    try {
      setActionLoading(true);
      await busService.cancelBooking(bookingId, { reason: cancellationReason });

      setActionLoading(false);
      setShowCancelModal(false);
      Alert.alert('Berhasil', 'Tiket berhasil dibatalkan.', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      setActionLoading(false);
      Alert.alert('Error', error?.message || 'Gagal membatalkan tiket');
    }
  };

  const handleContactSupport = () => {
    Linking.openURL('tel:+6281234567890');
  };

  const handleOpenMaps = () => {
    const address = encodeURIComponent(currentTicket.boardingPoint);
    const url = Platform.select({
      ios: `maps:0,0?q=${address}`,
      android: `geo:0,0?q=${address}`,
    });
    Linking.openURL(url);
  };

  const renderPassengerInfo = (passenger, index) => (
    <View key={index} style={styles.passengerCard}>
      <View style={styles.passengerHeader}>
        <View style={styles.passengerNumber}>
          <Text style={styles.passengerNumberText}>{index + 1}</Text>
        </View>
        <Text style={styles.passengerName}>{passenger.name}</Text>
      </View>
      <View style={styles.passengerDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="card-outline" size={14} color={C.textSub} />
          <Text style={styles.detailLabel}>ID:</Text>
          <Text style={styles.detailValue}>{passenger.identityNumber}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="call-outline" size={14} color={C.textSub} />
          <Text style={styles.detailLabel}>Telepon:</Text>
          <Text style={styles.detailValue}>{passenger.phone}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="mail-outline" size={14} color={C.textSub} />
          <Text style={styles.detailLabel}>Email:</Text>
          <Text style={styles.detailValue}>{passenger.email}</Text>
        </View>
      </View>
    </View>
  );

  const renderFacility = (facility, index) => (
    <View key={index} style={styles.facilityItem}>
      <Ionicons name="checkmark-circle" size={14} color={C.green} />
      <Text style={styles.facilityText}>{facility}</Text>
    </View>
  );

  const renderPriceBreakdown = () => (
    <View style={styles.priceCard}>
      <Text style={styles.priceTitle}>Rincian Harga</Text>
      <View style={styles.priceRow}>
        <Text style={styles.priceLabel}>
          Tiket ({currentTicket.passengerCount} orang)
        </Text>
        <Text style={styles.priceValue}>
          Rp {(currentTicket.price / 1.1).toLocaleString('id-ID')}
        </Text>
      </View>
      <View style={styles.priceRow}>
        <Text style={styles.priceLabel}>Pajak (10%)</Text>
        <Text style={styles.priceValue}>
          Rp {(currentTicket.price * 0.1).toLocaleString('id-ID')}
        </Text>
      </View>
      <View style={styles.priceRow}>
        <Text style={styles.priceLabel}>Biaya Layanan</Text>
        <Text style={styles.priceValue}>Rp 0</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total Pembayaran</Text>
        <Text style={styles.totalValue}>
          Rp {currentTicket.price.toLocaleString('id-ID')}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <TouchableOpacity
          style={{ position: 'absolute', top: 50, left: 20, zIndex: 10 }}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={C.primary} />
        </TouchableOpacity>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={styles.loadingText}>Memuat detail tiket...</Text>
      </View>
    );
  }

  if (!currentTicket) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Tiket tidak ditemukan</Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.primaryButtonText}>Kembali</Text>
        </TouchableOpacity>
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
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={C.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detail Tiket</Text>
        <TouchableOpacity
          style={styles.shareButton}
          onPress={() => setShowShareOptions(true)}
        >
          <Ionicons name="share-outline" size={24} color={C.headerText} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 0.9 }}>
          <View style={styles.ticketContainer}>
            <View style={styles.ticketHeader}>
              <View style={styles.ticketIdContainer}>
                <Text style={styles.ticketId}>{currentTicket.id}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(currentTicket.status) },
                  ]}
                >
                  <Text style={styles.statusText}>
                    {getStatusText(currentTicket.status)}
                  </Text>
                </View>
              </View>
              <Text style={styles.bookingId}>
                Booking ID: {currentTicket.bookingId}
              </Text>
            </View>

            {/* Ticket Carousel - Show if multiple tickets */}
            {tickets.length > 1 && (
              <View style={styles.ticketCarousel}>
                <Text style={styles.carouselTitle}>
                  Tiket {activeTicketIndex + 1} dari {tickets.length}
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  pagingEnabled
                  contentContainerStyle={styles.carouselContent}
                  onMomentumScrollEnd={e => {
                    const offsetX = e.nativeEvent.contentOffset.x;
                    const index = Math.round(offsetX / (width - 40));
                    setActiveTicketIndex(index);
                    const ticket = tickets[index];
                    if (ticket) {
                      setCurrentTicket(prev => ({
                        ...prev,
                        id: ticket.ticket_code,
                        qrCode: ticket.ticket_code,
                        currentPassengerName: ticket.passenger?.name,
                        currentSeatNumber: ticket.passenger?.seat_number,
                      }));
                    }
                  }}
                >
                  {tickets.map((ticket, index) => (
                    <View key={index} style={styles.carouselCard}>
                      <View style={styles.carouselCardHeader}>
                        <Ionicons name="ticket" size={20} color={C.primary} />
                        <Text style={styles.carouselCardTitle}>
                          Tiket #{index + 1}
                        </Text>
                      </View>
                      <View style={styles.carouselCardBody}>
                        <View style={styles.carouselRow}>
                          <Ionicons name="person" size={16} color={C.textSub} />
                          <Text style={styles.carouselLabel}>Penumpang:</Text>
                          <Text style={styles.carouselValue}>
                            {ticket.passenger?.name || '-'}
                          </Text>
                        </View>
                        <View style={styles.carouselRow}>
                          <Ionicons name="albums" size={16} color={C.textSub} />
                          <Text style={styles.carouselLabel}>Kursi:</Text>
                          <Text style={styles.carouselValue}>
                            {ticket.passenger?.seat_number || '-'}
                          </Text>
                        </View>
                        <View style={styles.carouselRow}>
                          <Ionicons
                            name="qr-code"
                            size={16}
                            color={C.textSub}
                          />
                          <Text style={styles.carouselLabel}>Kode:</Text>
                          <Text style={styles.carouselValue} numberOfLines={1}>
                            {ticket.ticket_code}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.carouselIndicator}>
                        <View
                          style={[
                            styles.indicatorDot,
                            index === activeTicketIndex &&
                              styles.indicatorDotActive,
                          ]}
                        />
                      </View>
                    </View>
                  ))}
                </ScrollView>
                <View style={styles.carouselDots}>
                  {tickets.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.carouselDot,
                        index === activeTicketIndex && styles.carouselDotActive,
                      ]}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Show current ticket info if multiple tickets */}
            {tickets.length > 1 && (
              <View style={styles.currentTicketInfo}>
                <View style={styles.currentTicketRow}>
                  <Text style={styles.currentTicketLabel}>
                    Penumpang Saat Ini:
                  </Text>
                  <Text style={styles.currentTicketValue}>
                    {currentTicket.currentPassengerName || '-'}
                  </Text>
                </View>
                <View style={styles.currentTicketRow}>
                  <Text style={styles.currentTicketLabel}>Kursi:</Text>
                  <Text style={styles.currentTicketValue}>
                    {currentTicket.currentSeatNumber || '-'}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.busInfoCard}>
              <View style={styles.busHeader}>
                <View style={styles.busIconContainer}>
                  <Ionicons name="bus" size={28} color={C.primary} />
                </View>
                <View style={styles.busInfo}>
                  <Text style={styles.busName}>{currentTicket.busName}</Text>
                  <Text style={styles.busNumber}>
                    {currentTicket.busNumber} • {currentTicket.bookingClass}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.routeCard}>
              <View style={styles.routeHeader}>
                <Text style={styles.routeTitle}>Rute Perjalanan</Text>
                <TouchableOpacity
                  onPress={handleOpenMaps}
                  style={styles.mapButton}
                >
                  <Ionicons name="map-outline" size={18} color={C.primary} />
                  <Text style={styles.mapButtonText}>Peta</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.routeDetails}>
                <View style={styles.routeStop}>
                  <View style={styles.routeDot} />
                  <View style={styles.routeInfo}>
                    <Text style={styles.routeCity}>
                      {currentTicket.departure}
                    </Text>
                    <Text style={styles.routePoint}>
                      {currentTicket.boardingPoint}
                    </Text>
                    <Text style={styles.routeTime}>
                      {formatTime(currentTicket.departureTime)}
                    </Text>
                  </View>
                  <Text style={styles.routeDate}>
                    {format(currentTicket.departureDate, 'd MMM yyyy')}
                  </Text>
                </View>

                <View style={styles.routeDuration}>
                  <View style={styles.durationLine} />
                  <View style={styles.durationInfo}>
                    <Ionicons name="time-outline" size={14} color={C.textSub} />
                    <Text style={styles.durationText}>
                      {currentTicket.departureTime && currentTicket.arrivalTime
                        ? `${
                            Math.abs(
                              new Date(
                                `2000-01-01 ${currentTicket.arrivalTime}`,
                              ) -
                                new Date(
                                  `2000-01-01 ${currentTicket.departureTime}`,
                                ),
                            ) /
                            (1000 * 60 * 60)
                          } jam`
                        : '4 jam'}
                    </Text>
                  </View>
                </View>

                <View style={styles.routeStop}>
                  <View style={[styles.routeDot, styles.destinationDot]} />
                  <View style={styles.routeInfo}>
                    <Text style={styles.routeCity}>
                      {currentTicket.destination}
                    </Text>
                    <Text style={styles.routePoint}>
                      {currentTicket.dropPoint}
                    </Text>
                    <Text style={styles.routeTime}>
                      {formatTime(currentTicket.arrivalTime)}
                    </Text>
                  </View>
                  <Text style={styles.routeDate}>
                    {format(currentTicket.departureDate, 'd MMM yyyy')}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Informasi Penumpang</Text>
              {tickets.length > 1 ? (
                // Show only current passenger when multiple tickets
                currentTicket.currentPassengerName &&
                currentTicket.currentSeatNumber ? (
                  <View style={styles.passengerCard}>
                    <View style={styles.passengerHeader}>
                      <View style={styles.passengerNumber}>
                        <Text style={styles.passengerNumberText}>
                          {activeTicketIndex + 1}
                        </Text>
                      </View>
                      <Text style={styles.passengerName}>
                        {currentTicket.currentPassengerName}
                      </Text>
                    </View>
                    <View style={styles.passengerDetails}>
                      <View style={styles.detailRow}>
                        <Ionicons
                          name="albums-outline"
                          size={14}
                          color={C.textSub}
                        />
                        <Text style={styles.detailLabel}>Kursi:</Text>
                        <Text style={styles.detailValue}>
                          {currentTicket.currentSeatNumber}
                        </Text>
                      </View>
                      {currentTicket.passengerInfo?.find(
                        p => p.name === currentTicket.currentPassengerName,
                      ) && (
                        <>
                          <View style={styles.detailRow}>
                            <Ionicons
                              name="card-outline"
                              size={14}
                              color={C.textSub}
                            />
                            <Text style={styles.detailLabel}>ID:</Text>
                            <Text style={styles.detailValue}>
                              {currentTicket.passengerInfo.find(
                                p =>
                                  p.name === currentTicket.currentPassengerName,
                              )?.identityNumber || '-'}
                            </Text>
                          </View>
                          <View style={styles.detailRow}>
                            <Ionicons
                              name="call-outline"
                              size={14}
                              color={C.textSub}
                            />
                            <Text style={styles.detailLabel}>Telepon:</Text>
                            <Text style={styles.detailValue}>
                              {currentTicket.passengerInfo.find(
                                p =>
                                  p.name === currentTicket.currentPassengerName,
                              )?.phone || '-'}
                            </Text>
                          </View>
                        </>
                      )}
                    </View>
                  </View>
                ) : (
                  <Text style={styles.noDataText}>
                    Pilih tiket untuk melihat info penumpang
                  </Text>
                )
              ) : (
                // Show all passengers when single ticket or no tickets array
                currentTicket.passengerInfo?.map(renderPassengerInfo) || (
                  <Text style={styles.noDataText}>
                    Tidak ada data penumpang
                  </Text>
                )
              )}
            </View>

            <View style={styles.seatCard}>
              <Text style={styles.sectionTitle}>Kursi Terpilih</Text>
              <View style={styles.seatsContainer}>
                {currentTicket.seats.map((seat, index) => (
                  <View key={index} style={styles.seatBadge}>
                    <Text style={styles.seatText}>{seat}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Fasilitas</Text>
              <View style={styles.facilitiesContainer}>
                {currentTicket.facilities.map(renderFacility)}
              </View>
            </View>

            {renderPriceBreakdown()}

            <View style={styles.qrCard}>
              <Text style={styles.sectionTitle}>Kode Tiket</Text>
              {tickets.length > 1 && (
                <Text style={styles.qrSubtitle}>
                  QR Code untuk {currentTicket.currentPassengerName} (Kursi{' '}
                  {currentTicket.currentSeatNumber})
                </Text>
              )}
              <TouchableOpacity
                style={styles.qrContainer}
                onPress={() => setShowQRModal(true)}
              >
                <View style={styles.qrPlaceholder}>
                  {currentTicket.qrCode && currentTicket.qrCode !== '-' ? (
                    <QRCode
                      value={JSON.stringify({
                        ticket_code: currentTicket.id,
                        booking_id: currentTicket.bookingId,
                        passenger_name:
                          currentTicket.currentPassengerName ||
                          currentTicket.passengerInfo?.[0]?.name,
                        seat_number:
                          currentTicket.currentSeatNumber ||
                          currentTicket.seats?.[0],
                        timestamp: Math.floor(Date.now() / 1000),
                      })}
                      size={120}
                      color={C.text}
                      backgroundColor={C.surface}
                    />
                  ) : (
                    <Ionicons
                      name="qr-code-outline"
                      size={64}
                      color={C.primary}
                    />
                  )}
                  <Text style={styles.qrText}>Scan untuk boarding</Text>
                  <Text style={styles.qrCode}>{currentTicket.id}</Text>
                </View>
              </TouchableOpacity>
              <Text style={styles.qrInstruction}>
                Tunjukkan QR code ini saat boarding
              </Text>
            </View>

            <View style={styles.notesCard}>
              <View style={styles.notesHeader}>
                <Ionicons name="information-circle" size={18} color={C.amber} />
                <Text style={styles.notesTitle}>Catatan Penting</Text>
              </View>
              <View style={styles.notesContent}>
                <Text style={styles.noteText}>
                  • Hadir di boarding point 30 menit sebelum keberangkatan
                </Text>
                <Text style={styles.noteText}>• Bawa bukti identitas asli</Text>
                <Text style={styles.noteText}>
                  • Tiket tidak dapat diubah atau dibatalkan 2 jam sebelum
                  keberangkatan
                </Text>
                <Text style={styles.noteText}>
                  • Dilarang membawa barang berbahaya
                </Text>
              </View>
            </View>
          </View>
        </ViewShot>

        <View style={styles.actionContainer}>
          {currentTicket.status === 'confirmed' && (
            <>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleDownload}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color={C.white} />
                ) : (
                  <>
                    <Ionicons
                      name="download-outline"
                      size={18}
                      color={C.white}
                    />
                    <Text style={styles.primaryButtonText}>Download Tiket</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setShowCancelModal(true)}
                disabled={actionLoading}
              >
                <Ionicons name="close-circle-outline" size={18} color={C.red} />
                <Text style={styles.secondaryButtonText}>Batalkan Tiket</Text>
              </TouchableOpacity>
            </>
          )}

          {currentTicket.status === 'pending' && (
            <TouchableOpacity
              style={styles.payButton}
              onPress={() =>
                navigation.navigate('Payment', {
                  bookingId: currentTicket.bookingId,
                })
              }
              disabled={actionLoading}
            >
              <Ionicons name="card-outline" size={18} color={C.white} />
              <Text style={styles.payButtonText}>Bayar Sekarang</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.supportButton}
            onPress={handleContactSupport}
          >
            <Ionicons name="headset-outline" size={18} color={C.primary} />
            <Text style={styles.supportButtonText}>Hubungi Support</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.supportButton,
              { marginTop: 10, borderColor: C.primary },
            ]}
            onPress={() =>
              navigation.reset({
                index: 0,
                routes: [{ name: 'PassengerHome' }],
              })
            }
          >
            <Ionicons name="home-outline" size={18} color={C.primary} />
            <Text style={styles.supportButtonText}>Kembali ke Beranda</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={showShareOptions}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowShareOptions(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bagikan Tiket</Text>
              <TouchableOpacity onPress={() => setShowShareOptions(false)}>
                <Ionicons name="close" size={24} color={C.textSub} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalContent}>
              <TouchableOpacity
                style={styles.modalOption}
                onPress={handleShare}
              >
                <Ionicons
                  name="share-social-outline"
                  size={24}
                  color={C.primary}
                />
                <Text style={styles.modalOptionText}>
                  Bagikan via Media Sosial
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalOption}
                onPress={handleDownload}
              >
                <Ionicons name="download-outline" size={24} color={C.green} />
                <Text style={styles.modalOptionText}>Download ke Galeri</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalOption, styles.cancelOption]}
                onPress={() => setShowShareOptions(false)}
              >
                <Text style={styles.cancelOptionText}>Batal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
                  onPress={() => setShowCancelModal(false)}
                >
                  <Text style={styles.cancelModalButtonText}>Batal</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmCancelButton]}
                  onPress={handleCancelTicket}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
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

      <Modal
        visible={showQRModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowQRModal(false)}
      >
        <View style={styles.qrModalOverlay}>
          <View style={styles.qrModalContainer}>
            <View style={styles.qrModalHeader}>
              <Text style={styles.qrModalTitle}>Kode Boarding</Text>
              <TouchableOpacity onPress={() => setShowQRModal(false)}>
                <Ionicons name="close" size={24} color={C.white} />
              </TouchableOpacity>
            </View>
            <View style={styles.qrModalContent}>
              <View style={styles.qrCodeDisplay}>
                {currentTicket.qrCode && currentTicket.qrCode !== '-' ? (
                  <QRCode
                    value={JSON.stringify({
                      ticket_code: currentTicket.id,
                      booking_id: currentTicket.bookingId,
                      passenger_name:
                        currentTicket.currentPassengerName ||
                        currentTicket.passengerInfo?.[0]?.name,
                      seat_number:
                        currentTicket.currentSeatNumber ||
                        currentTicket.seats?.[0],
                      timestamp: Math.floor(Date.now() / 1000),
                    })}
                    size={200}
                    color={C.text}
                    backgroundColor={C.white}
                  />
                ) : (
                  <Ionicons name="qr-code" size={180} color={C.text} />
                )}
                <Text style={styles.qrCodeText}>{currentTicket.id}</Text>
              </View>
              {tickets.length > 1 && (
                <View style={styles.qrModalPassenger}>
                  <Text style={styles.qrModalPassengerText}>
                    {currentTicket.currentPassengerName} - Kursi{' '}
                    {currentTicket.currentSeatNumber}
                  </Text>
                </View>
              )}
              <Text style={styles.qrModalInstruction}>
                Tunjukkan kode ini kepada petugas boarding
              </Text>
              <View style={styles.qrModalInfo}>
                <View style={styles.qrInfoRow}>
                  <Text style={styles.qrInfoLabel}>Bus:</Text>
                  <Text style={styles.qrInfoValue}>
                    {currentTicket.busName}
                  </Text>
                </View>
                <View style={styles.qrInfoRow}>
                  <Text style={styles.qrInfoLabel}>Tanggal:</Text>
                  <Text style={styles.qrInfoValue}>
                    {format(currentTicket.departureDate, 'd MMM yyyy')}
                  </Text>
                </View>
                <View style={styles.qrInfoRow}>
                  <Text style={styles.qrInfoLabel}>Waktu:</Text>
                  <Text style={styles.qrInfoValue}>
                    {currentTicket.departureTime}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.hiddenContainer}>
        <ViewShot ref={printableRef} options={{ format: 'png', quality: 1.0 }}>
          <View style={styles.printableTicket}>
            <View style={styles.printableHeader}>
              <Text style={styles.printableTitle}>TIKET BUS ONLINE</Text>
              <Text style={styles.printableSubtitle}>
                Booking ID: {currentTicket?.bookingId}
              </Text>
            </View>

            <View style={styles.printableContent}>
              <View style={styles.printableRouteInfo}>
                <View style={styles.printableRow}>
                  <View style={styles.printableCol}>
                    <Text style={styles.printableLabel}>KEBERANGKATAN</Text>
                    <Text style={styles.printableValue}>
                      {currentTicket?.departure}
                    </Text>
                    <Text style={styles.printableSubValue}>
                      {currentTicket
                        ? format(
                            currentTicket.departureDate,
                            'd MMM yyyy, HH:mm',
                          )
                        : '-'}{' '}
                      WIB
                    </Text>
                  </View>
                  <View style={styles.printableCol}>
                    <Text style={styles.printableLabel}>KEDATANGAN</Text>
                    <Text style={styles.printableValue}>
                      {currentTicket?.destination}
                    </Text>
                    <Text style={styles.printableSubValue}>
                      {currentTicket && currentTicket.arrivalTime
                        ? currentTicket.arrivalTime
                        : '-'}{' '}
                      WIB
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.printableRow}>
                <View style={styles.printableCol}>
                  <Text style={styles.printableLabel}>NAMA BUS</Text>
                  <Text style={styles.printableValue}>
                    {currentTicket?.busName}
                  </Text>
                </View>
                <View style={styles.printableCol}>
                  <Text style={styles.printableLabel}>NOMOR BUS / TIPE</Text>
                  <Text style={styles.printableValue}>
                    {currentTicket?.busNumber} / {currentTicket?.bookingClass}
                  </Text>
                </View>
              </View>

              <View style={styles.printablePassengerSection}>
                <Text style={styles.printableSectionTitle}>
                  INFORMASI PENUMPANG
                </Text>
                {currentTicket?.passengerInfo.map((p, idx) => (
                  <View key={idx} style={styles.printablePassengerRow}>
                    <View style={styles.printableRow}>
                      <View style={styles.printableCol}>
                        <Text style={styles.printableLabel}>
                          NAMA PENUMPANG {idx + 1}
                        </Text>
                        <Text style={styles.printableValue}>{p.name}</Text>
                      </View>
                      <View style={styles.printableCol}>
                        <Text style={styles.printableLabel}>NOMOR KURSI</Text>
                        <Text
                          style={[
                            styles.printableValue,
                            { color: C.primary, fontSize: 18 },
                          ]}
                        >
                          {currentTicket.seats[idx]}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>

              <View style={styles.printableQrSection}>
                <View style={styles.printableQrWrapper}>
                  {currentTicket && (
                    <QRCode
                      value={JSON.stringify({
                        ticket_code: currentTicket.id,
                        booking_id: currentTicket.bookingId,
                        passenger_name: currentTicket.passengerInfo?.[0]?.name,
                        timestamp: Math.floor(Date.now() / 1000),
                      })}
                      size={130}
                    />
                  )}
                </View>
                <Text
                  style={[
                    styles.printableValue,
                    { color: C.primary, letterSpacing: 2, marginTop: 8 },
                  ]}
                >
                  {currentTicket?.id}
                </Text>
                <Text style={styles.printableLabel}>
                  Tunjukkan QR Code ini kepada petugas saat boarding
                </Text>
              </View>
            </View>

            <View style={styles.printableFooter}>
              <Text style={styles.printableFooterTitle}>Catatan Penting:</Text>
              <Text style={styles.printableFooterText}>
                1. Harap hadir 30 menit sebelum jadwal keberangkatan.
              </Text>
              <Text style={styles.printableFooterText}>
                2. Tiket ini merupakan bukti pembayaran yang sah.
              </Text>
              <Text style={styles.printableFooterText}>
                3. Dilarang membawa barang-barang terlarang dan berbahaya.
              </Text>
              <Text style={styles.printableFooterText}>
                4. Informasi lebih lanjut hubungi Support: +62 812-3456-7890
              </Text>
            </View>
          </View>
        </ViewShot>
      </View>
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
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.headerText,
  },
  shareButton: {
    padding: 4,
  },
  scrollContent: {
    paddingBottom: 24,
    backgroundColor: C.surface,
  },
  ticketContainer: {
    padding: 16,
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
    fontSize: 18,
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
  bookingId: {
    fontSize: 11,
    color: C.textSub,
  },
  busInfoCard: {
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  busHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  busIconContainer: {
    backgroundColor: C.primaryLight,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  busInfo: {
    flex: 1,
  },
  busName: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
  },
  busNumber: {
    fontSize: 13,
    color: C.textSub,
    marginTop: 2,
  },
  routeCard: {
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  routeTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  mapButtonText: {
    color: C.primary,
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 4,
  },
  routeDetails: {
    position: 'relative',
  },
  routeStop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.primary,
    marginTop: 4,
    marginRight: 10,
  },
  destinationDot: {
    backgroundColor: C.green,
  },
  routeInfo: {
    flex: 1,
  },
  routeCity: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
  },
  routePoint: {
    fontSize: 12,
    color: C.textSub,
    marginTop: 1,
  },
  routeTime: {
    fontSize: 13,
    fontWeight: '500',
    color: C.text,
    marginTop: 3,
  },
  routeDate: {
    fontSize: 11,
    color: C.textSub,
    marginLeft: 10,
  },
  routeDuration: {
    marginLeft: 4,
    marginVertical: 6,
  },
  durationLine: {
    width: 2,
    height: 35,
    backgroundColor: C.primary,
    marginLeft: 4,
  },
  durationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  durationText: {
    fontSize: 11,
    color: C.textSub,
    marginLeft: 6,
  },
  sectionCard: {
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
    marginBottom: 10,
  },
  passengerCard: {
    backgroundColor: C.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  passengerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  passengerNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  passengerNumberText: {
    color: C.white,
    fontSize: 11,
    fontWeight: 'bold',
  },
  passengerName: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
  },
  passengerDetails: {
    marginLeft: 32,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  detailLabel: {
    fontSize: 11,
    color: C.textSub,
    marginLeft: 6,
    marginRight: 4,
    width: 50,
  },
  detailValue: {
    fontSize: 13,
    color: C.text,
    flex: 1,
  },
  noDataText: {
    fontSize: 14,
    color: C.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
  seatCard: {
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  seatsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  seatBadge: {
    backgroundColor: C.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: C.primaryMuted,
  },
  seatText: {
    fontSize: 13,
    fontWeight: '500',
    color: C.primary,
  },
  facilitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  facilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: 8,
  },
  facilityText: {
    marginLeft: 6,
    fontSize: 13,
    color: C.textSub,
  },
  priceCard: {
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  priceTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
    marginBottom: 10,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  priceLabel: {
    fontSize: 13,
    color: C.textSub,
  },
  priceValue: {
    fontSize: 13,
    color: C.text,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: C.primary,
  },
  qrCard: {
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    alignItems: 'center',
  },
  qrContainer: {
    backgroundColor: C.surface,
    width: 170,
    height: 170,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  qrPlaceholder: {
    alignItems: 'center',
  },
  qrText: {
    fontSize: 11,
    color: C.textSub,
    marginTop: 6,
  },
  qrCode: {
    fontSize: 12,
    fontWeight: 'bold',
    color: C.text,
    marginTop: 3,
    letterSpacing: 1,
  },
  qrInstruction: {
    fontSize: 12,
    color: C.textSub,
    textAlign: 'center',
  },
  qrSubtitle: {
    fontSize: 12,
    color: C.textSub,
    textAlign: 'center',
    marginBottom: 8,
  },
  ticketCarousel: {
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  carouselTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  carouselContent: {
    paddingHorizontal: 0,
  },
  carouselCard: {
    width: width - 80,
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 14,
    marginRight: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  carouselCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  carouselCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
    marginLeft: 8,
  },
  carouselCardBody: {
    marginBottom: 8,
  },
  carouselRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  carouselLabel: {
    fontSize: 12,
    color: C.textSub,
    marginLeft: 6,
    width: 80,
  },
  carouselValue: {
    fontSize: 13,
    fontWeight: '500',
    color: C.text,
    flex: 1,
  },
  carouselIndicator: {
    alignItems: 'center',
    marginTop: 4,
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.border,
  },
  indicatorDotActive: {
    backgroundColor: C.primary,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  carouselDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  carouselDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.border,
    marginHorizontal: 4,
  },
  carouselDotActive: {
    backgroundColor: C.primary,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  currentTicketInfo: {
    backgroundColor: C.primaryLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.primaryMuted,
  },
  currentTicketRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  currentTicketLabel: {
    fontSize: 12,
    color: C.textSub,
    fontWeight: '500',
  },
  currentTicketValue: {
    fontSize: 13,
    fontWeight: '600',
    color: C.primary,
  },
  qrModalPassenger: {
    backgroundColor: C.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  qrModalPassengerText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.primary,
    textAlign: 'center',
  },
  notesCard: {
    backgroundColor: C.amberLight,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.amber,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  notesTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: C.amber,
    marginLeft: 8,
  },
  notesContent: {
    marginLeft: 26,
  },
  noteText: {
    fontSize: 11,
    color: C.amber,
    marginBottom: 3,
    lineHeight: 16,
  },
  actionContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primary,
    borderRadius: 10,
    paddingVertical: 14,
    marginBottom: 10,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: C.white,
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.red,
    borderRadius: 10,
    paddingVertical: 14,
    marginBottom: 10,
  },
  secondaryButtonText: {
    color: C.red,
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.green,
    borderRadius: 10,
    paddingVertical: 14,
    marginBottom: 10,
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  payButtonText: {
    color: C.white,
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingVertical: 14,
  },
  supportButtonText: {
    color: C.primary,
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
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
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
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
    fontSize: 17,
    fontWeight: '700',
    color: C.text,
  },
  modalContent: {
    padding: 16,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: C.surface,
  },
  modalOptionText: {
    fontSize: 15,
    color: C.text,
    marginLeft: 12,
    flex: 1,
  },
  cancelOption: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    marginTop: 8,
  },
  cancelOptionText: {
    color: C.textSub,
    fontSize: 15,
    fontWeight: '500',
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
    fontSize: 17,
    fontWeight: 'bold',
    color: C.red,
    marginBottom: 4,
  },
  cancelModalSubtitle: {
    fontSize: 13,
    color: C.red,
    textAlign: 'center',
  },
  cancelModalContent: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 13,
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
    fontSize: 11,
    color: C.textSub,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 16,
  },
  cancelModalActions: {
    flexDirection: 'row',
    gap: 10,
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
  qrModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrModalContainer: {
    backgroundColor: C.text,
    borderRadius: 20,
    width: width * 0.9,
    overflow: 'hidden',
  },
  qrModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: C.text,
  },
  qrModalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: C.white,
  },
  qrModalContent: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: C.white,
  },
  qrCodeDisplay: {
    backgroundColor: C.white,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  qrCodeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: C.text,
    marginTop: 10,
    letterSpacing: 2,
  },
  qrModalInstruction: {
    fontSize: 13,
    color: C.textSub,
    textAlign: 'center',
    marginBottom: 14,
  },
  qrModalInfo: {
    backgroundColor: C.surface,
    borderRadius: 10,
    padding: 12,
    width: '100%',
  },
  qrInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  qrInfoLabel: {
    fontSize: 12,
    color: C.textSub,
  },
  qrInfoValue: {
    fontSize: 12,
    color: C.text,
    fontWeight: '500',
  },
  hiddenContainer: {
    position: 'absolute',
    left: -1000,
    width: 600,
    backgroundColor: C.white,
  },
  printableTicket: {
    width: 600,
    backgroundColor: C.white,
    borderWidth: 2,
    borderColor: C.primary,
    borderRadius: 10,
    overflow: 'hidden',
  },
  printableHeader: {
    backgroundColor: C.primary,
    padding: 18,
    alignItems: 'center',
  },
  printableTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: C.white,
  },
  printableSubtitle: {
    fontSize: 13,
    color: C.white,
    marginTop: 4,
  },
  printableContent: {
    padding: 18,
  },
  printableRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  printableCol: {
    flex: 1,
  },
  printableLabel: {
    fontSize: 11,
    color: C.textSub,
    marginBottom: 2,
  },
  printableValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: C.text,
  },
  printableSubValue: {
    fontSize: 11,
    color: C.textSub,
    marginTop: 2,
  },
  printableRouteInfo: {
    backgroundColor: C.surface,
    padding: 14,
    borderRadius: 5,
    marginBottom: 16,
  },
  printablePassengerSection: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 16,
  },
  printableSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: C.text,
    marginBottom: 12,
  },
  printablePassengerRow: {
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.surfaceAlt,
    paddingBottom: 4,
  },
  printableQrSection: {
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: C.border,
    borderStyle: 'dashed',
    marginTop: 8,
  },
  printableQrWrapper: {
    padding: 8,
    backgroundColor: C.white,
  },
  printableFooter: {
    backgroundColor: C.surfaceAlt,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  printableFooterTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: C.textSub,
    marginBottom: 4,
  },
  printableFooterText: {
    fontSize: 10,
    color: C.textSub,
    marginBottom: 2,
  },
});

export default TicketDetailScreen;
