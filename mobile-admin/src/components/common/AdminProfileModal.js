import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  TouchableWithoutFeedback,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, shadows } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from './StatusBadge';
import ServerSettingsModal from './ServerSettingsModal';

export default function AdminProfileModal({ visible, onClose }) {
  const { user, isSuperAdmin, serverUrl, serverStatus, logout, refreshUserProfile } = useAuth();
  const [refreshingProfile, setRefreshingProfile] = useState(false);
  const [serverModalVisible, setServerModalVisible] = useState(false);

  const initial = (user?.name || 'A').charAt(0).toUpperCase();

  const handleRefresh = async () => {
    setRefreshingProfile(true);
    try {
      await refreshUserProfile();
      Alert.alert('Profile Refreshed', 'Administrator profile updated from server.');
    } catch (e) {
      Alert.alert('Sync Notice', 'Failed to refresh profile from server.');
    } finally {
      setRefreshingProfile(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out Administrator',
      'Are you sure you want to end your executive administrative session on this device?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            onClose();
            await logout();
          },
        },
      ]
    );
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={onClose}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>

          <View style={[styles.modalCard, shadows.lg]}>
            {/* Modal Header */}
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <MaterialCommunityIcons name="shield-account" size={24} color={colors.primary} />
                <Text style={styles.title}>Administrator Profile</Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.content}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{ paddingBottom: 30 }}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
            >
              {/* Profile Hero Card */}
              <View style={[styles.profileHero, shadows.sm]}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initial}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.profileName}>{user?.name || 'Administrator'}</Text>
                  <Text style={styles.profileEmail}>{user?.email || 'admin@skillcodex.com'}</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    <StatusBadge status={isSuperAdmin ? 'SUPER_ADMIN' : 'ADMIN'} size="small" />
                    {user?.organization ? (
                      <View style={styles.orgChip}>
                        <MaterialCommunityIcons name="domain" size={11} color={colors.primary} />
                        <Text style={styles.orgChipText}>{user.organization}</Text>
                      </View>
                    ) : (
                      <View style={styles.orgChip}>
                        <MaterialCommunityIcons name="earth" size={11} color={colors.primary} />
                        <Text style={styles.orgChipText}>Global Master Admin</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Account Credentials & Authority */}
              <Text style={styles.sectionTitle}>Account Authority & Identity</Text>
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Admin ID</Text>
                  <Text style={[styles.infoValue, { fontFamily: 'monospace' }]}>
                    {user?.adminId || user?._id || 'SYS-ADMIN'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Account Role</Text>
                  <Text style={[styles.infoValue, { color: colors.primary }]}>
                    {isSuperAdmin ? 'Super Administrator' : 'Administrator'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Assigned Organization</Text>
                  <Text style={styles.infoValue}>
                    {user?.organization || 'All Institutional Tenants'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Registered Mobile</Text>
                  <Text style={styles.infoValue}>{user?.phone || 'Not configured'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Created Date</Text>
                  <Text style={styles.infoValue}>
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Active Member'}
                  </Text>
                </View>
              </View>

              {/* Server & Connectivity Telemetry */}
              <Text style={styles.sectionTitle}>System & Server Telemetry</Text>
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Backend Endpoint</Text>
                  <Text style={[styles.infoValue, { fontSize: 11 }]} numberOfLines={1}>
                    {serverUrl}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Connection Status</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: serverStatus.online ? colors.success : colors.danger },
                      ]}
                    />
                    <Text
                      style={[
                        styles.infoValue,
                        { color: serverStatus.online ? colors.success : colors.danger },
                      ]}
                    >
                      {serverStatus.online ? 'Online & Authenticated' : 'Offline'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={{ gap: 10, marginTop: 16 }}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.refreshBtn]}
                  onPress={handleRefresh}
                  disabled={refreshingProfile}
                  activeOpacity={0.7}
                >
                  {refreshingProfile ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <Ionicons name="refresh" size={18} color={colors.primary} />
                      <Text style={styles.refreshBtnText}>Refresh Profile Details</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.serverBtn]}
                  onPress={() => setServerModalVisible(true)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="server-outline" size={18} color={colors.textSecondary} />
                  <Text style={styles.serverBtnText}>Configure Server Endpoint</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.logoutBtn]}
                  onPress={handleLogout}
                  activeOpacity={0.8}
                >
                  <Ionicons name="log-out-outline" size={18} color={colors.danger} />
                  <Text style={styles.logoutBtnText}>Log Out Administrator</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Embedded Server Settings Modal */}
      <ServerSettingsModal
        visible={serverModalVisible}
        onClose={() => setServerModalVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    margin: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  profileHero: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  profileName: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  profileEmail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  orgChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  orgChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 18,
    marginBottom: 8,
  },
  infoCard: {
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    maxWidth: '60%',
    textAlign: 'right',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  refreshBtn: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  refreshBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  serverBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  serverBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  logoutBtn: {
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  logoutBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.danger,
  },
});
