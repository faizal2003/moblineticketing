import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  FlatList,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DatePicker from 'react-native-date-picker';
import { busService } from '../../services/busService';
import { logout } from '../../store/slices/authSlice';
import {
  updateSearchParams,
  fetchAvailableBuses,
  clearSearchResults,
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
  white: '#FFFFFF',
  headerBg: '#1E3A5F',
  headerText: '#FFFFFF',
  headerSub: '#93C5FD',
};

export default function PassengerHome({ navigation }) {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);

  const [searchParams, setSearchParams] = useState({
    origin: '',
    destination: '',
    date: new Date(),
    passengers: 1,
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [popularRoutes, setPopularRoutes] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [availableRoutes, setAvailableRoutes] = useState([]);
  const [showOriginDropdown, setShowOriginDropdown] = useState(false);
  const [showDestinationDropdown, setShowDestinationDropdown] = useState(false);
  const [showAllPopularModal, setShowAllPopularModal] = useState(false);

  useEffect(() => {
    fetchPopularRoutes();
    fetchAvailableRoutes();
  }, []);

  const fetchAvailableRoutes = async () => {
    try {
      const response = await busService.getRoutes();
      setAvailableRoutes(response.data.data);
    } catch (error) {
      console.error('Error fetching routes:', error);
    }
  };

  const getFilteredOrigins = () => {
    const origins = [...new Set(availableRoutes.map(r => r.origin_city))];
    if (!searchParams.origin) return origins;
    return origins.filter(c =>
      c.toLowerCase().includes(searchParams.origin.toLowerCase()),
    );
  };

  const getFilteredDestinations = () => {
    let destinations = availableRoutes;
    if (searchParams.origin) {
      destinations = destinations.filter(
        r => r.origin_city.toLowerCase() === searchParams.origin.toLowerCase(),
      );
    }
    const unique = [...new Set(destinations.map(r => r.destination_city))];
    if (!searchParams.destination) return unique;
    return unique.filter(c =>
      c.toLowerCase().includes(searchParams.destination.toLowerCase()),
    );
  };

  const fetchPopularRoutes = async () => {
    try {
      const response = await busService.getPopularRoutes();
      setPopularRoutes(response.data.data);
    } catch (error) {
      console.error('Error fetching popular routes:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert('Keluar', 'Yakin ingin keluar dari akun?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Keluar',
        onPress: () => dispatch(logout()),
        style: 'destructive',
      },
    ]);
  };

  const handleSearch = async () => {
    if (!searchParams.origin || !searchParams.destination) {
      Alert.alert('Perhatian', 'Silakan pilih kota asal dan tujuan');
      return;
    }
    if (
      searchParams.origin.toLowerCase() ===
      searchParams.destination.toLowerCase()
    ) {
      Alert.alert('Perhatian', 'Kota asal dan tujuan tidak boleh sama');
      return;
    }
    setIsSearching(true);
    try {
      const params = {
        departure: searchParams.origin,
        destination: searchParams.destination,
        departureDate: searchParams.date.toISOString(),
        passengers: searchParams.passengers,
      };
      dispatch(updateSearchParams(params));
      dispatch(clearSearchResults());
      const result = await dispatch(fetchAvailableBuses(params)).unwrap();
      if (result.data && result.data.length > 0) {
        navigation.navigate('BusList');
      } else {
        Alert.alert(
          'Tidak Ditemukan',
          'Tidak ada bus yang tersedia untuk rute dan tanggal tersebut.',
        );
      }
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Gagal', 'Tidak dapat mencari bus. Coba lagi.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleQuickRoute = async item => {
    setIsSearching(true);
    try {
      const params = {
        departure: item.origin,
        destination: item.destination,
        departureDate: searchParams.date.toISOString(),
        passengers: 1,
      };
      dispatch(updateSearchParams(params));
      dispatch(clearSearchResults());
      const result = await dispatch(fetchAvailableBuses(params)).unwrap();
      if (result.data && result.data.length > 0) {
        navigation.navigate('BusList');
      } else {
        Alert.alert(
          'Tidak Ditemukan',
          'Tidak ada bus tersedia untuk rute ini.',
        );
      }
    } catch {
      Alert.alert('Gagal', 'Tidak dapat mencari bus.');
    } finally {
      setIsSearching(false);
    }
  };

  const renderPopularRoute = ({ item }) => (
    <TouchableOpacity
      style={styles.routeCard}
      onPress={() => handleQuickRoute(item)}
      activeOpacity={0.75}
    >
      <View style={styles.routeIconWrap}>
        <Icon name="directions-bus" size={18} color={C.primary} />
      </View>
      <View style={styles.routeInfo}>
        <Text style={styles.routeCities} numberOfLines={1}>
          {item.origin} → {item.destination}
        </Text>
        <Text style={styles.routePrice}>{item.formatted_price}</Text>
      </View>
      <Icon name="chevron-right" size={20} color={C.textMuted} />
    </TouchableOpacity>
  );

  // ─── Formatted date label ────────────────────────────────────────────────
  const formattedDate = searchParams.date.toLocaleDateString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={C.headerBg}
        translucent={false}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
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
              <Text style={styles.subGreeting}>Mau pergi ke mana hari ini?</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => navigation.navigate('Profile')}
            >
              <Icon name="person-outline" size={24} color={C.headerText} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerBtn, { marginLeft: 8 }]}
              onPress={handleLogout}
            >
              <Icon name="logout" size={22} color={C.headerText} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Search Card ── */}
        <View style={styles.searchCard}>
          {/* Origin field */}
          <View style={{ zIndex: 20 }}>
            <Text style={styles.fieldLabel}>DARI</Text>
            <View style={styles.inputRow}>
              <Icon
                name="trip-origin"
                size={18}
                color={C.primary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Kota asal"
                placeholderTextColor={C.textMuted}
                value={searchParams.origin}
                onChangeText={t => {
                  setSearchParams({ ...searchParams, origin: t });
                  setShowOriginDropdown(true);
                }}
                onFocus={() => {
                  setShowOriginDropdown(true);
                  setShowDestinationDropdown(false);
                }}
              />
              {searchParams.origin !== '' && (
                <TouchableOpacity
                  onPress={() =>
                    setSearchParams({ ...searchParams, origin: '' })
                  }
                >
                  <Icon name="close" size={16} color={C.textMuted} />
                </TouchableOpacity>
              )}
            </View>
            {showOriginDropdown && getFilteredOrigins().length > 0 && (
              <View style={styles.dropdown}>
                {getFilteredOrigins().map((city, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.dropdownItem,
                      i === getFilteredOrigins().length - 1 && {
                        borderBottomWidth: 0,
                      },
                    ]}
                    onPress={() => {
                      setSearchParams({ ...searchParams, origin: city });
                      setShowOriginDropdown(false);
                    }}
                  >
                    <Icon
                      name="location-on"
                      size={14}
                      color={C.textMuted}
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.dropdownText}>{city}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Divider with swap hint */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <View style={styles.dividerDot}>
              <Icon name="swap-vert" size={14} color={C.primary} />
            </View>
            <View style={styles.dividerLine} />
          </View>

          {/* Destination field */}
          <View style={{ zIndex: 10 }}>
            <Text style={styles.fieldLabel}>KE</Text>
            <View style={styles.inputRow}>
              <Icon
                name="location-on"
                size={18}
                color={C.primary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Kota tujuan"
                placeholderTextColor={C.textMuted}
                value={searchParams.destination}
                onChangeText={t => {
                  setSearchParams({ ...searchParams, destination: t });
                  setShowDestinationDropdown(true);
                }}
                onFocus={() => {
                  setShowDestinationDropdown(true);
                  setShowOriginDropdown(false);
                }}
              />
              {searchParams.destination !== '' && (
                <TouchableOpacity
                  onPress={() =>
                    setSearchParams({ ...searchParams, destination: '' })
                  }
                >
                  <Icon name="close" size={16} color={C.textMuted} />
                </TouchableOpacity>
              )}
            </View>
            {showDestinationDropdown &&
              getFilteredDestinations().length > 0 && (
                <View style={styles.dropdown}>
                  {getFilteredDestinations().map((city, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[
                        styles.dropdownItem,
                        i === getFilteredDestinations().length - 1 && {
                          borderBottomWidth: 0,
                        },
                      ]}
                      onPress={() => {
                        setSearchParams({ ...searchParams, destination: city });
                        setShowDestinationDropdown(false);
                      }}
                    >
                      <Icon
                        name="location-on"
                        size={14}
                        color={C.textMuted}
                        style={{ marginRight: 8 }}
                      />
                      <Text style={styles.dropdownText}>{city}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
          </View>

          {/* Date + Passenger row */}
          <View style={styles.metaRow}>
            {/* Date picker */}
            <TouchableOpacity
              style={styles.metaItem}
              onPress={() => setShowDatePicker(true)}
            >
              <Icon
                name="event"
                size={16}
                color={C.primary}
                style={{ marginRight: 6 }}
              />
              <View>
                <Text style={styles.metaLabel}>Tanggal</Text>
                <Text style={styles.metaValue}>{formattedDate}</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.metaDivider} />

            {/* Passenger counter */}
            <View style={styles.metaItem}>
              <Icon
                name="person-outline"
                size={16}
                color={C.primary}
                style={{ marginRight: 6 }}
              />
              <View>
                <Text style={styles.metaLabel}>Penumpang</Text>
                <View style={styles.counterRow}>
                  <TouchableOpacity
                    style={styles.counterBtn}
                    onPress={() =>
                      setSearchParams(p => ({
                        ...p,
                        passengers: Math.max(1, p.passengers - 1),
                      }))
                    }
                  >
                    <Icon name="remove" size={14} color={C.primary} />
                  </TouchableOpacity>
                  <Text style={styles.counterValue}>
                    {searchParams.passengers}
                  </Text>
                  <TouchableOpacity
                    style={styles.counterBtn}
                    onPress={() =>
                      setSearchParams(p => ({
                        ...p,
                        passengers: Math.min(10, p.passengers + 1),
                      }))
                    }
                  >
                    <Icon name="add" size={14} color={C.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* Search button */}
          <TouchableOpacity
            style={[styles.searchBtn, isSearching && styles.searchBtnDisabled]}
            onPress={handleSearch}
            disabled={isSearching}
            activeOpacity={0.85}
          >
            {isSearching ? (
              <ActivityIndicator color={C.white} size="small" />
            ) : (
              <>
                <Icon
                  name="search"
                  size={18}
                  color={C.white}
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.searchBtnText}>Cari Bus</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Quick Actions ── */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickItem}
            onPress={() => navigation.navigate('MyTickets')}
          >
            <View
              style={[styles.quickIcon, { backgroundColor: C.primaryLight }]}
            >
              <Icon name="confirmation-number" size={22} color={C.primary} />
            </View>
            <Text style={styles.quickLabel}>Tiket Saya</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickItem}
            onPress={() => navigation.navigate('FAQ')}
          >
            <View style={[styles.quickIcon, { backgroundColor: C.greenLight }]}>
              <Icon name="support-agent" size={22} color={C.green} />
            </View>
            <Text style={styles.quickLabel}>Bantuan</Text>
          </TouchableOpacity>
        </View>

        {/* ── Popular Routes ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Rute Populer</Text>
            <TouchableOpacity onPress={() => setShowAllPopularModal(true)}>
              <Text style={styles.seeAll}>Lihat semua</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={popularRoutes}
            renderItem={renderPopularRoute}
            keyExtractor={(item, index) =>
              item.id?.toString() || index.toString()
            }
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          />
        </View>

        {/* bottom spacing */}
        <View style={{ height: 32 }} />
      </ScrollView>

      <DatePicker
        modal
        open={showDatePicker}
        date={searchParams.date}
        mode="date"
        onConfirm={date => {
          setShowDatePicker(false);
          setSearchParams({ ...searchParams, date });
        }}
        onCancel={() => setShowDatePicker(false)}
        minimumDate={new Date()}
      />

      {/* All Popular Routes Modal (ordered by popularity) */}
      <Modal
        visible={showAllPopularModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAllPopularModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.popularModalContainer}>
            <View style={styles.popularModalHeader}>
              <Text style={styles.popularModalTitle}>Rute Populer</Text>
              <TouchableOpacity onPress={() => setShowAllPopularModal(false)}>
                <Icon name="close" size={24} color={C.textSub} />
              </TouchableOpacity>
            </View>
            <Text style={styles.popularModalSubtitle}>
              Diurutkan berdasarkan jumlah pemesanan
            </Text>

            <FlatList
              data={popularRoutes}
              keyExtractor={(item, index) =>
                item.id?.toString() || index.toString()
              }
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              contentContainerStyle={styles.popularModalList}
              ListEmptyComponent={
                <Text style={styles.popularEmptyText}>
                  Belum ada rute populer
                </Text>
              }
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  style={styles.popularRankCard}
                  activeOpacity={0.75}
                  onPress={() => {
                    setShowAllPopularModal(false);
                    handleQuickRoute(item);
                  }}
                >
                  <View style={styles.popularRankBadge}>
                    <Text style={styles.popularRankText}>{index + 1}</Text>
                  </View>
                  <View style={styles.routeInfo}>
                    <Text style={styles.routeCities} numberOfLines={1}>
                      {item.origin} → {item.destination}
                    </Text>
                    <Text style={styles.routePrice}>
                      {item.formatted_price}
                    </Text>
                  </View>
                  <View style={styles.popularCountWrap}>
                    <Icon name="people" size={14} color={C.textSub} />
                    <Text style={styles.popularCountText}>
                      {item.booking_count}x
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.headerBg,
  },
  scroll: {
    flex: 1,
    backgroundColor: C.surface,
  },
  scrollContent: {
    paddingBottom: 16,
  },

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    backgroundColor: C.headerBg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 32,
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
    fontSize: 22,
    fontWeight: '700',
    color: C.headerText,
    letterSpacing: 0.2,
  },
  subGreeting: {
    fontSize: 13,
    color: C.headerSub,
    marginTop: 3,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Search Card ──────────────────────────────────────────────────────────
  searchCard: {
    backgroundColor: C.white,
    marginHorizontal: 16,
    marginTop: -18, // overlaps header bottom
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 30,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: C.textMuted,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: C.border,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: C.text,
  },

  // Divider with swap icon
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.border,
  },
  dividerDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: C.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: C.primaryMuted,
  },

  // Dropdown
  dropdown: {
    position: 'absolute',
    top: 72,
    left: 0,
    right: 0,
    backgroundColor: C.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    maxHeight: 170,
    overflow: 'hidden',
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 10,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  dropdownText: {
    fontSize: 14,
    color: C.text,
  },

  // Date + Passenger meta row
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  metaItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: C.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text,
    marginTop: 2,
  },
  metaDivider: {
    width: 1,
    height: 36,
    backgroundColor: C.border,
    marginHorizontal: 12,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  counterBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterValue: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
    marginHorizontal: 10,
    minWidth: 16,
    textAlign: 'center',
  },

  // Search button
  searchBtn: {
    flexDirection: 'row',
    backgroundColor: C.primary,
    borderRadius: 14,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  searchBtnDisabled: {
    backgroundColor: C.primaryMuted,
    shadowOpacity: 0,
    elevation: 0,
  },
  searchBtnText: {
    color: C.white,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.4,
  },

  // ── Quick Actions ─────────────────────────────────────────────────────────
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: C.white,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  quickItem: {
    flex: 1,
    alignItems: 'center',
  },
  quickIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 7,
  },
  quickLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: C.textSub,
    textAlign: 'center',
  },

  // ── Popular Routes ────────────────────────────────────────────────────────
  section: {
    marginHorizontal: 16,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
    letterSpacing: 0.2,
  },
  seeAll: {
    fontSize: 13,
    color: C.primary,
    fontWeight: '600',
  },
  routeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  routeIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: C.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  routeInfo: {
    flex: 1,
  },
  routeCities: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
  },
  routePrice: {
    fontSize: 13,
    color: C.primary,
    fontWeight: '500',
    marginTop: 3,
  },

  // ── All Popular Routes Modal ────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  popularModalContainer: {
    backgroundColor: C.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 24,
    maxHeight: '80%',
  },
  popularModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  popularModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
  },
  popularModalSubtitle: {
    fontSize: 12,
    color: C.textSub,
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 12,
  },
  popularModalList: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  popularEmptyText: {
    fontSize: 14,
    color: C.textMuted,
    textAlign: 'center',
    paddingVertical: 30,
  },
  popularRankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  popularRankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  popularRankText: {
    color: C.white,
    fontSize: 13,
    fontWeight: '700',
  },
  popularCountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  popularCountText: {
    fontSize: 12,
    color: C.textSub,
    fontWeight: '600',
    marginLeft: 4,
  },
});
