import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar, View, ActivityIndicator } from 'react-native';
import { store } from './src/store/store';
import AppNavigator from './src/navigation/AppNav';

export default function App() {
  const [isAppReady, setIsAppReady] = useState(false);

  useEffect(() => {
    // Initialize app resources here if needed
    const initApp = async () => {
      // You can initialize any resources here (fonts, async storage, etc.)
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate loading
      setIsAppReady(true);
    };

    initApp();
  }, []);

  if (!isAppReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar 
            barStyle="dark-content" 
            backgroundColor="#FFFFFF" 
            translucent={false}
          />
          <AppNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </Provider>
  );
}