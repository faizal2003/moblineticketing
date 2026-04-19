import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
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
} from 'react-native';
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
import { busService } from '../../services/busService';

const { width, height } = Dimensions.get('window');

const TicketDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { ticket } = route.params || {};
  const bookingId = ticket?.id;

  const [loading, setLoading] = useState(true);
  const [currentTicket, setCurrentTicket] = useState(null);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const viewShotRef = useRef();
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
      
      // Transform backend data to currentTicket format
      setCurrentTicket({
        id: data.ticket?.ticket_code || 'N/A',
        bookingId: data.booking_code,
        busName: data.schedule?.bus_name,
        busNumber: data.schedule?.bus_number || '-',
        departure: data.schedule?.departure_city,
        destination: data.schedule?.arrival_city,
        departureDate: new Date(data.schedule?.departure_time),
        departureTime: new Date(data.schedule?.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        arrivalTime: new Date(data.schedule?.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        passengerCount: data.total_passengers,
        seats: data.passengers.map(p => p.seat_number),
        price: parseFloat(data.total_price),
        status: data.booking_status,
        paymentStatus: data.payment_status,
        bookingDate: new Date(data.created_at),
        boardingPoint: data.schedule?.departure_city,
        dropPoint: data.schedule?.arrival_city,
        bookingClass: data.schedule?.bus_type || 'Executive',
        facilities: data.schedule?.facilities || [],
        qrCode: data.ticket?.ticket_code || '-',
        passengerInfo: data.passengers.map(p => ({
          name: p.full_name,
          identityNumber: p.id_number,
          phone: p.phone,
          email: '-',
        })),
      });
    } catch (error) {
      console.error('Error fetching ticket details:', error);
      Alert.alert('Error', 'Gagal memuat detail tiket');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return format(date, 'EEEE, d MMMM yyyy', { locale: id });
  };

  const formatTime = (time) => {
    if (!time) return '-';
    return `${time} WIB`;
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
        return 'Perjalanan Selesai';
      default:
        return status;
    }
  };

  const getPaymentStatusText = (paymentStatus) => {
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
      
      // Capture the ticket as image
      setLoading(true);
      const uri = await viewShotRef.current.capture();
      
      if (Platform.OS === 'ios') {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Bagikan Tiket',
        });
      } else {
        await Share.share({
          url: uri,
          title: 'Tiket Bus Saya',
          message: 'Lihat tiket bus saya',
        });
      }
    } catch (error) {
      console.error('Error sharing ticket:', error);
      Alert.alert('Error', 'Gagal membagikan tiket');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      setLoading(true);
      const uri = await viewShotRef.current.capture();
      
      // Request permission for Android
      if (Platform.OS === 'android') {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Izin diperlukan', 'Izin diperlukan untuk menyimpan gambar');
          return;
        }
      }
      
      // Save to gallery
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Berhasil', 'Tiket berhasil disimpan ke galeri');
    } catch (error) {
      console.error('Error downloading ticket:', error);
      Alert.alert('Error', 'Gagal menyimpan tiket');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelTicket = () => {
    if (!cancellationReason.trim()) {
      Alert.alert('Error', 'Harap masukkan alasan pembatalan');
      return;
    }

    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setShowCancelModal(false);
      Alert.alert(
        'Berhasil',
        'Tiket berhasil dibatalkan. Dana akan dikembalikan dalam 3-5 hari kerja.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    }, 2000);
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
          <Ionicons name="card-outline" size={16} color="#666" />
          <Text style={styles.detailLabel}>ID:</Text>
          <Text style={styles.detailValue}>{passenger.identityNumber}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="call-outline" size={16} color="#666" />
          <Text style={styles.detailLabel}>Telepon:</Text>
          <Text style={styles.detailValue}>{passenger.phone}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="mail-outline" size={16} color="#666" />
          <Text style={styles.detailLabel}>Email:</Text>
          <Text style={styles.detailValue}>{passenger.email}</Text>
        </View>
      </View>
    </View>
  );

  const renderFacility = (facility, index) => (
    <View key={index} style={styles.facilityItem}>
      <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
      <Text style={styles.facilityText}>{facility}</Text>
    </View>
  );

  const renderPriceBreakdown = () => (
    <View style={styles.priceCard}>
      <Text style={styles.priceTitle}>Rincian Harga</Text>
      <View style={styles.priceRow}>
        <Text style={styles.priceLabel}>Tiket ({currentTicket.passengerCount} orang)</Text>
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
        <Text style={styles.totalValue}>Rp {currentTicket.price.toLocaleString('id-ID')}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E88E5" />
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
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#1E88E5" barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detail Tiket</Text>
        <TouchableOpacity 
          style={styles.shareButton}
          onPress={() => setShowShareOptions(true)}
        >
          <Ionicons name="share-outline" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Ticket Card (for screenshot) */}
        <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 0.9 }}>
          <View style={styles.ticketContainer}>
            {/* Ticket Header */}
            <View style={styles.ticketHeader}>
              <View style={styles.ticketIdContainer}>
                <Text style={styles.ticketId}>{currentTicket.id}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(currentTicket.status) }]}>
                  <Text style={styles.statusText}>{getStatusText(currentTicket.status)}</Text>
                </View>
              </View>
              <Text style={styles.bookingId}>Booking ID: {currentTicket.bookingId}</Text>
            </View>

            {/* Bus Info */}
            <View style={styles.busInfoCard}>
              <View style={styles.busHeader}>
                <View style={styles.busIconContainer}>
                  <Ionicons name="bus" size={32} color="#1E88E5" />
                </View>
                <View style={styles.busInfo}>
                  <Text style={styles.busName}>{currentTicket.busName}</Text>
                  <Text style={styles.busNumber}>{currentTicket.busNumber} • {currentTicket.bookingClass}</Text>
                </View>
              </View>
            </View>

            {/* Route Info */}
            <View style={styles.routeCard}>
              <View style={styles.routeHeader}>
                <Text style={styles.routeTitle}>Rute Perjalanan</Text>
                <TouchableOpacity onPress={handleOpenMaps} style={styles.mapButton}>
                  <Ionicons name="map-outline" size={20} color="#1E88E5" />
                  <Text style={styles.mapButtonText}>Peta</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.routeDetails}>
                <View style={styles.routeStop}>
                  <View style={styles.routeDot} />
                  <View style={styles.routeInfo}>
                    <Text style={styles.routeCity}>{currentTicket.departure}</Text>
                    <Text style={styles.routePoint}>{currentTicket.boardingPoint}</Text>
                    <Text style={styles.routeTime}>{formatTime(currentTicket.departureTime)}</Text>
                  </View>
                  <Text style={styles.routeDate}>
                    {format(currentTicket.departureDate, 'd MMM yyyy')}
                  </Text>
                </View>
                
                <View style={styles.routeDuration}>
                  <View style={styles.durationLine} />
                  <View style={styles.durationInfo}>
                    <Ionicons name="time-outline" size={16} color="#666" />
                    <Text style={styles.durationText}>
                      {currentTicket.departureTime && currentTicket.arrivalTime 
                        ? `${Math.abs(new Date(`2000-01-01 ${currentTicket.arrivalTime}`) - new Date(`2000-01-01 ${currentTicket.departureTime}`)) / (1000 * 60 * 60)} jam`
                        : '4 jam'
                      }
                    </Text>
                  </View>
                </View>
                
                <View style={styles.routeStop}>
                  <View style={[styles.routeDot, styles.destinationDot]} />
                  <View style={styles.routeInfo}>
                    <Text style={styles.routeCity}>{currentTicket.destination}</Text>
                    <Text style={styles.routePoint}>{currentTicket.dropPoint}</Text>
                    <Text style={styles.routeTime}>{formatTime(currentTicket.arrivalTime)}</Text>
                  </View>
                  <Text style={styles.routeDate}>
                    {format(currentTicket.departureDate, 'd MMM yyyy')}
                  </Text>
                </View>
              </View>
            </View>

            {/* Passenger Info */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Informasi Penumpang</Text>
              {currentTicket.passengerInfo?.map(renderPassengerInfo) || (
                <Text style={styles.noDataText}>Tidak ada data penumpang</Text>
              )}
            </View>

            {/* Seat Info */}
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

            {/* Facilities */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Fasilitas</Text>
              <View style={styles.facilitiesContainer}>
                {currentTicket.facilities.map(renderFacility)}
              </View>
            </View>

            {/* Price Breakdown */}
            {renderPriceBreakdown()}

            {/* QR Code */}
            <View style={styles.qrCard}>
              <Text style={styles.sectionTitle}>Kode Tiket</Text>
              <TouchableOpacity 
                style={styles.qrContainer}
                onPress={() => setShowQRModal(true)}
              >
                <View style={styles.qrPlaceholder}>
                  <Ionicons name="qr-code-outline" size={80} color="#1E88E5" />
                  <Text style={styles.qrText}>Scan untuk boarding</Text>
                  <Text style={styles.qrCode}>{currentTicket.qrCode}</Text>
                </View>
              </TouchableOpacity>
              <Text style={styles.qrInstruction}>
                Tunjukkan QR code ini saat boarding
              </Text>
            </View>

            {/* Important Notes */}
            <View style={styles.notesCard}>
              <View style={styles.notesHeader}>
                <Ionicons name="information-circle" size={20} color="#FF9800" />
                <Text style={styles.notesTitle}>Catatan Penting</Text>
              </View>
              <View style={styles.notesContent}>
                <Text style={styles.noteText}>• Hadir di boarding point 30 menit sebelum keberangkatan</Text>
                <Text style={styles.noteText}>• Bawa bukti identitas asli</Text>
                <Text style={styles.noteText}>• Tiket tidak dapat diubah atau dibatalkan 2 jam sebelum keberangkatan</Text>
                <Text style={styles.noteText}>• Dilarang membawa barang berbahaya</Text>
              </View>
            </View>
          </View>
        </ViewShot>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          {currentTicket.status === 'confirmed' && (
            <>
              <TouchableOpacity 
                style={styles.primaryButton}
                onPress={handleDownload}
                disabled={loading}
              >
                <Ionicons name="download-outline" size={20} color="#FFF" />
                <Text style={styles.primaryButtonText}>Download Tiket</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.secondaryButton}
                onPress={() => setShowCancelModal(true)}
                disabled={loading}
              >
                <Ionicons name="close-circle-outline" size={20} color="#F44336" />
                <Text style={styles.secondaryButtonText}>Batalkan Tiket</Text>
              </TouchableOpacity>
            </>
          )}

          {currentTicket.status === 'pending' && (
            <TouchableOpacity 
              style={styles.payButton}
              onPress={() => navigation.navigate('Payment', { bookingId: currentTicket.bookingId })}
            >
              <Ionicons name="card-outline" size={20} color="#FFF" />
              <Text style={styles.payButtonText}>Bayar Sekarang</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={styles.supportButton}
            onPress={handleContactSupport}
          >
            <Ionicons name="headset-outline" size={20} color="#1E88E5" />
            <Text style={styles.supportButtonText}>Hubungi Support</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Share Options Modal */}
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
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalContent}>
              <TouchableOpacity 
                style={styles.modalOption}
                onPress={handleShare}
              >
                <Ionicons name="share-social-outline" size={28} color="#1E88E5" />
                <Text style={styles.modalOptionText}>Bagikan via Media Sosial</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalOption}
                onPress={handleDownload}
              >
                <Ionicons name="download-outline" size={28} color="#4CAF50" />
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
                Dana akan dikembalikan dalam 3-5 hari kerja ke metode pembayaran awal.
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

      {/* QR Code Modal */}
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
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.qrModalContent}>
              <View style={styles.qrCodeDisplay}>
                <Ionicons name="qr-code" size={200} color="#FFF" />
                <Text style={styles.qrCodeText}>{currentTicket.qrCode}</Text>
              </View>
              <Text style={styles.qrModalInstruction}>
                Tunjukkan kode ini kepada petugas boarding
              </Text>
              <View style={styles.qrModalInfo}>
                <View style={styles.qrInfoRow}>
                  <Text style={styles.qrInfoLabel}>Bus:</Text>
                  <Text style={styles.qrInfoValue}>{currentTicket.busName}</Text>
                </View>
                <View style={styles.qrInfoRow}>
                  <Text style={styles.qrInfoLabel}>Tanggal:</Text>
                  <Text style={styles.qrInfoValue}>
                    {format(currentTicket.departureDate, 'd MMM yyyy')}
                  </Text>
                </View>
                <View style={styles.qrInfoRow}>
                  <Text style={styles.qrInfoLabel}>Waktu:</Text>
                  <Text style={styles.qrInfoValue}>{currentTicket.departureTime}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// Add missing imports
