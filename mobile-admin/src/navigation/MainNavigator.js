import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, SafeAreaView } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../theme/colors';

// Focused Screens for Executive Analytics & Supervision
import DashboardScreen from '../screens/DashboardScreen';
import ResultsScreen from '../screens/ResultsScreen';
import StudentsScreen from '../screens/StudentsScreen';
import FacultyScreen from '../screens/FacultyScreen';
import MoreHubScreen from '../screens/MoreHubScreen';

const TABS = [
  { id: 'Analytics', label: 'Analytics', icon: 'chart-box-outline', activeIcon: 'chart-box' },
  { id: 'Results', label: 'Results', icon: 'trophy-outline', activeIcon: 'trophy' },
  { id: 'Students', label: 'Students', icon: 'account-group-outline', activeIcon: 'account-group' },
  { id: 'Faculty', label: 'Faculty', icon: 'school-outline', activeIcon: 'school' },
  { id: 'Hub', label: 'Settings', icon: 'cog-outline', activeIcon: 'cog' },
];

export default function MainNavigator() {
  const [currentTab, setCurrentTab] = useState('Analytics');

  const handleNavigateTab = (tabName) => {
    setCurrentTab(tabName);
  };

  const renderActiveScreen = () => {
    switch (currentTab) {
      case 'Analytics':
        return <DashboardScreen onNavigateTab={handleNavigateTab} />;
      case 'Results':
        return <ResultsScreen />;
      case 'Students':
        return <StudentsScreen />;
      case 'Faculty':
        return <FacultyScreen />;
      case 'Hub':
        return <MoreHubScreen />;
      default:
        return <DashboardScreen onNavigateTab={handleNavigateTab} />;
    }
  };

  return (
    <View style={styles.container}>
      {/* Active Screen View */}
      <View style={styles.screenWrapper}>{renderActiveScreen()}</View>

      {/* Android Bottom Navigation Bar */}
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.bottomBar, shadows.lg]}>
          {TABS.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={styles.tabButton}
                onPress={() => setCurrentTab(tab.id)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.iconWrapper,
                    isActive && styles.iconWrapperActive,
                  ]}
                >
                  <MaterialCommunityIcons
                    name={isActive ? tab.activeIcon : tab.icon}
                    size={22}
                    color={isActive ? colors.primary : colors.textSecondary}
                  />
                </View>
                <Text
                  style={[
                    styles.tabLabel,
                    isActive && styles.tabLabelActive,
                  ]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenWrapper: {
    flex: 1,
  },
  safeArea: {
    backgroundColor: colors.surface,
  },
  bottomBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 6,
    paddingBottom: Platform.OS === 'android' ? 8 : 4,
    paddingHorizontal: 4,
    height: 60,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    width: 38,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapperActive: {
    backgroundColor: colors.primaryLight,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: '800',
  },
});
