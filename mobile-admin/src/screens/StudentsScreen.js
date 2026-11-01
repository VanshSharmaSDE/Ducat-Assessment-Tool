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
import Header from '../components/common/Header';
import SearchBar from '../components/common/SearchBar';
import StatusBadge from '../components/common/StatusBadge';
import EmptyState from '../components/common/EmptyState';

const STATUS_FILTERS = ['ALL', 'ACTIVE', 'INACTIVE'];

const getOrgString = (o) => (typeof o === 'string' ? o : (o?.name || o?.title || ''));

export default function StudentsScreen() {
  // Navigation State: null = Organization Directory Cards, string = Selected Organization Candidate List
  const [selectedOrg, setSelectedOrg] = useState(null);

  const [users, setUsers] = useState([]);
  const [organizationsSummary, setOrganizationsSummary] = useState([]);
  const [availableOrganizations, setAvailableOrganizations] = useState([]);
  const [availableBatches, setAvailableBatches] = useState([]);
  const [availableTechnologies, setAvailableTechnologies] = useState([]);

  // Pagination & Total Enrollment Stats
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  // Student Profile Dossier Modal
  const [profileStudent, setProfileStudent] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [orgSearch, setOrgSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [batchFilter, setBatchFilter] = useState('ALL');
  const [techFilter, setTechFilter] = useState('ALL');

  // Manual Add Student Modal
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createRoll, setCreateRoll] = useState('');
  const [createPassword, setCreatePassword] = useState('Student@123');
  const [createShowPassword, setCreateShowPassword] = useState(false);
  const [createOrg, setCreateOrg] = useState('');
  const [createTech, setCreateTech] = useState('');
  const [createBatch, setCreateBatch] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [createGender, setCreateGender] = useState('Male');
  const [createAge, setCreateAge] = useState('');
  const [formTechs, setFormTechs] = useState([]);
  const [formBatches, setFormBatches] = useState([]);
  const [loadingFormTechs, setLoadingFormTechs] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Edit Student Modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editName, setEditName] = useState('');
  const [editRoll, setEditRoll] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editShowPassword, setEditShowPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showProfilePassword, setShowProfilePassword] = useState(false);
  const [editOrg, setEditOrg] = useState('');
  const [editTech, setEditTech] = useState('');
  const [editBatch, setEditBatch] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editGender, setEditGender] = useState('Male');
  const [editAge, setEditAge] = useState('');
  const [editFormTechs, setEditFormTechs] = useState([]);
  const [editFormBatches, setEditFormBatches] = useState([]);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const fetchUsersAndOrgs = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1 && !append) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      let query = `?page=${pageNum}&limit=50`;
      if (selectedOrg && selectedOrg !== '__ALL__') {
        query += `&organization=${encodeURIComponent(selectedOrg)}`;
      }
      if (statusFilter !== 'ALL') {
        query += `&status=${statusFilter.toLowerCase()}`;
      }
      if (batchFilter !== 'ALL') {
        query += `&batch=${encodeURIComponent(batchFilter)}`;
      }
      if (techFilter !== 'ALL') {
        query += `&technology=${encodeURIComponent(techFilter)}`;
      }
      if (search.trim()) {
        query += `&search=${encodeURIComponent(search.trim())}`;
      }

      const res = await api.get(`/admin/users${query}`);
      const data = res?.data?.data || res?.data || res || {};
      const uList = Array.isArray(data.users) ? data.users : [];

      if (append) {
        setUsers((prev) => [...prev, ...uList]);
      } else {
        setUsers(uList);
      }

      if (data.pagination) {
        setPage(data.pagination.page || pageNum);
        setTotalPages(data.pagination.pages || 1);
        setTotalStudents(data.pagination.total || uList.length);
      } else {
        setPage(pageNum);
        setTotalPages(1);
        setTotalStudents(uList.length);
      }

      if (Array.isArray(data.organizationsSummary)) {
        setOrganizationsSummary(data.organizationsSummary);
      }
      if (Array.isArray(data.availableOrganizations)) {
        setAvailableOrganizations(data.availableOrganizations);
      }
      if (Array.isArray(data.availableBatches)) {
        setAvailableBatches(data.availableBatches);
      }
      if (Array.isArray(data.availableTechnologies)) {
        setAvailableTechnologies(data.availableTechnologies);
      }
    } catch (err) {
      console.warn('Failed to fetch students', err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [selectedOrg, statusFilter, batchFilter, techFilter, search]);

  const fetchSupportingData = useCallback(async () => {
    try {
      const [orgRes, batchRes, techRes] = await Promise.allSettled([
        api.get('/admin/organizations'),
        api.get('/admin/batches'),
        api.get('/admin/technologies'),
      ]);

      if (orgRes.status === 'fulfilled') {
        const orgs = orgRes.value?.data?.organizations || orgRes.value?.data?.data?.organizations || [];
        if (Array.isArray(orgs) && orgs.length > 0) setAvailableOrganizations(orgs);
      }
      if (batchRes.status === 'fulfilled') {
        const b = batchRes.value?.data?.batches || batchRes.value?.data?.data?.batches || [];
        if (Array.isArray(b) && b.length > 0) setAvailableBatches(b.map((x) => x.name || x));
      }
      if (techRes.status === 'fulfilled') {
        const t = techRes.value?.data?.technologies || techRes.value?.data?.data?.technologies || [];
        if (Array.isArray(t) && t.length > 0) setAvailableTechnologies(t.map((x) => x.name || x));
      }
    } catch (e) {
      console.warn('Error fetching supporting data', e.message);
    }
  }, []);

  useEffect(() => {
    fetchUsersAndOrgs();
    fetchSupportingData();
  }, [fetchUsersAndOrgs, fetchSupportingData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsersAndOrgs();
  };

  const loadTechsAndBatchesForOrg = async (orgName, isEdit = false) => {
    if (!orgName) {
      if (isEdit) {
        setEditFormTechs([]);
        setEditFormBatches([]);
      } else {
        setFormTechs([]);
        setFormBatches([]);
      }
      return;
    }

    if (!isEdit) setLoadingFormTechs(true);
    try {
      const [techRes, batchRes] = await Promise.allSettled([
        api.get(`/admin/technologies?organization=${encodeURIComponent(orgName)}`),
        api.get(`/admin/batches?organization=${encodeURIComponent(orgName)}`),
      ]);

      const tList = techRes.status === 'fulfilled' ? (techRes.value?.data?.technologies || techRes.value?.data?.data?.technologies || []) : [];
      const bList = batchRes.status === 'fulfilled' ? (batchRes.value?.data?.batches || batchRes.value?.data?.data?.batches || []) : [];

      if (isEdit) {
        setEditFormTechs(Array.isArray(tList) ? tList : []);
        setEditFormBatches(Array.isArray(bList) ? bList : []);
      } else {
        setFormTechs(Array.isArray(tList) ? tList : []);
        setFormBatches(Array.isArray(bList) ? bList : []);
        if (tList.length > 0 && !createTech) setCreateTech(tList[0].name || tList[0]);
        if (bList.length > 0 && !createBatch) setCreateBatch(bList[0].name || bList[0]);
      }
    } catch (e) {
      console.warn('Failed loading org techs/batches', e.message);
    } finally {
      if (!isEdit) setLoadingFormTechs(false);
    }
  };

  const handleOpenCreateModal = () => {
    const defaultOrg = selectedOrg && selectedOrg !== '__ALL__' 
      ? selectedOrg 
      : (getOrgString(availableOrganizations[0]) || '');
    setCreateName('');
    setCreateRoll('');
    setCreatePassword('Student@123');
    setCreateShowPassword(false);
    setCreateOrg(defaultOrg);
    setCreateTech('');
    setCreateBatch('');
    setCreateEmail('');
    setCreatePhone('');
    setCreateGender('Male');
    setCreateAge('');

    if (defaultOrg) {
      loadTechsAndBatchesForOrg(defaultOrg, false);
    }
    setCreateModalVisible(true);
  };

  const handleSelectCreateOrg = (orgName) => {
    setCreateOrg(orgName);
    setCreateTech('');
    setCreateBatch('');
    loadTechsAndBatchesForOrg(orgName, false);
  };

  const handleCreateStudent = async () => {
    if (!createName.trim()) {
      Alert.alert('Validation Error', 'Student Full Name is required.');
      return;
    }
    if (!createRoll.trim()) {
      Alert.alert('Validation Error', 'Roll Number / Student ID is required.');
      return;
    }
    if (!createOrg.trim()) {
      Alert.alert('Validation Error', 'Assigned Organization is mandatory.');
      return;
    }
    if (!createTech.trim()) {
      Alert.alert('Validation Error', 'Technology is mandatory.');
      return;
    }
    if (!createBatch.trim()) {
      Alert.alert('Validation Error', 'Batch / Cohort is mandatory.');
      return;
    }
    if (!createPassword || createPassword.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters.');
      return;
    }

    const payload = {
      name: createName.trim(),
      rollNumber: createRoll.trim(),
      studentId: createRoll.trim(),
      organization: createOrg.trim(),
      technology: createTech.trim(),
      batch: createBatch.trim(),
      password: createPassword,
      email: createEmail.trim().toLowerCase(),
      phone: createPhone.trim(),
      gender: createGender,
      ...(createAge ? { age: Number(createAge) } : {}),
    };

    setSubmitting(true);
    try {
      await api.post('/admin/students/create', payload);
      Alert.alert('Candidate Added', `Student "${createName}" created successfully!`);
      setCreateModalVisible(false);
      fetchUsersAndOrgs(1, false);
    } catch (err) {
      Alert.alert('Creation Error', err.message || 'Failed to create student account.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoadMore = () => {
    if (!loading && !loadingMore && page < totalPages) {
      fetchUsersAndOrgs(page + 1, true);
    }
  };

  const handleOpenEdit = (student) => {
    setEditingUser(student);
    setEditName(student.name || '');
    setEditRoll(student.rollNumber || student.studentId || '');
    const currentOrg = (student.organization || '').trim();
    const currentTech = (student.technology || '').trim();
    const currentBatch = (student.batch || '').trim();
    setEditOrg(currentOrg);
    setEditTech(currentTech);
    setEditBatch(currentBatch);
    setEditEmail(student.email || '');
    setEditPhone(student.phone || '');
    setEditGender(student.gender || 'Male');
    setEditAge(student.age !== undefined && student.age !== null ? String(student.age) : '');
    setEditPassword('');
    setEditShowPassword(false);
    setShowCurrentPassword(false);

    if (currentOrg) {
      loadTechsAndBatchesForOrg(currentOrg, true);
    } else {
      setEditFormTechs([]);
      setEditFormBatches([]);
    }
    setEditModalVisible(true);
  };

  const handleUpdateStudent = async () => {
    if (!editingUser) return;
    if (!editName.trim()) {
      Alert.alert('Validation Error', 'Student Full Name is required.');
      return;
    }
    if (!editOrg.trim()) {
      Alert.alert('Validation Error', 'Organization is mandatory.');
      return;
    }
    if (!editTech.trim()) {
      Alert.alert('Validation Error', 'Technology is mandatory.');
      return;
    }
    if (!editBatch.trim()) {
      Alert.alert('Validation Error', 'Batch is mandatory.');
      return;
    }

    const payload = {
      name: editName.trim(),
      rollNumber: editRoll.trim(),
      studentId: editRoll.trim(),
      organization: editOrg.trim(),
      technology: editTech.trim(),
      batch: editBatch.trim(),
      email: editEmail.trim().toLowerCase(),
      phone: editPhone.trim(),
      gender: editGender,
      ...(editAge ? { age: Number(editAge) } : { age: null }),
      ...(editPassword && editPassword.length >= 6 ? { password: editPassword } : {}),
    };

    setEditSubmitting(true);
    try {
      await api.put(`/admin/students/${editingUser._id}`, payload);
      Alert.alert('Candidate Updated', `Profile of "${editName}" updated successfully.`);
      setEditModalVisible(false);
      fetchUsersAndOrgs(page, false);
      if (profileStudent && profileStudent._id === editingUser._id) {
        setProfileStudent((prev) => ({
          ...prev,
          ...payload,
          plainPassword: editPassword && editPassword.length >= 6 ? editPassword : prev.plainPassword,
        }));
      }
      setEditingUser(null);
    } catch (err) {
      Alert.alert('Update Failed', err.message || 'Failed to update student profile.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleToggleStatus = async (student) => {
    const nextStatus = student.isActive === false ? 'Activate' : 'Deactivate';
    Alert.alert(
      `${nextStatus} Candidate`,
      `Are you sure you want to ${nextStatus.toLowerCase()} ${student.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: nextStatus,
          onPress: async () => {
            try {
              await api.put(`/admin/users/${student._id}/toggle-status`);
              fetchUsersAndOrgs(page, false);
              if (profileStudent && profileStudent._id === student._id) {
                setProfileStudent((prev) => ({ ...prev, isActive: !prev.isActive }));
              }
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to update status.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteStudent = async (student) => {
    Alert.alert(
      'Delete Candidate Account',
      `Permanently delete "${student.name}"? This removes all candidate evaluations, attempts, and submitted solutions.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/admin/users/${student._id}`);
              Alert.alert('Deleted', 'Candidate account removed.');
              if (profileStudent && profileStudent._id === student._id) {
                setProfileStudent(null);
              }
              fetchUsersAndOrgs(page, false);
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to delete student.');
            }
          },
        },
      ]
    );
  };

  // Filter organizations for directory view
  const filteredOrgs = organizationsSummary.filter((org) => {
    if (!orgSearch.trim()) return true;
    const q = orgSearch.trim().toLowerCase();
    const matchName = (org.name || '').toLowerCase().includes(q);
    const matchCode = (org.code || '').toLowerCase().includes(q);
    return matchName || matchCode;
  });

  // Filter candidates for list view
  const filteredStudents = users.filter((u) => {
    if (batchFilter !== 'ALL' && (u.batch || '').toLowerCase() !== batchFilter.toLowerCase()) {
      return false;
    }
    if (techFilter !== 'ALL' && (u.technology || '').toLowerCase() !== techFilter.toLowerCase()) {
      return false;
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const matchName = (u.name || '').toLowerCase().includes(q);
      const matchRoll = (u.rollNumber || u.studentId || '').toLowerCase().includes(q);
      const matchEmail = (u.email || '').toLowerCase().includes(q);
      const matchPhone = (u.phone || '').toLowerCase().includes(q);
      const matchBatch = (u.batch || '').toLowerCase().includes(q);
      const matchTech = (u.technology || '').toLowerCase().includes(q);
      return matchName || matchRoll || matchEmail || matchPhone || matchBatch || matchTech;
    }
    return true;
  });

  // ==============================================================
  // VIEW 1: Organization Directory Cards (Default)
  // ==============================================================
  if (selectedOrg === null) {
    return (
      <View style={styles.container}>
        <Header
          title="Student Organizations"
          subtitle="Select an institution to inspect candidate cohorts, batches, and records"
        />

        {/* Search & Flat List Button */}
        <View style={styles.orgTopBar}>
          <View style={{ flex: 1 }}>
            <SearchBar
              value={orgSearch}
              onChangeText={setOrgSearch}
              placeholder="Search institutions or codes..."
              onClear={() => setOrgSearch('')}
            />
          </View>
          <TouchableOpacity
            style={styles.viewAllBtn}
            onPress={() => setSelectedOrg('__ALL__')}
            activeOpacity={0.8}
          >
            <Ionicons name="people-outline" size={16} color={colors.primary} />
            <Text style={styles.viewAllBtnText}>All Candidates</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Fetching organization cohorts...</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.orgListContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
            }
          >
            <View style={styles.orgCardsGrid}>
              {filteredOrgs.map((org) => {
                const totalStudents = org.studentCount || 0;
                const activeStudents = org.activeCount || 0;
                const batchesList = Array.isArray(org.batches) ? org.batches : [];

                return (
                  <TouchableOpacity
                    key={org.id || org.name}
                    style={[styles.orgCard, shadows.sm]}
                    onPress={() => setSelectedOrg(org.name || org.id)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.orgCardTop}>
                      <View style={styles.orgIconBox}>
                        <MaterialCommunityIcons name="domain" size={22} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.orgCardTitle} numberOfLines={1}>{org.name}</Text>
                        <Text style={styles.orgCardSub}>
                          {activeStudents} active • {totalStudents} enrolled
                        </Text>
                      </View>
                      <View style={styles.studentBadge}>
                        <Text style={styles.studentBadgeText}>{totalStudents} Students</Text>
                      </View>
                    </View>

                    {/* Active Batches in Org */}
                    {batchesList.length > 0 ? (
                      <View style={styles.orgBatchesSection}>
                        <Text style={styles.orgBatchesLabel}>Active Batches ({batchesList.length}):</Text>
                        <View style={styles.orgBatchChipsRow}>
                          {batchesList.slice(0, 3).map((b, bi) => (
                            <View key={bi} style={styles.orgBatchChip}>
                              <Text style={styles.orgBatchChipText}>{b}</Text>
                            </View>
                          ))}
                          {batchesList.length > 3 ? (
                            <View style={[styles.orgBatchChip, { backgroundColor: colors.borderLight }]}>
                              <Text style={[styles.orgBatchChipText, { color: colors.textSecondary }]}>
                                +{batchesList.length - 3} more
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                    ) : null}

                    {/* Drilldown Arrow */}
                    <View style={styles.orgCardFooter}>
                      <Text style={styles.drilldownText}>Inspect Candidates & Cohorts</Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {filteredOrgs.length === 0 && (
              <EmptyState
                icon="domain"
                title="No Organizations Found"
                description="No institutions match your search."
              />
            )}
          </ScrollView>
        )}

        {/* Floating Add Student Button */}
        <TouchableOpacity
          style={[styles.fab, shadows.lg]}
          onPress={handleOpenCreateModal}
          activeOpacity={0.85}
        >
          <Ionicons name="person-add" size={24} color={colors.textInverse} />
        </TouchableOpacity>

        {/* Modals */}
        {renderCreateStudentModal()}
        {renderEditStudentModal()}
        {renderStudentProfileModal()}
      </View>
    );
  }

  // ==============================================================
  // VIEW 2: Drilled-down Candidates Roster
  // ==============================================================
  const isAllOrgs = selectedOrg === '__ALL__';
  const orgTitle = isAllOrgs ? 'All Enrolled Candidates' : selectedOrg;

  return (
    <View style={styles.container}>
      {/* Back Button Navigation Header */}
      <View style={styles.drilldownHeader}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => setSelectedOrg(null)}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.drilldownTitle} numberOfLines={1}>{orgTitle}</Text>
          <Text style={styles.drilldownSub}>
            {totalStudents > 0 ? `${totalStudents} Registered Candidates` : `${users.length} Candidates`}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addCandidateHeaderBtn}
          onPress={handleOpenCreateModal}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={16} color={colors.textInverse} />
          <Text style={styles.addCandidateHeaderText}>Add Student</Text>
        </TouchableOpacity>
      </View>

      {/* Candidate Search Section */}
      <View style={styles.searchSection}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search name, roll ID, email, or batch..."
          onClear={() => setSearch('')}
        />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabsRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
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
                  {s === 'ALL' ? 'All Status' : s}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Batches Filter Chips */}
          {availableBatches.slice(0, 6).map((bName) => {
            const isActive = batchFilter === bName;
            return (
              <TouchableOpacity
                key={bName}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setBatchFilter(isActive ? 'ALL' : bName)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  Cohort: {bName}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Candidates List with Pagination */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Fetching candidate roster...</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item, index) => item._id || String(index)}
          renderItem={renderStudentCard}
          contentContainerStyle={styles.listContent}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderListFooter}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="school-outline"
              title="No Candidates Found"
              description="No students match your filter or search criteria."
              actionLabel="Add Candidate"
              onAction={handleOpenCreateModal}
            />
          }
        />
      )}

      {/* Floating Add Student Button */}
      <TouchableOpacity
        style={[styles.fab, shadows.lg]}
        onPress={handleOpenCreateModal}
        activeOpacity={0.85}
      >
        <Ionicons name="person-add" size={24} color={colors.textInverse} />
      </TouchableOpacity>

      {/* Modals */}
      {renderCreateStudentModal()}
      {renderEditStudentModal()}
      {renderStudentProfileModal()}
    </View>
  );

  // Helper: List Footer for Pagination
  function renderListFooter() {
    if (loadingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.footerLoaderText}>Loading more candidates...</Text>
        </View>
      );
    }
    if (users.length > 0) {
      return (
        <View style={styles.footerCountBox}>
          <Text style={styles.footerCountText}>
            Showing {users.length} of {totalStudents} enrolled candidates
          </Text>
        </View>
      );
    }
    return null;
  }

  // Helper: Student Card Renderer
  function renderStudentCard({ item }) {
    const isActive = item.isActive !== false;
    const initial = (item.name || 'S').charAt(0).toUpperCase();
    const roll = item.rollNumber || item.studentId || 'ID N/A';

    return (
      <TouchableOpacity
        style={[styles.card, shadows.sm]}
        onPress={() => setProfileStudent(item)}
        activeOpacity={0.85}
      >
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={styles.nameRow}>
              <Text style={styles.studentName}>{item.name}</Text>
              <StatusBadge status={isActive ? 'ACTIVE' : 'INACTIVE'} size="small" />
            </View>
            <Text style={styles.rollBadge}>{roll}</Text>
            {item.email ? <Text style={styles.emailText}>{item.email}</Text> : null}
          </View>
        </View>

        {/* Profile Chips: Organization, Technology, Batch, Gender */}
        <View style={styles.profileChipsRow}>
          {item.organization ? (
            <View style={styles.profileChip}>
              <MaterialCommunityIcons name="domain" size={12} color={colors.primary} />
              <Text style={styles.profileChipText}>{item.organization}</Text>
            </View>
          ) : null}

          {item.technology ? (
            <View style={styles.profileChip}>
              <MaterialCommunityIcons name="code-tags" size={12} color={colors.textSecondary} />
              <Text style={styles.profileChipText}>{item.technology}</Text>
            </View>
          ) : null}

          {item.batch ? (
            <View style={styles.profileChip}>
              <MaterialCommunityIcons name="folder-account-outline" size={12} color={colors.textSecondary} />
              <Text style={styles.profileChipText}>{item.batch}</Text>
            </View>
          ) : null}

          {item.gender ? (
            <View style={styles.profileChip}>
              <Ionicons name="person-outline" size={11} color={colors.textSecondary} />
              <Text style={styles.profileChipText}>{item.gender}</Text>
            </View>
          ) : null}

          {item.phone ? (
            <View style={styles.profileChip}>
              <Ionicons name="call-outline" size={11} color={colors.textSecondary} />
              <Text style={styles.profileChipText}>{item.phone}</Text>
            </View>
          ) : null}
        </View>

        {/* Card Footer Actions: VIEW PROFILE, EDIT, TOGGLE STATUS, DELETE */}
        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={styles.profileCardBtn}
            onPress={() => setProfileStudent(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="person-circle-outline" size={15} color={colors.primary} />
            <Text style={styles.profileCardBtnText}>View Profile</Text>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', gap: 6 }}>
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
              onPress={() => handleDeleteStudent(item)}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={14} color={colors.danger} />
              <Text style={[styles.actionBtnText, { color: colors.danger }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Helper: Create Student Modal
  function renderCreateStudentModal() {
    const allCreateOrgs = Array.from(
      new Set(
        [
          ...organizationsSummary.map((o) => getOrgString(o)),
          ...availableOrganizations.map((o) => getOrgString(o)),
          createOrg,
        ].filter(Boolean)
      )
    );

    const allCreateTechs = Array.from(
      new Set(
        [
          ...formTechs.map((t) => (typeof t === 'string' ? t : (t?.name || ''))),
          ...availableTechnologies.map((t) => (typeof t === 'string' ? t : (t?.name || ''))),
          createTech,
        ].filter(Boolean)
      )
    );

    const allCreateBatches = Array.from(
      new Set(
        [
          ...formBatches.map((b) => (typeof b === 'string' ? b : (b?.name || ''))),
          ...availableBatches.map((b) => (typeof b === 'string' ? b : (b?.name || ''))),
          createBatch,
        ].filter(Boolean)
      )
    );

    return (
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
                <Text style={styles.modalTitle}>Add Candidate / Student</Text>
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
                placeholder="e.g. Aman Sharma"
                placeholderTextColor={colors.textMuted}
                value={createName}
                onChangeText={setCreateName}
              />

              {/* Roll Number / Student ID */}
              <Text style={styles.modalLabel}>
                Student Roll Number / ID <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                style={[styles.modalInput, { fontFamily: 'monospace' }]}
                placeholder="e.g. 2026CS101"
                placeholderTextColor={colors.textMuted}
                value={createRoll}
                onChangeText={setCreateRoll}
                autoCapitalize="characters"
              />

              {/* Organization Selection */}
              <Text style={styles.modalLabel}>
                Assigned Organization <Text style={styles.requiredStar}>*</Text>
              </Text>
              {allCreateOrgs.length > 0 ? (
                <View style={styles.pickerChips}>
                  {allCreateOrgs.map((orgName) => {
                    const isSelected = createOrg === orgName;
                    return (
                      <TouchableOpacity
                        key={orgName}
                        style={[styles.pickerChip, isSelected && styles.pickerChipActive]}
                        onPress={() => handleSelectCreateOrg(orgName)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.pickerChipText, isSelected && styles.pickerChipTextActive]}>
                          {isSelected ? '✓ ' : ''}{orgName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}
              <TextInput
                style={[styles.modalInput, { marginTop: allCreateOrgs.length > 0 ? 8 : 0 }]}
                placeholder="Or type custom institution name..."
                placeholderTextColor={colors.textMuted}
                value={createOrg}
                onChangeText={(val) => {
                  setCreateOrg(val);
                  loadTechsAndBatchesForOrg(val, false);
                }}
              />

              {/* Technology Track */}
              <Text style={[styles.modalLabel, { marginTop: 14 }]}>
                Technology Track <Text style={styles.requiredStar}>*</Text>
              </Text>
              {loadingFormTechs ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : allCreateTechs.length > 0 ? (
                <View style={styles.pickerChips}>
                  {allCreateTechs.map((tName) => {
                    const isSelected = createTech === tName;
                    return (
                      <TouchableOpacity
                        key={tName}
                        style={[styles.pickerChip, isSelected && styles.pickerChipActive]}
                        onPress={() => setCreateTech(tName)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.pickerChipText, isSelected && styles.pickerChipTextActive]}>
                          {isSelected ? '✓ ' : ''}{tName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}
              <TextInput
                style={[styles.modalInput, { marginTop: allCreateTechs.length > 0 ? 8 : 0 }]}
                placeholder="e.g. Full Stack MERN or type custom track"
                placeholderTextColor={colors.textMuted}
                value={createTech}
                onChangeText={setCreateTech}
              />

              {/* Batch / Cohort */}
              <Text style={[styles.modalLabel, { marginTop: 14 }]}>
                Batch / Cohort <Text style={styles.requiredStar}>*</Text>
              </Text>
              {allCreateBatches.length > 0 ? (
                <View style={styles.pickerChips}>
                  {allCreateBatches.map((bName) => {
                    const isSelected = createBatch === bName;
                    return (
                      <TouchableOpacity
                        key={bName}
                        style={[styles.pickerChip, isSelected && styles.pickerChipActive]}
                        onPress={() => setCreateBatch(bName)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.pickerChipText, isSelected && styles.pickerChipTextActive]}>
                          {isSelected ? '✓ ' : ''}{bName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}
              <TextInput
                style={[styles.modalInput, { marginTop: allCreateBatches.length > 0 ? 8 : 0 }]}
                placeholder="e.g. 2026-Batch-A or type custom cohort"
                placeholderTextColor={colors.textMuted}
                value={createBatch}
                onChangeText={setCreateBatch}
              />

              {/* Gender Selection */}
              <Text style={[styles.modalLabel, { marginTop: 14 }]}>Gender</Text>
              <View style={styles.pickerChips}>
                {['Male', 'Female', 'Other'].map((g) => {
                  const isSelected = createGender === g;
                  return (
                    <TouchableOpacity
                      key={g}
                      style={[styles.pickerChip, isSelected && styles.pickerChipActive]}
                      onPress={() => setCreateGender(g)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.pickerChipText, isSelected && styles.pickerChipTextActive]}>
                        {isSelected ? '✓ ' : ''}{g}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Age */}
              <Text style={[styles.modalLabel, { marginTop: 14 }]}>Age (Optional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 21"
                placeholderTextColor={colors.textMuted}
                value={createAge}
                onChangeText={setCreateAge}
                keyboardType="number-pad"
              />

              {/* Password */}
              <Text style={[styles.modalLabel, { marginTop: 14 }]}>
                Access Password <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.modalInput, { flex: 1, borderWidth: 0, paddingHorizontal: 0 }]}
                  placeholder="Minimum 6 characters"
                  placeholderTextColor={colors.textMuted}
                  value={createPassword}
                  onChangeText={setCreatePassword}
                  secureTextEntry={!createShowPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setCreateShowPassword(!createShowPassword)}
                  style={{ padding: 4 }}
                >
                  <Ionicons
                    name={createShowPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              {/* Email (Optional) */}
              <Text style={[styles.modalLabel, { marginTop: 14 }]}>Email Address (Optional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="candidate@university.edu"
                placeholderTextColor={colors.textMuted}
                value={createEmail}
                onChangeText={setCreateEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              {/* Phone (Optional) */}
              <Text style={styles.modalLabel}>Phone Number (Optional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="+91 9876543210"
                placeholderTextColor={colors.textMuted}
                value={createPhone}
                onChangeText={setCreatePhone}
                keyboardType="phone-pad"
              />

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleCreateStudent}
                disabled={submitting}
                activeOpacity={0.8}
              >
                {submitting ? (
                  <ActivityIndicator color={colors.textInverse} size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Create Candidate Account</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }

  // Helper: Edit Student Modal
  function renderEditStudentModal() {
    if (!editingUser) return null;

    const allEditOrgs = Array.from(
      new Set(
        [
          ...organizationsSummary.map((o) => getOrgString(o)),
          ...availableOrganizations.map((o) => getOrgString(o)),
          editingUser?.organization,
          editOrg,
        ].filter(Boolean)
      )
    );

    const allEditTechs = Array.from(
      new Set(
        [
          ...editFormTechs.map((t) => (typeof t === 'string' ? t : (t?.name || ''))),
          ...availableTechnologies.map((t) => (typeof t === 'string' ? t : (t?.name || ''))),
          editingUser?.technology,
          editTech,
        ].filter(Boolean)
      )
    );

    const allEditBatches = Array.from(
      new Set(
        [
          ...editFormBatches.map((b) => (typeof b === 'string' ? b : (b?.name || ''))),
          ...availableBatches.map((b) => (typeof b === 'string' ? b : (b?.name || ''))),
          editingUser?.batch,
          editBatch,
        ].filter(Boolean)
      )
    );

    const currentSavedPass = editingUser?.plainPassword || editingUser?.password || 'Student@123';

    return (
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
                  <Text style={styles.modalTitle}>Edit Candidate</Text>
                  <Text style={styles.modalSub}>{editingUser?.name}</Text>
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
                value={editName}
                onChangeText={setEditName}
                placeholder="Full Name"
                placeholderTextColor={colors.textMuted}
              />

              {/* Roll Number */}
              <Text style={styles.modalLabel}>
                Roll Number / Student ID <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                style={[styles.modalInput, { fontFamily: 'monospace' }]}
                value={editRoll}
                onChangeText={setEditRoll}
                autoCapitalize="characters"
                placeholder="Roll ID"
                placeholderTextColor={colors.textMuted}
              />

              {/* Current Saved Password in Database */}
              <Text style={styles.modalLabel}>Current Saved Password</Text>
              <View style={styles.currentPassBox}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.currentPassLabel}>DATABASE CREDENTIAL</Text>
                  <Text style={styles.currentPassValue} selectable>
                    {showCurrentPassword ? currentSavedPass : '••••••••••••'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.copyPassBtn}
                  onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showCurrentPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={16}
                    color={colors.primary}
                  />
                  <Text style={styles.copyPassBtnText}>
                    {showCurrentPassword ? 'Hide' : 'Show'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Reset Password */}
              <Text style={styles.modalLabel}>Reset Password (Optional)</Text>
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

              {/* Organization Picker */}
              <Text style={styles.modalLabel}>
                Assigned Organization <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View style={styles.pickerChips}>
                {allEditOrgs.map((orgName) => {
                  const isSelected = editOrg === orgName;
                  return (
                    <TouchableOpacity
                      key={orgName}
                      style={[styles.pickerChip, isSelected && styles.pickerChipActive]}
                      onPress={() => {
                        setEditOrg(orgName);
                        loadTechsAndBatchesForOrg(orgName, true);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.pickerChipText, isSelected && styles.pickerChipTextActive]}>
                        {isSelected ? '✓ ' : ''}{orgName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TextInput
                style={[styles.modalInput, { marginTop: 8 }]}
                value={editOrg}
                onChangeText={(val) => {
                  setEditOrg(val);
                  loadTechsAndBatchesForOrg(val, true);
                }}
                placeholder="Or custom organization name"
                placeholderTextColor={colors.textMuted}
              />

              {/* Technology Track */}
              <Text style={[styles.modalLabel, { marginTop: 14 }]}>
                Technology Track <Text style={styles.requiredStar}>*</Text>
              </Text>
              {allEditTechs.length > 0 ? (
                <View style={styles.pickerChips}>
                  {allEditTechs.map((tName) => {
                    const isSelected = editTech === tName;
                    return (
                      <TouchableOpacity
                        key={tName}
                        style={[styles.pickerChip, isSelected && styles.pickerChipActive]}
                        onPress={() => setEditTech(tName)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.pickerChipText, isSelected && styles.pickerChipTextActive]}>
                          {isSelected ? '✓ ' : ''}{tName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}
              <TextInput
                style={[styles.modalInput, { marginTop: allEditTechs.length > 0 ? 8 : 0 }]}
                value={editTech}
                onChangeText={setEditTech}
                placeholder="Technology track"
                placeholderTextColor={colors.textMuted}
              />

              {/* Batch / Cohort */}
              <Text style={[styles.modalLabel, { marginTop: 14 }]}>
                Batch / Cohort <Text style={styles.requiredStar}>*</Text>
              </Text>
              {allEditBatches.length > 0 ? (
                <View style={styles.pickerChips}>
                  {allEditBatches.map((bName) => {
                    const isSelected = editBatch === bName;
                    return (
                      <TouchableOpacity
                        key={bName}
                        style={[styles.pickerChip, isSelected && styles.pickerChipActive]}
                        onPress={() => setEditBatch(bName)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.pickerChipText, isSelected && styles.pickerChipTextActive]}>
                          {isSelected ? '✓ ' : ''}{bName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}
              <TextInput
                style={[styles.modalInput, { marginTop: allEditBatches.length > 0 ? 8 : 0 }]}
                value={editBatch}
                onChangeText={setEditBatch}
                placeholder="Batch / cohort"
                placeholderTextColor={colors.textMuted}
              />

              {/* Gender */}
              <Text style={[styles.modalLabel, { marginTop: 14 }]}>Gender</Text>
              <View style={styles.pickerChips}>
                {['Male', 'Female', 'Other'].map((g) => {
                  const isSelected = editGender === g;
                  return (
                    <TouchableOpacity
                      key={g}
                      style={[styles.pickerChip, isSelected && styles.pickerChipActive]}
                      onPress={() => setEditGender(g)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.pickerChipText, isSelected && styles.pickerChipTextActive]}>
                        {isSelected ? '✓ ' : ''}{g}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Age */}
              <Text style={[styles.modalLabel, { marginTop: 14 }]}>Age</Text>
              <TextInput
                style={styles.modalInput}
                value={editAge}
                onChangeText={setEditAge}
                placeholder="e.g. 21"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
              />

              {/* Email Address */}
              <Text style={[styles.modalLabel, { marginTop: 14 }]}>Email Address</Text>
              <TextInput
                style={styles.modalInput}
                value={editEmail}
                onChangeText={setEditEmail}
                placeholder="candidate@university.edu"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              {/* Phone */}
              <Text style={styles.modalLabel}>Phone Number</Text>
              <TextInput
                style={styles.modalInput}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="+91 9876543210"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, editSubmitting && styles.submitButtonDisabled]}
                onPress={handleUpdateStudent}
                disabled={editSubmitting}
                activeOpacity={0.8}
              >
                {editSubmitting ? (
                  <ActivityIndicator color={colors.textInverse} size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Save Candidate Changes</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }

  // Helper: Student Profile Dossier Modal
  function renderStudentProfileModal() {
    if (!profileStudent) return null;

    const isActive = profileStudent.isActive !== false;
    const initial = (profileStudent.name || 'S').charAt(0).toUpperCase();
    const roll = profileStudent.rollNumber || profileStudent.studentId || 'ID N/A';
    const savedPass = profileStudent.plainPassword || profileStudent.password || 'Student@123';
    const attemptedCount = profileStudent.examsAttempted !== undefined ? profileStudent.examsAttempted : (profileStudent.attemptsCount || 0);
    const avgScore = profileStudent.averageScore !== undefined ? profileStudent.averageScore : (profileStudent.avgScore || 0);
    const createdDate = profileStudent.createdAt
      ? new Date(profileStudent.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'N/A';

    return (
      <Modal
        visible={Boolean(profileStudent)}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setProfileStudent(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setProfileStudent(null)}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>

          <View style={[styles.modalCard, shadows.lg]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialCommunityIcons name="badge-account-outline" size={22} color={colors.primary} />
                <Text style={styles.modalTitle}>Candidate Dossier</Text>
              </View>
              <TouchableOpacity onPress={() => setProfileStudent(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{ paddingBottom: 40 }}
              nestedScrollEnabled={true}
            >
              {/* Hero Profile Card */}
              <View style={styles.profileHeroCard}>
                <View style={styles.profileHeroAvatar}>
                  <Text style={styles.profileHeroAvatarText}>{initial}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.profileHeroName}>{profileStudent.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <Text style={styles.profileHeroRoll}>{roll}</Text>
                    <StatusBadge status={isActive ? 'ACTIVE' : 'INACTIVE'} size="small" />
                  </View>
                </View>
              </View>

              {/* Assessment Stats Banner */}
              <View style={styles.profileStatsRow}>
                <View style={styles.profileStatItem}>
                  <Text style={styles.profileStatValue}>{attemptedCount}</Text>
                  <Text style={styles.profileStatLabel}>Exams Taken</Text>
                </View>
                <View style={[styles.profileStatItem, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.borderLight }]}>
                  <Text style={[styles.profileStatValue, { color: colors.primary }]}>
                    {avgScore ? `${avgScore}%` : 'N/A'}
                  </Text>
                  <Text style={styles.profileStatLabel}>Average Score</Text>
                </View>
                <View style={styles.profileStatItem}>
                  <Text style={[styles.profileStatValue, { color: isActive ? colors.success : colors.warning }]}>
                    {isActive ? 'Active' : 'Disabled'}
                  </Text>
                  <Text style={styles.profileStatLabel}>Account Status</Text>
                </View>
              </View>

              {/* Section 1: Academic & Institutional Placement */}
              <Text style={styles.profileSectionTitle}>Academic & Cohort Placement</Text>
              <View style={styles.profileInfoBox}>
                <View style={styles.profileInfoRow}>
                  <MaterialCommunityIcons name="domain" size={16} color={colors.primary} />
                  <Text style={styles.profileInfoLabel}>Organization</Text>
                  <Text style={styles.profileInfoValue} numberOfLines={1}>
                    {profileStudent.organization || 'Unassigned / Direct'}
                  </Text>
                </View>

                <View style={styles.profileInfoRow}>
                  <MaterialCommunityIcons name="code-tags" size={16} color={colors.primary} />
                  <Text style={styles.profileInfoLabel}>Technology Track</Text>
                  <Text style={styles.profileInfoValue} numberOfLines={1}>
                    {profileStudent.technology || 'General'}
                  </Text>
                </View>

                <View style={[styles.profileInfoRow, { borderBottomWidth: 0 }]}>
                  <MaterialCommunityIcons name="folder-account-outline" size={16} color={colors.primary} />
                  <Text style={styles.profileInfoLabel}>Batch / Cohort</Text>
                  <Text style={styles.profileInfoValue} numberOfLines={1}>
                    {profileStudent.batch || 'Unassigned'}
                  </Text>
                </View>
              </View>

              {/* Section 2: Account Login Credentials */}
              <Text style={styles.profileSectionTitle}>Portal Login Credentials</Text>
              <View style={styles.profileInfoBox}>
                <View style={styles.profileInfoRow}>
                  <MaterialCommunityIcons name="card-account-details-outline" size={16} color={colors.primary} />
                  <Text style={styles.profileInfoLabel}>Login Username</Text>
                  <Text style={[styles.profileInfoValue, { fontFamily: 'monospace', fontWeight: '800' }]} selectable>
                    {roll}
                  </Text>
                </View>

                <View style={[styles.profileInfoRow, { borderBottomWidth: 0 }]}>
                  <MaterialCommunityIcons name="key-outline" size={16} color={colors.primary} />
                  <Text style={styles.profileInfoLabel}>Saved Password</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text
                      style={[
                        styles.profileInfoValue,
                        { fontFamily: showProfilePassword ? 'monospace' : undefined, fontWeight: '700' },
                      ]}
                      selectable
                    >
                      {showProfilePassword ? savedPass : '••••••••••••'}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setShowProfilePassword(!showProfilePassword)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons
                        name={showProfilePassword ? 'eye-off-outline' : 'eye-outline'}
                        size={16}
                        color={colors.primary}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Section 3: Contact & Demographics */}
              <Text style={styles.profileSectionTitle}>Contact & Demographics</Text>
              <View style={styles.profileInfoBox}>
                <View style={styles.profileInfoRow}>
                  <Ionicons name="mail-outline" size={16} color={colors.primary} />
                  <Text style={styles.profileInfoLabel}>Email Address</Text>
                  <Text style={styles.profileInfoValue} numberOfLines={1} selectable>
                    {profileStudent.email || 'Not provided'}
                  </Text>
                </View>

                <View style={styles.profileInfoRow}>
                  <Ionicons name="call-outline" size={16} color={colors.primary} />
                  <Text style={styles.profileInfoLabel}>Phone Number</Text>
                  <Text style={styles.profileInfoValue} selectable>
                    {profileStudent.phone || 'Not provided'}
                  </Text>
                </View>

                <View style={styles.profileInfoRow}>
                  <Ionicons name="person-outline" size={16} color={colors.primary} />
                  <Text style={styles.profileInfoLabel}>Gender</Text>
                  <Text style={styles.profileInfoValue}>{profileStudent.gender || 'Not specified'}</Text>
                </View>

                <View style={styles.profileInfoRow}>
                  <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                  <Text style={styles.profileInfoLabel}>Age</Text>
                  <Text style={styles.profileInfoValue}>
                    {profileStudent.age ? `${profileStudent.age} years` : 'Not specified'}
                  </Text>
                </View>

                <View style={[styles.profileInfoRow, { borderBottomWidth: 0 }]}>
                  <Ionicons name="time-outline" size={16} color={colors.primary} />
                  <Text style={styles.profileInfoLabel}>Enrolled Date</Text>
                  <Text style={styles.profileInfoValue}>{createdDate}</Text>
                </View>
              </View>

              {/* Actions Footer */}
              <View style={styles.profileModalActions}>
                <TouchableOpacity
                  style={[styles.profileModalBtn, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    const studentToEdit = profileStudent;
                    setProfileStudent(null);
                    handleOpenEdit(studentToEdit);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="create-outline" size={16} color={colors.textInverse} />
                  <Text style={styles.profileModalBtnText}>Edit Details</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.profileModalBtn,
                    { backgroundColor: isActive ? '#FEF3C7' : '#D1FAE5' },
                  ]}
                  onPress={() => handleToggleStatus(profileStudent)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={isActive ? 'pause-circle-outline' : 'play-circle-outline'}
                    size={16}
                    color={isActive ? colors.warning : colors.success}
                  />
                  <Text
                    style={[
                      styles.profileModalBtnText,
                      { color: isActive ? '#92400E' : '#065F46' },
                    ]}
                  >
                    {isActive ? 'Deactivate' : 'Activate'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.profileModalBtn, { backgroundColor: '#FEE2E2' }]}
                  onPress={() => handleDeleteStudent(profileStudent)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.danger} />
                  <Text style={[styles.profileModalBtnText, { color: colors.danger }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  orgTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 10,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 4,
  },
  viewAllBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  orgListContent: {
    padding: 16,
    paddingBottom: 90,
  },
  orgCardsGrid: {
    gap: 12,
  },
  orgCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  orgCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orgIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orgCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  orgCardSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  studentBadge: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  studentBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
  },
  orgBatchesSection: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  orgBatchesLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  orgBatchChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  orgBatchChip: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  orgBatchChipText: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: colors.primary,
    fontWeight: '700',
  },
  orgCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  drilldownText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  drilldownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  drilldownTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  drilldownSub: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  addCandidateHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 3,
  },
  addCandidateHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textInverse,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  filterTabsRow: {
    paddingBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 6,
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
  studentName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  rollBadge: {
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
  profileChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  profileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  profileChipText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  profileCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  profileCardBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
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
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  footerLoaderText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  footerCountBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  footerCountText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  currentPassBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: 'rgba(79, 107, 247, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 4,
  },
  currentPassLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  currentPassValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  copyPassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  copyPassBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  profileHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 14,
  },
  profileHeroAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileHeroAvatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textInverse,
  },
  profileHeroName: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  profileHeroRoll: {
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: colors.primary,
  },
  profileStatsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: 10,
    marginBottom: 16,
  },
  profileStatItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  profileStatValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  profileStatLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  profileSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 6,
  },
  profileInfoBox: {
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  profileInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: 8,
  },
  profileInfoLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    width: 110,
  },
  profileInfoValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
  profileModalActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
  },
  profileModalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  profileModalBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textInverse,
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
    paddingVertical: 7,
    borderRadius: 10,
  },
  pickerChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  pickerChipText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  pickerChipTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  helperBox: {
    padding: 10,
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  helperBoxText: {
    fontSize: 11,
    color: colors.textSecondary,
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
