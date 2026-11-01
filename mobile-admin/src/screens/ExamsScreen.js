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
import { downloadExamResultsExcel } from '../utils/exportUtils';

const STATUS_TABS = ['ALL', 'ACTIVE', 'UPCOMING', 'COMPLETED', 'DRAFT'];
const TYPE_FILTERS = ['ALL', 'CODING', 'MCQ', 'HYBRID'];

export default function ExamsScreen() {
  const [exams, setExams] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedTab, setSelectedTab] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedBatch, setSelectedBatch] = useState('ALL');
  const [selectedTech, setSelectedTech] = useState('ALL');

  // Inspection Modal
  const [inspectingExam, setInspectingExam] = useState(null);

  const fetchExams = useCallback(async () => {
    try {
      const [examsRes, batchesRes] = await Promise.all([
        api.get('/admin/exams'),
        api.get('/admin/batches').catch(() => ({ data: [] })),
      ]);

      const list = examsRes?.data?.exams || examsRes?.data || [];
      const bList = batchesRes?.data?.batches || batchesRes?.data || [];

      setExams(Array.isArray(list) ? list : []);
      setBatches(Array.isArray(bList) ? bList : []);
    } catch (err) {
      console.warn('Failed to fetch exams', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchExams();
  };

  const handleDuplicate = async (exam) => {
    Alert.alert(
      'Duplicate Examination',
      `Create a duplicate copy of "${exam.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Duplicate',
          onPress: async () => {
            try {
              await api.post(`/admin/exams/${exam._id}/duplicate`);
              Alert.alert('Duplicated', `Exam "${exam.title}" duplicated.`);
              fetchExams();
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to duplicate exam');
            }
          },
        },
      ]
    );
  };

  const handleDelete = async (exam) => {
    Alert.alert(
      'Delete Examination',
      `Are you sure you want to delete "${exam.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/admin/exams/${exam._id}`);
              Alert.alert('Deleted', 'Examination deleted.');
              fetchExams();
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to delete exam');
            }
          },
        },
      ]
    );
  };

  const getExamStatus = (exam) => {
    if (!exam.isPublished || exam.status === 'DRAFT') return 'DRAFT';
    const now = new Date();
    const start = new Date(exam.startDate);
    const end = new Date(exam.endDate);

    if (now < start) return 'UPCOMING';
    if (now > end) return 'EXPIRED';
    return 'ACTIVE';
  };

  // Extract all unique technologies from loaded exams
  const availableTechnologies = Array.from(
    new Set(
      exams.flatMap((e) => [
        ...(Array.isArray(e.targetTechnologies) ? e.targetTechnologies : []),
        e.technology,
      ]).filter(Boolean)
    )
  );

  // Extract all unique target batches from loaded exams + batches API
  const availableBatchesList = Array.from(
    new Set([
      ...batches.map((b) => b.name).filter(Boolean),
      ...exams.flatMap((e) => (Array.isArray(e.targetBatches) ? e.targetBatches : [])).filter(Boolean),
    ])
  );

  // Filter exams accurately by Status, Type, Batch, Technology, and Search
  const filteredExams = exams.filter((exam) => {
    const computedStatus = getExamStatus(exam);

    if (selectedTab !== 'ALL') {
      if (selectedTab === 'COMPLETED') {
        if (computedStatus !== 'COMPLETED' && computedStatus !== 'EXPIRED') return false;
      } else if (computedStatus !== selectedTab) {
        return false;
      }
    }

    if (selectedType !== 'ALL' && (exam.type || 'CODING').toUpperCase() !== selectedType) {
      return false;
    }

    if (selectedBatch !== 'ALL') {
      const targetBatches = Array.isArray(exam.targetBatches) ? exam.targetBatches : [];
      const match = targetBatches.some(
        (b) => String(b).trim().toLowerCase() === selectedBatch.trim().toLowerCase()
      );
      if (!match) return false;
    }

    if (selectedTech !== 'ALL') {
      const examTechs = [
        ...(Array.isArray(exam.targetTechnologies) ? exam.targetTechnologies : []),
        exam.technology,
      ].filter(Boolean);
      const match = examTechs.some(
        (t) => String(t).trim().toLowerCase() === selectedTech.trim().toLowerCase()
      );
      if (!match) return false;
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const matchTitle = (exam.title || '').toLowerCase().includes(q);
      const matchCode = (exam.code || '').toLowerCase().includes(q);
      const matchOrg = (exam.organization || '').toLowerCase().includes(q);
      return matchTitle || matchCode || matchOrg;
    }

    return true;
  });

  const renderExamCard = ({ item }) => {
    const status = getExamStatus(item);
    const startDateFormatted = item.startDate
      ? new Date(item.startDate).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'Flexible Schedule';

    const questionCount =
      (item.questions?.length || 0) +
      (item.codingQuestions?.length || 0) +
      (item.mcqQuestions?.length || 0);

    const targetBatches = Array.isArray(item.targetBatches) ? item.targetBatches : [];
    const targetTechs = [
      ...(Array.isArray(item.targetTechnologies) ? item.targetTechnologies : []),
      item.technology,
    ].filter(Boolean);

    return (
      <View style={[styles.card, shadows.sm]}>
        <TouchableOpacity
          onPress={() => setInspectingExam(item)}
          activeOpacity={0.85}
        >
          <View style={styles.cardHeader}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <View style={styles.codeRow}>
                <Text style={styles.examCode}>{item.code || 'EXAM'}</Text>
                <StatusBadge status={item.type || 'CODING'} size="small" />
                {item.organization ? (
                  <View style={styles.orgBadge}>
                    <Text style={styles.orgBadgeText}>{item.organization}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.examTitle}>{item.title}</Text>
            </View>
            <StatusBadge status={status === 'EXPIRED' ? 'COMPLETED' : status} />
          </View>

          {/* Details Meta */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="clock-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.metaText}>{item.duration || 60} Mins</Text>
            </View>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="help-circle-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.metaText}>{questionCount} Questions</Text>
            </View>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="trophy-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.metaText}>{item.totalMarks || 100} Marks</Text>
            </View>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="percent-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.metaText}>Pass: {item.passingMarks || item.passingPercentage || 60}</Text>
            </View>
          </View>

          {/* Schedule */}
          <View style={styles.scheduleRow}>
            <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
            <Text style={styles.scheduleText}>{startDateFormatted}</Text>
          </View>

          {/* Cohorts & Technologies */}
          {(targetBatches.length > 0 || targetTechs.length > 0) ? (
            <View style={styles.cohortRow}>
              {targetBatches.map((b, bi) => (
                <View key={bi} style={styles.cohortBadge}>
                  <MaterialCommunityIcons name="folder-account-outline" size={11} color={colors.primary} />
                  <Text style={styles.cohortBadgeText}>{b}</Text>
                </View>
              ))}
              {targetTechs.map((t, ti) => (
                <View key={ti} style={styles.techBadge}>
                  <MaterialCommunityIcons name="code-tags" size={11} color={colors.textSecondary} />
                  <Text style={styles.techBadgeText}>{t}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </TouchableOpacity>

        {/* Card Footer Actions: INSPECT, DUPLICATE, DELETE */}
        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.inspectBtn]}
            onPress={() => setInspectingExam(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="eye-outline" size={14} color={colors.primary} />
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>Inspect</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleDuplicate(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="copy-outline" size={13} color={colors.textSecondary} />
            <Text style={styles.actionBtnText}>Duplicate</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={() => handleDelete(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={13} color={colors.danger} />
            <Text style={[styles.actionBtnText, { color: colors.danger }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Header title="Examinations Overview" subtitle="Supervise live evaluations, schedules, and proctoring parameters" />

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search by title, code, or organization..."
          onClear={() => setSearch('')}
        />
      </View>

      {/* Status Filter Chips */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {STATUS_TABS.map((tab) => {
            const isSelected = selectedTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tabButton, isSelected && styles.tabButtonActive]}
                onPress={() => setSelectedTab(tab)}
              >
                <Text style={[styles.tabButtonText, isSelected && styles.tabButtonTextActive]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Cohorts, Technology, & Type Filters Row */}
      <View style={styles.typeRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {TYPE_FILTERS.map((t) => {
            const isSelected = selectedType === t;
            return (
              <TouchableOpacity
                key={t}
                style={[styles.typeChip, isSelected && styles.typeChipActive]}
                onPress={() => setSelectedType(t)}
              >
                <Text style={[styles.typeChipText, isSelected && styles.typeChipTextActive]}>
                  {t === 'ALL' ? 'All Types' : t}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Cohort / Target Batch Chips */}
          {availableBatchesList.map((bName) => {
            const isSelected = selectedBatch === bName;
            return (
              <TouchableOpacity
                key={bName}
                style={[styles.typeChip, isSelected && styles.typeChipActive]}
                onPress={() => setSelectedBatch(isSelected ? 'ALL' : bName)}
              >
                <Text style={[styles.typeChipText, isSelected && styles.typeChipTextActive]}>
                  Cohort: {bName}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Technology Chips */}
          {availableTechnologies.map((tech) => {
            const isSelected = selectedTech === tech;
            return (
              <TouchableOpacity
                key={tech}
                style={[styles.typeChip, isSelected && styles.typeChipActive]}
                onPress={() => setSelectedTech(isSelected ? 'ALL' : tech)}
              >
                <Text style={[styles.typeChipText, isSelected && styles.typeChipTextActive]}>
                  Tech: {tech}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Exams List */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading examinations...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredExams}
          keyExtractor={(item) => item._id}
          renderItem={renderExamCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="file-document-outline"
              title="No Examinations Found"
              description="No exams match your current status or filter criteria."
            />
          }
        />
      )}

      {/* Exam Details Inspection Modal */}
      {inspectingExam ? (
        <Modal
          visible={!!inspectingExam}
          transparent
          animationType="slide"
          statusBarTranslucent
          onRequestClose={() => setInspectingExam(null)}
        >
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => setInspectingExam(null)}>
              <View style={StyleSheet.absoluteFillObject} />
            </TouchableWithoutFeedback>

            <View style={[styles.modalCard, shadows.lg]}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.modalTitle}>{inspectingExam.title}</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                    <StatusBadge status={getExamStatus(inspectingExam)} size="small" />
                    <StatusBadge status={inspectingExam.type || 'CODING'} size="small" />
                  </View>
                </View>
                <TouchableOpacity onPress={() => setInspectingExam(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
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

                {/* Code & Schedule Card */}
                <View style={styles.inspectInfoCard}>
                  <View style={styles.inspectInfoRow}>
                    <Text style={styles.inspectLabel}>Exam Code</Text>
                    <Text style={styles.inspectValue}>{inspectingExam.code || 'N/A'}</Text>
                  </View>
                  <View style={styles.inspectInfoRow}>
                    <Text style={styles.inspectLabel}>Organization</Text>
                    <Text style={styles.inspectValue}>{inspectingExam.organization || 'General'}</Text>
                  </View>
                  <View style={styles.inspectInfoRow}>
                    <Text style={styles.inspectLabel}>Duration</Text>
                    <Text style={styles.inspectValue}>{inspectingExam.duration || 60} Minutes</Text>
                  </View>
                  <View style={styles.inspectInfoRow}>
                    <Text style={styles.inspectLabel}>Total Marks</Text>
                    <Text style={styles.inspectValue}>{inspectingExam.totalMarks || 100} Marks</Text>
                  </View>
                  <View style={styles.inspectInfoRow}>
                    <Text style={styles.inspectLabel}>Passing Marks</Text>
                    <Text style={styles.inspectValue}>{inspectingExam.passingMarks || inspectingExam.passingPercentage || 60}</Text>
                  </View>
                  <View style={styles.inspectInfoRow}>
                    <Text style={styles.inspectLabel}>Start Window</Text>
                    <Text style={styles.inspectValue}>
                      {inspectingExam.startDate ? new Date(inspectingExam.startDate).toLocaleString() : 'Anytime'}
                    </Text>
                  </View>
                  <View style={styles.inspectInfoRow}>
                    <Text style={styles.inspectLabel}>End Window</Text>
                    <Text style={styles.inspectValue}>
                      {inspectingExam.endDate ? new Date(inspectingExam.endDate).toLocaleString() : 'Open Ended'}
                    </Text>
                  </View>
                </View>

                {/* Description */}
                {inspectingExam.description ? (
                  <>
                    <Text style={styles.sectionHeader}>Instructions</Text>
                    <Text style={styles.descriptionText}>{inspectingExam.description}</Text>
                  </>
                ) : null}

                {/* Security Settings */}
                <Text style={styles.sectionHeader}>Security & Anti-Cheat Controls</Text>
                <View style={styles.securityBox}>
                  <View style={styles.secRow}>
                    <Text style={styles.secLabel}>Fullscreen Enforcement</Text>
                    <Text style={[styles.secStatus, { color: inspectingExam.securitySettings?.enableFullscreen ? colors.success : colors.textMuted }]}>
                      {inspectingExam.securitySettings?.enableFullscreen ? 'ENABLED' : 'DISABLED'}
                    </Text>
                  </View>
                  <View style={styles.secRow}>
                    <Text style={styles.secLabel}>Webcam Snapshot Proctoring</Text>
                    <Text style={[styles.secStatus, { color: inspectingExam.securitySettings?.enableProctoring ? colors.success : colors.textMuted }]}>
                      {inspectingExam.securitySettings?.enableProctoring ? 'ENABLED' : 'DISABLED'}
                    </Text>
                  </View>
                  <View style={styles.secRow}>
                    <Text style={styles.secLabel}>Max Tab Switches Threshold</Text>
                    <Text style={styles.secValue}>
                      {inspectingExam.securitySettings?.maxTabSwitches || inspectingExam.maxViolations || 5} Violations Max
                    </Text>
                  </View>
                </View>

                {/* Questions Attached */}
                {inspectingExam.questions && inspectingExam.questions.length > 0 ? (
                  <>
                    <Text style={styles.sectionHeader}>
                      Attached Problems ({inspectingExam.questions.length})
                    </Text>
                    {inspectingExam.questions.map((qItem, i) => {
                      const qDoc = qItem.questionId || qItem;
                      return (
                        <View key={i} style={styles.attachedQuestionCard}>
                          <Text style={styles.attachedQNum}>Q{i + 1}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.attachedQTitle}>{qDoc.title || 'Assessment Problem'}</Text>
                            <Text style={styles.attachedQMeta}>
                              {qDoc.type || 'CODING'} • {qItem.marks || qDoc.marks || 10} Marks
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </>
                ) : null}
              </ScrollView>
            </View>
          </View>
        </Modal>
      ) : null}
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
  tabsContainer: {
    paddingVertical: 6,
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  tabButtonTextActive: {
    color: colors.textInverse,
  },
  typeRow: {
    paddingBottom: 8,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginRight: 6,
  },
  typeChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  typeChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  typeChipTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
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
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  examCode: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    fontFamily: 'monospace',
  },
  orgBadge: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  orgBadgeText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  examTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
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
    fontWeight: '500',
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  scheduleText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  cohortRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  cohortBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cohortBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  techBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  techBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    gap: 4,
  },
  exportBtn: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  inspectBtn: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  deleteBtn: {
    backgroundColor: colors.dangerLight,
    borderColor: colors.dangerBorder,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
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
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalBody: {
    paddingHorizontal: 16,
    paddingTop: 12,
    flexShrink: 1,
  },
  modalDownloadExcelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 6,
    marginBottom: 12,
  },
  modalDownloadExcelText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#047857',
  },
  inspectInfoCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    gap: 6,
  },
  inspectInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  inspectLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  inspectValue: {
    fontSize: 11,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 6,
  },
  descriptionText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  securityBox: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 12,
  },
  secRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  secLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  secStatus: {
    fontSize: 11,
    fontWeight: '800',
  },
  secValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  attachedQuestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 10,
  },
  attachedQNum: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  attachedQTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  attachedQMeta: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
