import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  FlatList,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, shadows } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import Header from '../components/common/Header';
import ServerSettingsModal from '../components/common/ServerSettingsModal';
import AdminProfileModal from '../components/common/AdminProfileModal';
import StatusBadge from '../components/common/StatusBadge';

export default function MoreHubScreen() {
  const { user, logout, isSuperAdmin, serverUrl, serverStatus } = useAuth();
  const [serverModalVisible, setServerModalVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  // Management modals (Batches, Technologies, Organizations)
  const [activeModal, setActiveModal] = useState(null); // 'BATCHES', 'TECH', 'ORGS'
  const [dataList, setDataList] = useState([]);
  const [loadingModal, setLoadingModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemExtra, setNewItemExtra] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const openManagement = (type) => {
    setActiveModal(type);
    setDataList([]);
    setNewItemName('');
    setNewItemExtra('');
    loadModalData(type);
  };

  const loadModalData = async (type) => {
    setLoadingModal(true);
    try {
      if (type === 'BATCHES') {
        const res = await api.get('/admin/batches');
        setDataList(res?.data?.batches || res?.data || []);
      } else if (type === 'TECH') {
        const res = await api.get('/admin/technologies');
        setDataList(res?.data?.technologies || res?.data || []);
      } else if (type === 'ORGS') {
        const res = await api.get('/admin/organizations');
        setDataList(res?.data?.organizations || res?.data || []);
      }
    } catch (e) {
      console.warn('Failed to load modal data', e.message);
    } finally {
      setLoadingModal(false);
    }
  };

  const handleCreateItem = async () => {
    if (!newItemName.trim()) {
      Alert.alert('Required', 'Please enter a name.');
      return;
    }

    setSubmitting(true);
    try {
      if (activeModal === 'BATCHES') {
        await api.post('/admin/batches', {
          name: newItemName.trim(),
          code: newItemExtra.trim() || `BATCH-${Date.now().toString().slice(-4)}`,
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        });
      } else if (activeModal === 'TECH') {
        await api.post('/admin/technologies', {
          name: newItemName.trim(),
          description: newItemExtra.trim() || 'Programming stack',
        });
      } else if (activeModal === 'ORGS') {
        await api.post('/admin/organizations', {
          name: newItemName.trim(),
          code: newItemExtra.trim() || `ORG-${Date.now().toString().slice(-4)}`,
        });
      }

      Alert.alert('Success', `${newItemName} added successfully.`);
      setNewItemName('');
      setNewItemExtra('');
      loadModalData(activeModal);
    } catch (err) {
      Alert.alert('Error', err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to log out of the Admin panel?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: logout },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Header title="Control Hub" subtitle="Cohorts, tech stacks, institutions, and server preferences" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Summary Card - Opens Full Admin Profile */}
        <TouchableOpacity
          style={[styles.profileCard, shadows.sm]}
          onPress={() => setProfileModalVisible(true)}
          activeOpacity={0.8}
        >
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>
              {(user?.name || 'A').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.userName}>{user?.name || 'Administrator'}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
              <StatusBadge status="ADMIN" size="small" />
              {user?.organization ? (
                <View style={styles.orgPill}>
                  <Text style={styles.orgPillText} numberOfLines={1}>{user.organization}</Text>
                </View>
              ) : null}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Section 1: Academic & Cohort Management */}
        <Text style={styles.sectionHeader}>Institutional Operations</Text>

        <TouchableOpacity
          style={[styles.menuItem, shadows.sm]}
          onPress={() => openManagement('BATCHES')}
          activeOpacity={0.8}
        >
          <View style={[styles.menuIconContainer, { backgroundColor: '#E0F2FE' }]}>
            <MaterialCommunityIcons name="folder-account-outline" size={22} color="#0284C7" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuTitle}>Batches & Student Cohorts</Text>
            <Text style={styles.menuSubtitle}>Manage active academic classes and candidate enrollment</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, shadows.sm]}
          onPress={() => openManagement('TECH')}
          activeOpacity={0.8}
        >
          <View style={[styles.menuIconContainer, { backgroundColor: '#FCE7F3' }]}>
            <MaterialCommunityIcons name="layers-outline" size={22} color="#DB2777" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuTitle}>Technologies & Stacks</Text>
            <Text style={styles.menuSubtitle}>Configure programming languages, frameworks & environments</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Super Admin Privileges */}
        {isSuperAdmin ? (
          <>
            <TouchableOpacity
              style={[styles.menuItem, shadows.sm]}
              onPress={() => openManagement('ORGS')}
              activeOpacity={0.8}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: '#EEF2FF' }]}>
                <MaterialCommunityIcons name="domain" size={22} color="#4F6BF7" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuTitle}>Campuses & Partner Organizations</Text>
                <Text style={styles.menuSubtitle}>Multi-tenant institutional client management</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </>
        ) : null}

        {/* Section 2: App & Server Settings */}
        <Text style={[styles.sectionHeader, { marginTop: 20 }]}>System & Server Configuration</Text>

        <TouchableOpacity
          style={[styles.menuItem, shadows.sm]}
          onPress={() => setServerModalVisible(true)}
          activeOpacity={0.8}
        >
          <View style={[styles.menuIconContainer, { backgroundColor: colors.primaryLight }]}>
            <MaterialCommunityIcons name="server-network" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.menuTitle}>Server Endpoint Manager</Text>
              <View
                style={[
                  styles.statusMiniDot,
                  { backgroundColor: serverStatus.online ? colors.success : colors.danger },
                ]}
              />
            </View>
            <Text style={styles.menuSubtitle} numberOfLines={1}>
              Active: {serverUrl}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={confirmLogout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={20} color={colors.danger} style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>Sign Out of Admin Portal</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>
          SkillCodex Android Admin • v1.0.0 Production • Connected to Node.js Backend
        </Text>
      </ScrollView>

      {/* Server Settings Modal */}
      <ServerSettingsModal
        visible={serverModalVisible}
        onClose={() => setServerModalVisible(false)}
      />

      {/* Dynamic Management Modal (Batches, Tech, Orgs) */}
      <Modal
        visible={!!activeModal}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setActiveModal(null)}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>

          <View style={[styles.modalCard, shadows.lg]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {activeModal === 'BATCHES' && 'Manage Batches & Cohorts'}
                {activeModal === 'TECH' && 'Manage Technologies'}
                {activeModal === 'ORGS' && 'Manage Organizations'}
              </Text>
              <TouchableOpacity onPress={() => setActiveModal(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Quick Add Bar */}
            <View style={styles.quickAddBox}>
              <Text style={styles.quickAddTitle}>
                Add New {activeModal === 'BATCHES' ? 'Batch' : activeModal === 'TECH' ? 'Technology' : 'Organization'}
              </Text>
              <View style={styles.addInputRow}>
                <TextInput
                  style={[styles.addInput, { flex: 1 }]}
                  placeholder="Name / Title"
                  placeholderTextColor={colors.textMuted}
                  value={newItemName}
                  onChangeText={setNewItemName}
                />
                <TextInput
                  style={[styles.addInput, { flex: 1, marginLeft: 8 }]}
                  placeholder="Code / Description"
                  placeholderTextColor={colors.textMuted}
                  value={newItemExtra}
                  onChangeText={setNewItemExtra}
                />
              </View>
              <TouchableOpacity
                style={[styles.createItemBtn, submitting && { opacity: 0.6 }]}
                onPress={handleCreateItem}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={colors.textInverse} size="small" />
                ) : (
                  <Text style={styles.createItemBtnText}>+ Add Record</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Existing List */}
            {loadingModal ? (
              <View style={{ padding: 30, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : (
              <FlatList
                data={dataList}
                keyExtractor={(item) => item._id || Math.random().toString()}
                renderItem={({ item }) => (
                  <View style={styles.dataListItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dataItemName}>{item.name}</Text>
                      {item.code || item.description ? (
                        <Text style={styles.dataItemMeta}>{item.code || item.description}</Text>
                      ) : null}
                    </View>
                    <StatusBadge status={item.isActive !== false ? 'ACTIVE' : 'INACTIVE'} size="small" />
                  </View>
                )}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 36 }}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No records found.</Text>
                }
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Admin Profile Modal */}
      <AdminProfileModal
        visible={profileModalVisible}
        onClose={() => setProfileModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 20,
  },
  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textInverse,
  },
  userName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  userEmail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  orgPill: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    maxWidth: 160,
  },
  orgPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 10,
    gap: 12,
  },
  menuIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  menuSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusMiniDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: 14,
    height: 48,
    marginTop: 24,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.danger,
  },
  versionText: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
    margin: 0,
    padding: 0,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    margin: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  quickAddBox: {
    backgroundColor: colors.background,
    margin: 16,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickAddTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  addInputRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  addInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: colors.textPrimary,
  },
  createItemBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createItemBtnText: {
    color: colors.textInverse,
    fontWeight: '700',
    fontSize: 12,
  },
  dataListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  dataItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  dataItemMeta: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 12,
    marginVertical: 20,
  },
});
