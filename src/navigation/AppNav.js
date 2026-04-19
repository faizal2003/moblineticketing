import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setCredentials } from '../store/slices/authSlice';

// Auth
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Passenger
import PassengerHome from '../screens/passenger/HomeScreen';
import SearchBusScreen from '../screens/passenger/SearchBusScreen';
import BusListScreen from '../screens/passenger/BusListScreen';
import BusDetailScreen from '../screens/passenger/BusDetailScreen';
import SeatSelectionScreen from '../screens/passenger/SeatSelectionScreen';
import BookingScreen from '../screens/passenger/BookingScreen';
import PaymentScreen from '../screens/passenger/PaymentScreen';
import MyTicketsScreen from '../screens/passenger/MyTicketsScreen';
import TicketDetailScreen from '../screens/passenger/TicketDetailScreen';

// Conductor
import ConductorHome from '../screens/conductor/HomeScreen';
import ScanTicketScreen from '../screens/conductor/ScanTicketScreen';
import PassengerListScreen from '../screens/conductor/PassengerListScreen';

const Stack = createNativeStackNavigator();

export default function AppNav() {
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const userData = await AsyncStorage.getItem('userData');

        if (token && userData) {
          dispatch(
            setCredentials({
              token,
              user: JSON.parse(userData),
              isAuthenticated: true,
            })
          );
        }
      } catch (e) {
        await AsyncStorage.multiRemove(['userToken', 'userData']);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [dispatch]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : user?.role === 'penumpang' ? ( // ✅ Ubah dari 'passenger' ke 'penumpang'
          <>
            <Stack.Screen name="PassengerHome" component={PassengerHome} />
            <Stack.Screen name="SearchBus" component={SearchBusScreen} />
            <Stack.Screen name="BusList" component={BusListScreen} />
            <Stack.Screen name="BusDetail" component={BusDetailScreen} />
            <Stack.Screen name="SeatSelection" component={SeatSelectionScreen} />
            <Stack.Screen name="Booking" component={BookingScreen} />
            <Stack.Screen name="Payment" component={PaymentScreen} />
            <Stack.Screen name="MyTickets" component={MyTicketsScreen} />
            <Stack.Screen name="TicketDetail" component={TicketDetailScreen} />
          </>
        ) : user?.role === 'kondektur' ? (
          <>
            <Stack.Screen name="ConductorHome" component={ConductorHome} />
            <Stack.Screen name="ScanTicket" component={ScanTicketScreen} />
            <Stack.Screen name="PassengerList" component={PassengerListScreen} />
          </>
        ) : null}
      </Stack.Navigator>
    </NavigationContainer>
  );
}