import React from 'react';
import { View, ActivityIndicator, StyleSheet, StatusBar, Platform } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { colors } from './src/theme/colors';
import LoginScreen from './src/screens/LoginScreen';
import MainNavigator from './src/navigation/MainNavigator';

function RootAuthGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.splashContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // If user is authenticated as Admin or Faculty, render MainNavigator; otherwise LoginScreen
  if (!user) {
    return <LoginScreen />;
  }

  return <MainNavigator />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#F4F7FE"
        translucent={Platform.OS === 'android'}
      />
      <AuthProvider>
        <SafeAreaView style={styles.appContainer} edges={['top', 'left', 'right']}>
          <RootAuthGate />
        </SafeAreaView>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: '#F4F7FE',
  },
  splashContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F7FE',
  },
});
