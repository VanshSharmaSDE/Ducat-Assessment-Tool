import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, shadows } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import ServerSettingsModal from './ServerSettingsModal';
import AdminProfileModal from './AdminProfileModal';

export default function Header({ title, subtitle, showServerPill = true }) {
  const { user, logout, isSuperAdmin, serverStatus } = useAuth();
  const [serverModalVisible, setServerModalVisible] = useState(false);
  const [adminProfileVisible, setAdminProfileVisible] = useState(false);

  const confirmLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of the Admin panel?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: logout },
      ],
      { cancelable: true }
    );
  };

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'A';

  return (
    <>
      <View style={[styles.container, shadows.sm]}>
        {/* Brand & Left Info */}
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <MaterialCommunityIcons name="code-tags-check" size={20} color={colors.primary} />
          </View>
          <View>
            <View style={styles.brandTitleRow}>
              <Text style={styles.brandTitle}>SkillCodex</Text>
              <View
                style={[
                  styles.rolePill,
                  { backgroundColor: `${colors.primary}18` },
                ]}
              >
                <Text
                  style={[
                    styles.roleText,
                    { color: colors.primaryDark },
                  ]}
                >
                  ADMIN
                </Text>
              </View>
            </View>
            <Text style={styles.greeting} numberOfLines={1}>
              {user?.name || 'Administrator'}
            </Text>
          </View>
        </View>

        {/* Right Action Icons */}
        <View style={styles.rightActions}>
          {showServerPill ? (
            <TouchableOpacity
              style={[
                styles.serverPill,
                serverStatus.online ? styles.serverOnline : styles.serverOffline,
              ]}
              onPress={() => setServerModalVisible(true)}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: serverStatus.online ? colors.success : colors.danger },
                ]}
              />
              <Text style={styles.serverPillText}>
                {serverStatus.online
                  ? serverStatus.latency
                    ? `${serverStatus.latency}ms`
                    : 'Online'
                  : 'Offline'}
              </Text>
            </TouchableOpacity>
          ) : null}

          {/* Quick Settings Icon */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setServerModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="server-outline" size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Avatar / Profile Initials - Opens Full Admin Profile */}
          <TouchableOpacity
            style={styles.avatarButton}
            onPress={() => setAdminProfileVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.avatarText}>{userInitial}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Optional Title Bar when provided */}
      {title ? (
        <View style={styles.titleSection}>
          <Text style={styles.pageTitle}>{title}</Text>
          {subtitle ? <Text style={styles.pageSubtitle}>{subtitle}</Text> : null}
        </View>
      ) : null}

      {/* Full Administrator Profile Modal */}
      <AdminProfileModal
        visible={adminProfileVisible}
        onClose={() => setAdminProfileVisible(false)}
      />

      {/* Server Endpoint Settings Modal */}
      <ServerSettingsModal
        visible={serverModalVisible}
        onClose={() => setServerModalVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  rolePill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  greeting: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
    maxWidth: 130,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  serverPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  serverOnline: {
    backgroundColor: colors.successLight,
    borderColor: colors.successBorder,
  },
  serverOffline: {
    backgroundColor: colors.dangerLight,
    borderColor: colors.dangerBorder,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  serverPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.textInverse,
    fontWeight: '800',
    fontSize: 14,
  },
  titleSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.4,
  },
  pageSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