import { TextInput, ActivityIndicator } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E88E5',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  shareButton: {
    padding: 4,
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
    fontSize: 20,
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
    fontSize: 12,
    fontWeight: 'bold',
  },
  bookingId: {
    fontSize: 12,
    color: '#666',
  },
  busInfoCard: {
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
  busHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  busIconContainer: {
    backgroundColor: '#E3F2FD',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  busInfo: {
    flex: 1,
  },
  busName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  busNumber: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  routeCard: {
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
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  routeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  mapButtonText: {
    color: '#1E88E5',
    fontSize: 12,
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
    marginBottom: 8,
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#1E88E5',
    marginTop: 4,
    marginRight: 12,
  },
  destinationDot: {
    backgroundColor: '#4CAF50',
  },
  routeInfo: {
    flex: 1,
  },
  routeCity: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  routePoint: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  routeTime: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginTop: 4,
  },
  routeDate: {
    fontSize: 12,
    color: '#666',
    marginLeft: 12,
  },
  routeDuration: {
    marginLeft: 5,
    marginVertical: 8,
  },
  durationLine: {
    width: 2,
    height: 40,
    backgroundColor: '#1E88E5',
    marginLeft: 5,
  },
  durationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  durationText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
  },
  sectionCard: {
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  passengerCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  passengerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  passengerNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1E88E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  passengerNumberText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  passengerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  passengerDetails: {
    marginLeft: 36,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
    marginRight: 4,
    width: 50,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  noDataText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  seatCard: {
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
  seatsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  seatBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  seatText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E88E5',
  },
  facilitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  facilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: 12,
  },
  facilityText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#555',
  },
  priceCard: {
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
  priceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
  },
  priceValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E88E5',
  },
  qrCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  qrContainer: {
    backgroundColor: '#F5F5F5',
    width: 200,
    height: 200,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  qrPlaceholder: {
    alignItems: 'center',
  },
  qrText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  qrCode: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
    letterSpacing: 1,
  },
  qrInstruction: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  notesCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FFECB3',
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  notesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9800',
    marginLeft: 8,
  },
  notesContent: {
    marginLeft: 28,
  },
  noteText: {
    fontSize: 12,
    color: '#FF9800',
    marginBottom: 4,
    lineHeight: 16,
  },
  actionContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E88E5',
    borderRadius: 8,
    paddingVertical: 14,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#F44336',
    borderRadius: 8,
    paddingVertical: 14,
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 14,
    marginBottom: 12,
  },
  payButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingVertical: 14,
  },
  supportButtonText: {
    color: '#1E88E5',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
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
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F8F9FA',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  cancelOption: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginTop: 8,
  },
  cancelOptionText: {
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
  qrModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrModalContainer: {
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    width: width * 0.9,
    overflow: 'hidden',
  },
  qrModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#000',
  },
  qrModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  qrModalContent: {
    padding: 24,
    alignItems: 'center',
  },
  qrCodeDisplay: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  qrCodeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 12,
    letterSpacing: 2,
  },
  qrModalInstruction: {
    fontSize: 14,
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  qrModalInfo: {
    backgroundColor: '#2C2C2C',
    borderRadius: 8,
    padding: 12,
    width: '100%',
  },
  qrInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  qrInfoLabel: {
    fontSize: 12,
    color: '#999',
  },
  qrInfoValue: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '500',
  },
});

export default TicketDetailScreen;