import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, shadows } from '../theme/colors';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Header from '../components/common/Header';
import SearchBar from '../components/common/SearchBar';
import StatusBadge from '../components/common/StatusBadge';
import EmptyState from '../components/common/EmptyState';

const STATUS_FILTERS = ['ALL', 'ACTIVE', 'INACTIVE'];

export default function FacultyScreen() {
  const { isSuperAdmin } = useAuth();
  const [faculty, setFaculty] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Manual Create Faculty Modal State
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [facultyId, setFacultyId] = useState('');
  const [password, setPassword] = useState('');
  const [organization, setOrganization] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [orgTechnologies, setOrgTechnologies] = useState([]);
  const [selectedTechs, setSelectedTechs] = useState([]);
  const [loadingTechs, setLoadingTechs] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Edit Faculty Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState(null);
  const [editName, setEditName] = useState('');
  const [editFacultyId, setEditFacultyId] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editShowPassword, setEditShowPassword] = useState(false);
  const [editOrganization, setEditOrganization] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editOrgTechnologies, setEditOrgTechnologies] = useState([]);
  const [editSelectedTechs, setEditSelectedTechs] = useState([]);
  const [editLoadingTechs, setEditLoadingTechs] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const fetchFaculty = useCallback(async () => {
    try {
      const res = await api.get('/admin/faculty');
      const list = res?.data?.faculty || res?.data || [];
      setFaculty(Array.isArray(list) ? list : []);
    } catch (err) {
      console.warn('Failed to fetch faculty', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchOrganizations = useCallback(async () => {
    try {
      const res = await api.get('/admin/organizations');
      const list = res?.data?.organizations || res?.data || [];
      const orgList = Array.isArray(list) ? list : [];
      setOrganizations(orgList);
      if (orgList.length > 0 && !organization) {
        const firstOrg = orgList[0].name;
        setOrganization(firstOrg);
        loadTechnologiesForOrg(firstOrg);
      }
    } catch (e) {
      console.warn('Failed to fetch organizations', e.message);
    }
  }, [organization]);

  const loadTechnologiesForOrg = async (orgName) => {
    if (!orgName) {
      setOrgTechnologies([]);
      setSelectedTechs([]);
      return;
    }
    setLoadingTechs(true);
    try {
      const res = await api.get(`/admin/technologies?organization=${encodeURIComponent(orgName)}`);
      const list = res?.data?.technologies || res?.data || [];
      setOrgTechnologies(Array.isArray(list) ? list : []);
    } catch (e) {
      setOrgTechnologies([]);
    } finally {
      setLoadingTechs(false);
    }
  };

  const loadTechnologiesForEditOrg = async (orgName) => {
    if (!orgName) {
      setEditOrgTechnologies([]);
      return;
    }
    setEditLoadingTechs(true);
    try {
      const res = await api.get(`/admin/technologies?organization=${encodeURIComponent(orgName)}`);
      const list = res?.data?.technologies || res?.data || [];
      setEditOrgTechnologies(Array.isArray(list) ? list : []);
    } catch (e) {
      setEditOrgTechnologies([]);
    } finally {
      setEditLoadingTechs(false);
    }
  };

  useEffect(() => {
    fetchFaculty();
    fetchOrganizations();
  }, [fetchFaculty, fetchOrganizations]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFaculty();
  };

  const handleSelectOrganization = (orgName) => {
    setOrganization(orgName);
    setSelectedTechs([]);
    loadTechnologiesForOrg(orgName);
  };

  const handleToggleTech = (techName) => {
    setSelectedTechs((prev) =>
      prev.includes(techName) ? prev.filter((t) => t !== techName) : [...prev, techName]
    );
  };

  // Open Edit Faculty Modal
  const handleOpenEdit = (item) => {
    setEditingFaculty(item);
    setEditName(item.name || '');
    setEditFacultyId(item.facultyId || item.employeeId || '');
    setEditOrganization(item.organization || '');
    setEditEmail(item.email || '');
    setEditPhone(item.phone || '');
    setEditPassword('');
    setShowPassword(false);

    const existingTechs = Array.isArray(item.technologies) && item.technologies.length > 0
      ? item.technologies
      : (item.department ? item.department.split(',').map((s) => s.trim()).filter(Boolean) : []);

    setEditSelectedTechs(existingTechs);
    loadTechnologiesForEditOrg(item.organization || '');
    setEditModalVisible(true);
  };

  const handleSelectEditOrganization = (orgName) => {
    setEditOrganization(orgName);
    setEditSelectedTechs([]);
    loadTechnologiesForEditOrg(orgName);
  };

  const handleToggleEditTech = (techName) => {
    setEditSelectedTechs((prev) =>
      prev.includes(techName) ? prev.filter((t) => t !== techName) : [...prev, techName]
    );
  };

  const handleUpdateFaculty = async () => {
    if (!editingFaculty) return;
    if (!editName.trim()) {
      Alert.alert('Validation Error', 'Full Name is required.');
      return;
    }
    if (!editOrganization.trim()) {
      Alert.alert('Validation Error', 'Assigned Organization is mandatory for faculty.');
      return;
    }

    const payload = {
      name: editName.trim(),
      facultyId: editFacultyId.trim() || undefined,
      organization: editOrganization.trim(),
      technologies: editSelectedTechs,
      department: editSelectedTechs.join(', ') || 'General Faculty',
      email: editEmail.trim().toLowerCase(),
      phone: editPhone.trim(),
      ...(editPassword && editPassword.length >= 6 ? { password: editPassword } : {}),
    };

    setEditSubmitting(true);
    try {
      await api.put(`/admin/faculty/${editingFaculty._id}`, payload);
      Alert.alert('Faculty Updated', `Instructor "${editName}" updated successfully.`);
      setEditModalVisible(false);
      setEditingFaculty(null);
      fetchFaculty();
    } catch (err) {
      Alert.alert('Update Failed', err.message || 'Failed to update faculty member.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleToggleStatus = async (item) => {
    const newStatus = item.isActive === false ? true : false;
    try {
      await api.put(`/admin/faculty/${item._id}`, { isActive: newStatus });
      fetchFaculty();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update faculty status');
    }
  };

  const handleDelete = async (item) => {
    Alert.alert(
      'Delete Faculty Account',
      `Are you sure you want to delete instructor "${item.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/admin/faculty/${item._id}`);
              Alert.alert('Deleted', 'Faculty account deleted successfully.');
              fetchFaculty();
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to delete faculty');
            }
          },
        },
      ]
    );
  };

  const handleCreateFaculty = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Full Name is required.');
      return;
    }
    if (!facultyId.trim()) {
      Alert.alert('Validation Error', 'Faculty ID is required.');
      return;
    }
    if (!password || password.length < 6) {
      Alert.alert('Validation Error', 'Initial Password must be at least 6 characters.');
      return;
    }
    if (!organization.trim()) {
      Alert.alert('Validation Error', 'Assigned Organization is mandatory for faculty.');
      return;
    }

    const payload = {
      name: name.trim(),
      facultyId: facultyId.trim(),
      password,
      organization: organization.trim(),
      technologies: selectedTechs,
      department: selectedTechs.join(', ') || 'General Faculty',
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      role: 'FACULTY',
    };

    setSubmitting(true);
    try {
      await api.post('/admin/faculty', payload);
      Alert.alert('Faculty Created', `Faculty account "${name}" created successfully!`);
      setCreateModalVisible(false);
      setName('');
      setFacultyId('');
      setEmail('');
      setPassword('');
      setPhone('');
      setSelectedTechs([]);
      fetchFaculty();
    } catch (err) {
      Alert.alert('Creation Failed', err.message || 'Failed to create faculty member');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredFaculty = faculty.filter((item) => {
    const isActive = item.isActive !== false;
    if (statusFilter === 'ACTIVE' && !isActive) return false;
    if (statusFilter === 'INACTIVE' && isActive) return false;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const matchName = (item.name || '').toLowerCase().includes(q);
      const matchEmail = (item.email || '').toLowerCase().includes(q);
      const matchId = (item.facultyId || item.employeeId || '').toLowerCase().includes(q);
      const matchDept = (item.department || '').toLowerCase().includes(q);
      const matchOrg = (item.organization || '').toLowerCase().includes(q);
      return matchName || matchEmail || matchId || matchDept || matchOrg;
    }

    return true;
  });

  const renderFacultyCard = ({ item }) => {
    const isActive = item.isActive !== false;
    const initial = (item.name || 'F').charAt(0).toUpperCase();
    const fid = item.facultyId || item.employeeId || 'ID N/A';
    const techs = Array.isArray(item.technologies) && item.technologies.length > 0
      ? item.technologies
      : (item.department ? item.department.split(',').map((s) => s.trim()).filter(Boolean) : []);

    return (
      <View style={[styles.card, shadows.sm]}>
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={styles.nameRow}>
              <Text style={styles.facultyName}>{item.name}</Text>
              <StatusBadge status={isActive ? 'ACTIVE' : 'INACTIVE'} size="small" />
            </View>
            <Text style={styles.facultyIdText}>{fid}</Text>
            {item.email ? <Text style={styles.emailText}>{item.email}</Text> : null}
          </View>
        </View>

        {/* Department & Org Meta */}
        <View style={styles.metaRow}>
          {item.organization ? (
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="domain" size={14} color={colors.primary} />
              <Text style={[styles.metaText, { color: colors.primary, fontWeight: '700' }]}>
                {item.organization}
              </Text>
            </View>
          ) : null}

          {item.phone ? (
            <View style={styles.metaItem}>
              <Ionicons name="call-outline" size={13} color={colors.textSecondary} />
              <Text style={styles.metaText}>{item.phone}</Text>
            </View>
          ) : null}
        </View>

        {/* Assigned Technologies */}
        {techs.length > 0 ? (
          <View style={styles.techChipRow}>
            {techs.map((t, i) => (
              <View key={i} style={styles.techChip}>
                <Text style={styles.techChipText}>{t}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Card Actions: EDIT, ACTIVATE/DEACTIVATE, DELETE */}
        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.editBtn]}
            onPress={() => handleOpenEdit(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={14} color={colors.primary} />
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, isActive ? styles.suspendBtn : styles.activateBtn]}
            onPress={() => handleToggleStatus(item)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isActive ? 'pause-circle-outline' : 'play-circle-outline'}
              size={14}
              color={isActive ? colors.warning : colors.success}
            />
            <Text style={[styles.actionBtnText, { color: isActive ? colors.warning : colors.success }]}>
              {isActive ? 'Deactivate' : 'Activate'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={() => handleDelete(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={14} color={colors.danger} />
            <Text style={[styles.actionBtnText, { color: colors.danger }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Faculty Management"
        subtitle="Roster of departmental instructors, academic credentials, and permissions"
      />

      {/* Search Input */}
      <View style={styles.searchSection}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search by instructor name, ID, or organization..."
          onClear={() => setSearch('')}
        />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabsRow}>
        {STATUS_FILTERS.map((s) => {
          const isActive = statusFilter === s;
          return (
            <TouchableOpacity
              key={s}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setStatusFilter(s)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {s === 'ALL' ? 'All Faculty' : s}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Faculty List */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Fetching faculty directory...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredFaculty}
          keyExtractor={(item) => item._id}
          renderItem={renderFacultyCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="school-outline"
              title="No Faculty Members"
              description="No instructor profiles match your current search criteria."
              actionLabel="Create Faculty"
              onAction={() => setCreateModalVisible(true)}
            />
          }
        />
      )}

      {/* Floating Action Button for Faculty Creation */}
      <TouchableOpacity
        style={[styles.fab, shadows.lg]}
        onPress={() => setCreateModalVisible(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color={colors.textInverse} />
      </TouchableOpacity>

      {/* Edit Faculty Modal (Slide Bottom Sheet with zero bottom gap) */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setEditModalVisible(false)}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>

          <View style={[styles.modalCard, shadows.lg]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialCommunityIcons name="account-edit-outline" size={22} color={colors.primary} />
                <View>
                  <Text style={styles.modalTitle}>Edit Faculty Member</Text>
                  <Text style={styles.modalSub}>{editingFaculty?.name || 'Instructor Details'}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setEditModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{ paddingBottom: 40 }}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
            >
              {/* Full Name */}
              <Text style={styles.modalLabel}>
                Full Name <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Dr. Rajesh Sharma"
                placeholderTextColor={colors.textMuted}
                value={editName}
                onChangeText={setEditName}
              />

              {/* Faculty ID */}
              <Text style={styles.modalLabel}>Faculty ID</Text>
              <TextInput
                style={[styles.modalInput, { fontFamily: 'monospace' }]}
                placeholder="e.g. FAC2026001"
                placeholderTextColor={colors.textMuted}
                value={editFacultyId}
                onChangeText={setEditFacultyId}
                autoCapitalize="characters"
              />

              {/* Password update (optional) */}
              <Text style={styles.modalLabel}>Change Password (Optional)</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.modalInput, { flex: 1, borderWidth: 0, paddingHorizontal: 0 }]}
                  placeholder="Leave blank to keep unchanged"
                  placeholderTextColor={colors.textMuted}
                  value={editPassword}
                  onChangeText={setEditPassword}
                  secureTextEntry={!editShowPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setEditShowPassword(!editShowPassword)}
                  style={{ padding: 4 }}
                >
                  <Ionicons
                    name={editShowPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              {/* Assigned Organization */}
              <Text style={styles.modalLabel}>
                Assigned Organization <Text style={styles.requiredStar}>*</Text>
              </Text>
              {organizations.length === 0 ? (
                <View style={styles.helperBox}>
                  <Text style={styles.helperBoxText}>Loading available organizations...</Text>
                </View>
              ) : (
                <View style={styles.pickerChips}>
                  {organizations.map((org) => {
                    const isSelected = editOrganization === org.name;
                    return (
                      <TouchableOpacity
                        key={org._id}
                        style={[styles.pickerChip, isSelected && styles.pickerChipActive]}
                        onPress={() => handleSelectEditOrganization(org.name)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.pickerChipText, isSelected && styles.pickerChipTextActive]}>
                          {isSelected ? '✓ ' : ''}{org.name} {org.code ? `(${org.code})` : ''}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Technologies Taught */}
              <Text style={[styles.modalLabel, { marginTop: 14 }]}>Technologies Assigned</Text>
              {!editOrganization ? (
                <View style={styles.helperBox}>
                  <Text style={styles.helperBoxText}>Please select an organization first.</Text>
                </View>
              ) : editLoadingTechs ? (
                <View style={styles.helperBox}>
                  <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.helperBoxText}>Loading organization technologies...</Text>
                </View>
              ) : editOrgTechnologies.length === 0 ? (
                <View style={styles.helperBox}>
                  <Text style={styles.helperBoxText}>No specific technologies defined for {editOrganization}.</Text>
                </View>
              ) : (
                <>
                  <View style={styles.techSelectionContainer}>
                    {editOrgTechnologies.map((tech) => {
                      const isSelected = editSelectedTechs.includes(tech.name);
                      return (
                        <TouchableOpacity
                          key={tech._id || tech.name}
                          style={[styles.techSelectBtn, isSelected && styles.techSelectBtnActive]}
                          onPress={() => handleToggleEditTech(tech.name)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.techSelectBtnText, isSelected && styles.techSelectBtnTextActive]}>
                            {isSelected ? '✓ ' : '+ '}{tech.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {editSelectedTechs.length > 0 && (
                    <View style={styles.selectedTechChipsRow}>
                      <Text style={styles.selectedCountText}>Assigned ({editSelectedTechs.length}):</Text>
                      {editSelectedTechs.map((t) => (
                        <View key={t} style={styles.selectedPill}>
                          <Text style={styles.selectedPillText}>{t}</Text>
                          <TouchableOpacity onPress={() => handleToggleEditTech(t)}>
                            <Ionicons name="close-circle" size={14} color={colors.primary} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}

              {/* Email (Optional) */}
              <Text style={[styles.modalLabel, { marginTop: 14 }]}>Email Address (Optional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. rajesh.sharma@university.edu"
                placeholderTextColor={colors.textMuted}
                value={editEmail}
                onChangeText={setEditEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              {/* Phone (Optional) */}
              <Text style={styles.modalLabel}>Phone Number (Optional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="+91 9876543210"
                placeholderTextColor={colors.textMuted}
                value={editPhone}
                onChangeText={setEditPhone}
                keyboardType="phone-pad"
              />

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, editSubmitting && styles.submitButtonDisabled]}
                onPress={handleUpdateFaculty}
                disabled={editSubmitting}
                activeOpacity={0.8}
              >
                {editSubmitting ? (
                  <ActivityIndicator color={colors.textInverse} size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Manual Create Faculty Modal (Slide Bottom Sheet with zero bottom gap) */}
      <Modal
        visible={createModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setCreateModalVisible(false)}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>

          <View style={[styles.modalCard, shadows.lg]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialCommunityIcons name="account-plus-outline" size={22} color={colors.primary} />
                <Text style={styles.modalTitle}>Add Faculty Member</Text>
              </View>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{ paddingBottom: 40 }}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
            >
              {/* Full Name */}
              <Text style={styles.modalLabel}>
                Full Name <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Dr. Rajesh Sharma"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
              />

              {/* Faculty ID */}
              <Text style={styles.modalLabel}>
                Faculty ID <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                style={[styles.modalInput, { fontFamily: 'monospace' }]}
                placeholder="e.g. FAC2026001"
                placeholderTextColor={colors.textMuted}
                value={facultyId}
                onChangeText={setFacultyId}
                autoCapitalize="characters"
              />

              {/* Initial Password with Eye Toggle */}
              <Text style={styles.modalLabel}>
                Initial Password <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.modalInput, { flex: 1, borderWidth: 0, paddingHorizontal: 0 }]}
                  placeholder="Minimum 6 characters"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={{ padding: 4 }}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              {/* Assigned Organization (Mandatory) */}
              <Text style={styles.modalLabel}>
                Assigned Organization <Text style={styles.requiredStar}>*</Text>
              </Text>
              {organizations.length === 0 ? (
                <View style={styles.helperBox}>
                  <Text style={styles.helperBoxText}>Loading available organizations...</Text>
                </View>
              ) : (
                <View style={styles.pickerChips}>
                  {organizations.map((org) => {
                    const isSelected = organization === org.name;
                    return (
                      <TouchableOpacity
                        key={org._id}
                        style={[styles.pickerChip, isSelected && styles.pickerChipActive]}
                        onPress={() => handleSelectOrganization(org.name)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.pickerChipText, isSelected && styles.pickerChipTextActive]}>
                          {isSelected ? '✓ ' : ''}{org.name} {org.code ? `(${org.code})` : ''}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Technologies Taught (Populated dynamically from selected organization) */}
              <Text style={[styles.modalLabel, { marginTop: 14 }]}>
                Technologies Taught (Optional)
              </Text>
              {!organization ? (
                <View style={styles.helperBox}>
                  <Text style={styles.helperBoxText}>
                    Please select an Assigned Organization first to view technologies.
                  </Text>
                </View>
              ) : loadingTechs ? (
                <View style={styles.helperBox}>
                  <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.helperBoxText}>Loading organization technologies...</Text>
                </View>
              ) : orgTechnologies.length === 0 ? (
                <View style={styles.helperBox}>
                  <Text style={styles.helperBoxText}>
                    No technologies found for {organization} yet. (Faculty can add technologies post account setup).
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={styles.subtext}>
                    Select one or more technologies created for {organization}:
                  </Text>
                  <View style={styles.techSelectionContainer}>
                    {orgTechnologies.map((tech) => {
                      const isSelected = selectedTechs.includes(tech.name);
                      return (
                        <TouchableOpacity
                          key={tech._id || tech.name}
                          style={[styles.techSelectBtn, isSelected && styles.techSelectBtnActive]}
                          onPress={() => handleToggleTech(tech.name)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.techSelectBtnText, isSelected && styles.techSelectBtnTextActive]}>
                            {isSelected ? '✓ ' : '+ '}{tech.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {selectedTechs.length > 0 && (
                    <View style={styles.selectedTechChipsRow}>
                      <Text style={styles.selectedCountText}>Selected ({selectedTechs.length}):</Text>
                      {selectedTechs.map((t) => (
                        <View key={t} style={styles.selectedPill}>
                          <Text style={styles.selectedPillText}>{t}</Text>
                          <TouchableOpacity onPress={() => handleToggleTech(t)}>
                            <Ionicons name="close-circle" size={14} color={colors.primary} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}

              {/* Email (Optional) */}
              <Text style={[styles.modalLabel, { marginTop: 14 }]}>Email Address (Optional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. rajesh.sharma@university.edu"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              {/* Phone (Optional) */}
              <Text style={styles.modalLabel}>Phone Number (Optional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="+91 9876543210"
                placeholderTextColor={colors.textMuted}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleCreateFaculty}
                disabled={submitting}
                activeOpacity={0.8}
              >
                {submitting ? (
                  <ActivityIndicator color={colors.textInverse} size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Create Faculty Member</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  filterTabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginVertical: 4,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.textInverse,
  },
  listContent: {
    padding: 16,
    paddingBottom: 90,
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 12,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.textInverse,
    fontSize: 17,
    fontWeight: '800',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  facultyName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  facultyIdText: {
    fontSize: 11,
    color: colors.primary,
    fontFamily: 'monospace',
    fontWeight: '700',
    marginTop: 2,
  },
  emailText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  techChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  techChip: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  techChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  editBtn: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  suspendBtn: {
    backgroundColor: colors.warningLight,
    borderColor: colors.warningBorder,
  },
  activateBtn: {
    backgroundColor: colors.successLight,
    borderColor: colors.successBorder,
  },
  deleteBtn: {
    backgroundColor: colors.dangerLight,
    borderColor: colors.dangerBorder,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
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
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    margin: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 12,
    flexShrink: 1,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 12,
    marginBottom: 6,
  },
  requiredStar: {
    color: colors.danger,
    fontWeight: '800',
  },
  subtext: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.textPrimary,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  helperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
  },
  helperBoxText: {
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
  },
  pickerChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  pickerChip: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  pickerChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  pickerChipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  pickerChipTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  techSelectionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    padding: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    maxHeight: 120,
  },
  techSelectBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  techSelectBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  techSelectBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  techSelectBtnTextActive: {
    color: colors.textInverse,
    fontWeight: '800',
  },
  selectedTechChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  selectedCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginRight: 2,
  },
  selectedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  selectedPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: '800',
  },
});
