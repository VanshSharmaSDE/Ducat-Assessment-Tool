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
import ResultDetailModal from './ResultDetailModal';
import { downloadResultsExcel, downloadExamResultsExcel } from '../utils/exportUtils';

const EXAM_STATUS_TABS = ['ALL', 'ACTIVE', 'UPCOMING', 'COMPLETED', 'DRAFT'];

const OUTCOME_OPTIONS = [
  { id: '', label: 'All Outcomes' },
  { id: 'PASS', label: 'Passed' },
  { id: 'FAIL', label: 'Failed' },
  { id: 'TERMINATED', label: 'Terminated' },
  { id: 'ONGOING', label: 'Ongoing' },
  { id: 'PENDING', label: 'Pending' },
];

export default function ResultsScreen() {
  // Navigation State: null = Exams Overview List, object / '__ALL__' = Drilled-down Submissions View
  const [selectedExam, setSelectedExam] = useState(null);

  // Exams Data
  const [exams, setExams] = useState([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [examSearch, setExamSearch] = useState('');
  const [examStatusTab, setExamStatusTab] = useState('ALL');
  const [examBatchFilter, setExamBatchFilter] = useState('ALL');
  const [examTechFilter, setExamTechFilter] = useState('ALL');

  // Submissions Results Data
  const [results, setResults] = useState([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [techFilter, setTechFilter] = useState('');

  // Selected Submission Detail Modal
  const [selectedAttemptId, setSelectedAttemptId] = useState(null);

  // Selected Exam Specification Inspection Modal
  const [inspectingExam, setInspectingExam] = useState(null);

  // Fetch Exams
  const fetchExams = useCallback(async () => {
    try {
      setLoadingExams(true);
      const res = await api.get('/admin/exams');
      const list = res?.data?.exams || res?.data || [];
      setExams(Array.isArray(list) ? list : []);
    } catch (err) {
      console.warn('Failed to fetch exams in results', err.message);
    } finally {
      setLoadingExams(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch Submissions / Results
  const fetchResults = useCallback(async (examId = null) => {
    try {
      setLoadingResults(true);
      let query = '?page=1&limit=100';
      const targetExamId = examId || (selectedExam && selectedExam !== '__ALL__' ? selectedExam._id : null);

      if (targetExamId) {
        query += `&examId=${encodeURIComponent(targetExamId)}`;
      }
      if (statusFilter) {
        query += `&resultStatus=${encodeURIComponent(statusFilter)}`;
      }
      if (batchFilter) {
        query += `&batch=${encodeURIComponent(batchFilter)}`;
      }
      if (techFilter) {
        query += `&technology=${encodeURIComponent(techFilter)}`;
      }

      const res = await api.get(`/admin/results${query}`);
      const raw = res?.data || res || {};
      const list = raw.results || raw.attempts || (Array.isArray(raw) ? raw : []);
      setResults(Array.isArray(list) ? list : []);
    } catch (err) {
      console.warn('Failed to fetch submissions', err.message);
    } finally {
      setLoadingResults(false);
      setRefreshing(false);
    }
  }, [selectedExam, statusFilter, batchFilter, techFilter]);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  useEffect(() => {
    if (selectedExam !== null) {
      fetchResults();
    }
  }, [selectedExam, fetchResults]);

  const onRefresh = () => {
    setRefreshing(true);
    if (selectedExam === null) {
      fetchExams();
    } else {
      fetchResults();
    }
  };

  const handleSelectExam = (exam) => {
    setSelectedExam(exam);
    setSearch('');
    setStatusFilter('');
    setBatchFilter('');
    setTechFilter('');
  };

  const handleAllowRetake = async (item) => {
    Alert.alert(
      'Allow Retake',
      `Allow candidate "${item.userId?.name || 'Student'}" to retake this examination? This will reset their submission attempt.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Grant Retake',
          onPress: async () => {
            try {
              await api.post(`/admin/results/${item._id}/allow-retake`);
              Alert.alert('Retake Allowed', 'Candidate can now re-attempt the assessment.');
              fetchResults();
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to grant retake');
            }
          },
        },
      ]
    );
  };

  const handleTerminate = async (item) => {
    Alert.alert(
      'Terminate Attempt',
      `Force immediate termination of "${item.userId?.name || 'Candidate'}"'s active evaluation?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Terminate Now',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post(`/admin/results/${item._id}/terminate`);
              Alert.alert('Terminated', 'Examination attempt terminated immediately.');
              fetchResults();
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to terminate attempt');
            }
          },
        },
      ]
    );
  };

  const getComputedExamStatus = (exam) => {
    if (!exam.isPublished || exam.status === 'DRAFT') return 'DRAFT';
    const now = new Date();
    const start = new Date(exam.startDate);
    const end = new Date(exam.endDate);

    if (now < start) return 'UPCOMING';
    if (now > end) return 'EXPIRED';
    return 'ACTIVE';
  };

  // Filter exams in Level 1
  const filteredExams = exams.filter((exam) => {
    const computedStatus = getComputedExamStatus(exam);

    if (examStatusTab !== 'ALL') {
      if (examStatusTab === 'COMPLETED') {
        if (computedStatus !== 'COMPLETED' && computedStatus !== 'EXPIRED') return false;
      } else if (computedStatus !== examStatusTab) {
        return false;
      }
    }

    if (examBatchFilter !== 'ALL') {
      const batches = Array.isArray(exam.targetBatches) ? exam.targetBatches : [];
      const match = batches.some((b) => String(b).trim().toLowerCase() === examBatchFilter.toLowerCase());
      if (!match) return false;
    }

    if (examTechFilter !== 'ALL') {
      const techs = [
        ...(Array.isArray(exam.targetTechnologies) ? exam.targetTechnologies : []),
        exam.technology,
      ].filter(Boolean);
      const match = techs.some((t) => String(t).trim().toLowerCase() === examTechFilter.toLowerCase());
      if (!match) return false;
    }

    if (examSearch.trim()) {
      const q = examSearch.trim().toLowerCase();
      const matchTitle = (exam.title || '').toLowerCase().includes(q);
      const matchCode = (exam.code || '').toLowerCase().includes(q);
      const matchOrg = (exam.organization || '').toLowerCase().includes(q);
      return matchTitle || matchCode || matchOrg;
    }

    return true;
  });

  // Filter submissions in Level 2
  const filteredSubmissions = results.filter((item) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    const matchName = (item.userId?.name || item.userName || '').toLowerCase().includes(q);
    const matchRoll = (item.userId?.rollNumber || item.userId?.studentId || '').toLowerCase().includes(q);
    const matchExam = (item.examId?.title || item.examTitle || '').toLowerCase().includes(q);
    const matchEmail = (item.userId?.email || '').toLowerCase().includes(q);
    const matchBatch = (item.userId?.batch || item.batch || '').toLowerCase().includes(q);
    return matchName || matchRoll || matchExam || matchEmail || matchBatch;
  });

  // Unique batches and techs from exams
  const availableBatchesList = Array.from(
    new Set(exams.flatMap((e) => (Array.isArray(e.targetBatches) ? e.targetBatches : [])).filter(Boolean))
  );

  const availableTechsList = Array.from(
    new Set(
      exams.flatMap((e) => [
        ...(Array.isArray(e.targetTechnologies) ? e.targetTechnologies : []),
        e.technology,
      ]).filter(Boolean)
    )
  );

  // ==============================================================
  // LEVEL 1: Exams Overview View (Visible First)
  // Shows all exams with full information! Tapping drills down to results.
  // ==============================================================
  if (selectedExam === null) {
    return (
      <View style={styles.container}>
        <Header
          title="Results & Assessment Telemetry"
          subtitle="Select an examination to inspect candidate submissions and export Excel"
        />

        {/* Top Action Bar & Search */}
        <View style={styles.examTopBar}>
          <View style={{ flex: 1 }}>
            <SearchBar
              value={examSearch}
              onChangeText={setExamSearch}
              placeholder="Search assessment by title, code, or org..."
              onClear={() => setExamSearch('')}
            />
          </View>
          <TouchableOpacity
            style={styles.allSubmissionsBtn}
            onPress={() => setSelectedExam('__ALL__')}
            activeOpacity={0.8}
          >
            <Ionicons name="list-outline" size={16} color={colors.primary} />
            <Text style={styles.allSubmissionsBtnText}>All Results</Text>
          </TouchableOpacity>
        </View>

        {/* Status Filter Tabs */}
        <View style={styles.examStatusTabsRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
            {EXAM_STATUS_TABS.map((tab) => {
              const isSelected = examStatusTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.statusTabChip, isSelected && styles.statusTabChipActive]}
                  onPress={() => setExamStatusTab(tab)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.statusTabChipText, isSelected && styles.statusTabChipTextActive]}>
                    {tab}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* Batch Filter Chips */}
            {availableBatchesList.map((bName) => {
              const isSelected = examBatchFilter === bName;
              return (
                <TouchableOpacity
                  key={bName}
                  style={[styles.statusTabChip, isSelected && styles.statusTabChipActive]}
                  onPress={() => setExamBatchFilter(isSelected ? 'ALL' : bName)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.statusTabChipText, isSelected && styles.statusTabChipTextActive]}>
                    Cohort: {bName}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* Tech Filter Chips */}
            {availableTechsList.map((tName) => {
              const isSelected = examTechFilter === tName;
              return (
                <TouchableOpacity
                  key={tName}
                  style={[styles.statusTabChip, isSelected && styles.statusTabChipActive]}
                  onPress={() => setExamTechFilter(isSelected ? 'ALL' : tName)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.statusTabChipText, isSelected && styles.statusTabChipTextActive]}>
                    Tech: {tName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Exams List */}
        {loadingExams ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Fetching examinations directory...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredExams}
            keyExtractor={(item) => item._id}
            renderItem={renderFullExamCard}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
            }
            ListEmptyComponent={
              <EmptyState
                icon="file-document-outline"
                title="No Examinations Found"
                description="No exams match your search or filter criteria."
              />
            }
          />
        )}

        {/* Exam Specification Modal */}
        {renderExamSpecModal()}
      </View>
    );
  }

  // ==============================================================
  // LEVEL 2: Drilled-down Examination Submissions View
  // ==============================================================
  const isAllView = selectedExam === '__ALL__';
  const examTitle = isAllView ? 'All Candidate Submissions' : selectedExam.title;
  const examCode = isAllView ? 'GLOBAL' : (selectedExam.code || 'EXAM');

  return (
    <View style={styles.container}>
      {/* Navigation Header with Back Button and Download Excel */}
      <View style={styles.drilldownHeader}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => setSelectedExam(null)}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={{ flex: 1, marginLeft: 8, marginRight: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.drilldownTitle} numberOfLines={1}>{examTitle}</Text>
            {!isAllView ? (
              <TouchableOpacity
                onPress={() => setInspectingExam(selectedExam)}
                style={styles.drilldownSpecBtn}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
              </TouchableOpacity>
            ) : null}
          </View>
          <Text style={styles.drilldownSub}>
            Code: {examCode} • {filteredSubmissions.length} Candidate Submissions
          </Text>
        </View>

        {/* EXCEL EXPORT BUTTON ONLY IN RESULTS */}
        <TouchableOpacity
          style={styles.exportExcelBtn}
          onPress={() => {
            if (isAllView) {
              downloadResultsExcel({ search, resultStatus: statusFilter });
            } else {
              downloadExamResultsExcel(selectedExam._id, selectedExam.title);
            }
          }}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="file-excel-box" size={16} color="#047857" />
          <Text style={styles.exportExcelBtnText}>Export Excel</Text>
        </TouchableOpacity>
      </View>

      {/* Candidate Search Section */}
      <View style={styles.searchSection}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search student, roll number, email, or batch..."
          onClear={() => setSearch('')}
        />
      </View>

      {/* Outcome Status Pill Filter */}
      <View style={styles.outcomePillsRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {OUTCOME_OPTIONS.map((opt) => {
            const isSelected = statusFilter === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[styles.outcomeChip, isSelected && styles.outcomeChipActive]}
                onPress={() => setStatusFilter(opt.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.outcomeChipText, isSelected && styles.outcomeChipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Submissions List */}
      {loadingResults ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading candidate evaluations...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredSubmissions}
          keyExtractor={(item) => item._id}
          renderItem={renderCandidateResultCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="trophy-outline"
              title="No Results Recorded"
              description="No candidate submissions match your current filter."
            />
          }
        />
      )}

      {/* Result Detail Modal */}
      {selectedAttemptId ? (
        <ResultDetailModal
          visible={!!selectedAttemptId}
          attemptId={selectedAttemptId}
          onClose={() => setSelectedAttemptId(null)}
          onRefreshList={fetchResults}
        />
      ) : null}

      {/* Exam Specification Modal */}
      {renderExamSpecModal()}
    </View>
  );

  // Helper 1: Full Exam Card Renderer (Exams Overview Level 1)
  function renderFullExamCard({ item }) {
    const status = getComputedExamStatus(item);
    const startDateFormatted = item.startDate
      ? new Date(item.startDate).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'Flexible Schedule';

    const endDateFormatted = item.endDate
      ? new Date(item.endDate).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'Open Ended';

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
      <TouchableOpacity
        style={[styles.examCard, shadows.sm]}
        onPress={() => handleSelectExam(item)}
        activeOpacity={0.85}
      >
        <View style={styles.examCardHeader}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <View style={styles.codeRow}>
              <Text style={styles.examCodeText}>{item.code || 'EXAM'}</Text>
              <StatusBadge status={item.type || 'CODING'} size="small" />
              {item.difficulty ? (
                <View style={[styles.diffBadge, item.difficulty === 'ADVANCED' ? styles.diffHard : styles.diffNormal]}>
                  <Text style={styles.diffText}>{item.difficulty}</Text>
                </View>
              ) : null}
              {item.organization ? (
                <View style={styles.orgBadge}>
                  <Text style={styles.orgBadgeText}>{item.organization}</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.examTitleLarge}>{item.title}</Text>
          </View>
          <StatusBadge status={status === 'EXPIRED' ? 'COMPLETED' : status} />
        </View>

        {/* Full Details Meta: Duration, Questions, Marks, Pass Percentage */}
        <View style={styles.fullMetaGrid}>
          <View style={styles.fullMetaItem}>
            <MaterialCommunityIcons name="clock-outline" size={13} color={colors.primary} />
            <Text style={styles.fullMetaText}>{item.duration || 60} Mins</Text>
          </View>
          <View style={styles.fullMetaItem}>
            <MaterialCommunityIcons name="help-circle-outline" size={13} color={colors.primary} />
            <Text style={styles.fullMetaText}>{questionCount} Questions</Text>
          </View>
          <View style={styles.fullMetaItem}>
            <MaterialCommunityIcons name="trophy-outline" size={13} color={colors.primary} />
            <Text style={styles.fullMetaText}>{item.totalMarks || 100} Marks</Text>
          </View>
          <View style={styles.fullMetaItem}>
            <MaterialCommunityIcons name="percent-outline" size={13} color={colors.primary} />
            <Text style={styles.fullMetaText}>Pass: {item.passingMarks || item.passingPercentage || 60}</Text>
          </View>
        </View>

        {/* Schedule */}
        <View style={styles.scheduleRow}>
          <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
          <Text style={styles.scheduleText} numberOfLines={1}>
            {startDateFormatted} ➔ {endDateFormatted}
          </Text>
        </View>

        {/* Security & Proctoring Controls */}
        <View style={styles.secBadgeRow}>
          <View style={styles.secChip}>
            <MaterialCommunityIcons name="shield-alert-outline" size={11} color={colors.warning} />
            <Text style={styles.secChipText}>Violations: {item.maxViolations || 5} max</Text>
          </View>
          {item.restrictToLaptop ? (
            <View style={styles.secChip}>
              <MaterialCommunityIcons name="laptop" size={11} color={colors.primary} />
              <Text style={styles.secChipText}>Laptop Only</Text>
            </View>
          ) : null}
          <View style={styles.secChip}>
            <MaterialCommunityIcons
              name="code-braces"
              size={11}
              color={item.allowCodeRun ? colors.success : colors.textMuted}
            />
            <Text style={styles.secChipText}>
              Code Run: {item.allowCodeRun ? 'Allowed' : 'Off'}
            </Text>
          </View>
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

        {/* Exam Card Footer Actions */}
        <View style={styles.examCardFooter}>
          <TouchableOpacity
            style={styles.specBtn}
            onPress={() => setInspectingExam(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="information-circle-outline" size={15} color={colors.primary} />
            <Text style={styles.specBtnText}>Exam Specs</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.drilldownPrompt}
            onPress={() => handleSelectExam(item)}
            activeOpacity={0.8}
          >
            <Text style={styles.drilldownPromptText}>Inspect Results</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }

  // Helper 2: Candidate Result Card Renderer (Drilled-down Level 2)
  function renderCandidateResultCard({ item }) {
    const candidateName = item.userId?.name || item.userName || 'Anonymous Candidate';
    const roll = item.userId?.rollNumber || item.userId?.studentId || 'ID N/A';
    const email = item.userId?.email || '';
    const phone = item.userId?.phone || '';
    const gender = item.userId?.gender || item.gender || '';
    const examName = item.examId?.title || item.examTitle || 'Assessment';
    const passingMarks = item.examId?.passingMarks || item.examId?.passingPercentage || 0;
    const totalMarks = item.maxScore || item.examId?.totalMarks || 100;
    const status = (item.resultStatus || item.status || 'SUBMITTED').toUpperCase();
    const violations = item.violationCount !== undefined ? item.violationCount : (item.violationsCount || (item.violations?.length || 0));
    const isOngoing = status === 'IN_PROGRESS' || status === 'ONGOING';

    const score = isOngoing
      ? 'Ongoing'
      : item.percentage !== undefined
      ? `${item.percentage}%`
      : item.totalScore !== undefined
      ? `${item.totalScore}/${totalMarks}`
      : '--';

    const batch = item.userId?.batch || item.batch || '';
    const tech = item.userId?.technology || item.technology || '';
    const org = item.userId?.organization || item.organization || '';

    // Duration calculation
    let durationTaken = null;
    if (item.startedAt && item.submittedAt) {
      const diffMs = new Date(item.submittedAt).getTime() - new Date(item.startedAt).getTime();
      if (diffMs > 0) {
        const totalSec = Math.floor(diffMs / 1000);
        const mins = Math.floor(totalSec / 60);
        const secs = totalSec % 60;
        durationTaken = `${mins}m ${secs}s`;
      }
    }

    return (
      <View style={[styles.card, shadows.sm]}>
        {/* Top Header */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <View style={styles.candidateRow}>
              <Text style={styles.candidateName}>{candidateName}</Text>
              <Text style={styles.rollBadge}>{roll}</Text>
            </View>
            {email ? <Text style={styles.emailSubtext}>{email}{phone ? ` • ${phone}` : ''}</Text> : null}
            {isAllView ? <Text style={styles.examTitleText} numberOfLines={1}>{examName}</Text> : null}
            {item.totalScore !== undefined && !isOngoing ? (
              <Text style={styles.marksSubtext}>
                Scored {item.totalScore} / {totalMarks} Marks {passingMarks > 0 ? `(Pass Mark: ${passingMarks})` : ''}
              </Text>
            ) : null}
          </View>
          <View style={styles.scorePill}>
            <Text
              style={[
                styles.scoreText,
                { color: status === 'PASS' ? colors.success : status === 'FAIL' || status === 'TERMINATED' ? colors.danger : colors.primary },
              ]}
            >
              {score}
            </Text>
            <StatusBadge status={status} size="small" />
          </View>
        </View>

        {/* Profile Chips */}
        {(org || batch || tech || gender) ? (
          <View style={styles.infoMetaRow}>
            {org ? (
              <View style={styles.metaChip}>
                <MaterialCommunityIcons name="domain" size={11} color={colors.primary} />
                <Text style={styles.metaChipText}>{org}</Text>
              </View>
            ) : null}
            {batch ? (
              <View style={styles.metaChip}>
                <MaterialCommunityIcons name="folder-account-outline" size={11} color={colors.primary} />
                <Text style={styles.metaChipText}>{batch}</Text>
              </View>
            ) : null}
            {tech ? (
              <View style={styles.metaChip}>
                <MaterialCommunityIcons name="code-tags" size={11} color={colors.textSecondary} />
                <Text style={styles.metaChipText}>{tech}</Text>
              </View>
            ) : null}
            {gender ? (
              <View style={styles.metaChip}>
                <Ionicons name="person-outline" size={11} color={colors.textSecondary} />
                <Text style={styles.metaChipText}>{gender}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Telemetry Bar */}
        <View style={styles.telemetryBar}>
          {violations > 0 ? (
            <View style={styles.violationTag}>
              <Ionicons name="warning" size={12} color={colors.violation} />
              <Text style={styles.violationText}>{violations} Violations</Text>
            </View>
          ) : (
            <View style={styles.cleanTag}>
              <Ionicons name="shield-checkmark" size={12} color={colors.success} />
              <Text style={styles.cleanText}>Clean Session</Text>
            </View>
          )}

          <Text style={styles.dateText}>
            {durationTaken ? `${durationTaken} • ` : ''}{item.submittedAt ? new Date(item.submittedAt).toLocaleDateString() : 'Recent'}
          </Text>
        </View>

        {/* Action Controls */}
        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={styles.detailsBtn}
            onPress={() => setSelectedAttemptId(item._id)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="chart-box-outline" size={15} color={colors.primary} />
            <Text style={styles.detailsBtnText}>Inspect Breakdown</Text>
          </TouchableOpacity>

          <View style={styles.secondaryActions}>
            <TouchableOpacity
              style={styles.exportCardBtn}
              onPress={() => downloadResultsExcel({ attemptIds: item._id })}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="file-excel-box" size={13} color="#047857" />
              <Text style={styles.exportCardBtnText}>Excel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.retakeBtn}
              onPress={() => handleAllowRetake(item)}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh" size={12} color={colors.textSecondary} />
              <Text style={styles.retakeBtnText}>Retake</Text>
            </TouchableOpacity>

            {isOngoing ? (
              <TouchableOpacity
                style={styles.terminateBtn}
                onPress={() => handleTerminate(item)}
                activeOpacity={0.7}
              >
                <Ionicons name="stop-circle" size={12} color={colors.danger} />
                <Text style={styles.terminateBtnText}>Terminate</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    );
  }

  // Helper 3: Exam Specification Full Dossier Modal
  function renderExamSpecModal() {
    if (!inspectingExam) return null;

    const status = getComputedExamStatus(inspectingExam);
    const startFormatted = inspectingExam.startDate
      ? new Date(inspectingExam.startDate).toLocaleString()
      : 'Flexible Schedule';
    const endFormatted = inspectingExam.endDate
      ? new Date(inspectingExam.endDate).toLocaleString()
      : 'Open Ended';

    const questionsList = inspectingExam.questions || [];
    const questionCount =
      questionsList.length +
      (inspectingExam.codingQuestions?.length || 0) +
      (inspectingExam.mcqQuestions?.length || 0);

    const targetBatches = Array.isArray(inspectingExam.targetBatches) ? inspectingExam.targetBatches : [];
    const targetTechs = [
      ...(Array.isArray(inspectingExam.targetTechnologies) ? inspectingExam.targetTechnologies : []),
      inspectingExam.technology,
    ].filter(Boolean);

    return (
      <Modal
        visible={!!inspectingExam}
        animationType="slide"
        transparent={true}
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
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 4, alignItems: 'center' }}>
                  <StatusBadge status={status === 'EXPIRED' ? 'COMPLETED' : status} size="small" />
                  <StatusBadge status={inspectingExam.type || 'CODING'} size="small" />
                  {inspectingExam.difficulty ? (
                    <View style={[styles.diffBadge, inspectingExam.difficulty === 'ADVANCED' ? styles.diffHard : styles.diffNormal]}>
                      <Text style={styles.diffText}>{inspectingExam.difficulty}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <TouchableOpacity onPress={() => setInspectingExam(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{ paddingBottom: 30 }}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
            >
              {/* Primary Specs Grid */}
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
                  <Text style={styles.inspectValue}>
                    {inspectingExam.passingMarks || inspectingExam.passingPercentage || 60} Marks
                  </Text>
                </View>
                <View style={styles.inspectInfoRow}>
                  <Text style={styles.inspectLabel}>Total Questions</Text>
                  <Text style={styles.inspectValue}>{questionCount} Questions</Text>
                </View>
                <View style={styles.inspectInfoRow}>
                  <Text style={styles.inspectLabel}>Start Window</Text>
                  <Text style={styles.inspectValue}>{startFormatted}</Text>
                </View>
                <View style={styles.inspectInfoRow}>
                  <Text style={styles.inspectLabel}>End Window</Text>
                  <Text style={styles.inspectValue}>{endFormatted}</Text>
                </View>
              </View>

              {/* Target Batches & Technologies */}
              {(targetBatches.length > 0 || targetTechs.length > 0) ? (
                <View style={{ marginTop: 14 }}>
                  <Text style={styles.modalSectionTitle}>Target Audience & Tech Stack</Text>
                  <View style={styles.cohortRow}>
                    {targetBatches.map((b, bi) => (
                      <View key={bi} style={styles.cohortBadge}>
                        <MaterialCommunityIcons name="folder-account-outline" size={12} color={colors.primary} />
                        <Text style={styles.cohortBadgeText}>{b}</Text>
                      </View>
                    ))}
                    {targetTechs.map((t, ti) => (
                      <View key={ti} style={styles.techBadge}>
                        <MaterialCommunityIcons name="code-tags" size={12} color={colors.textSecondary} />
                        <Text style={styles.techBadgeText}>{t}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              {/* Security & Anti-Cheat Controls */}
              <Text style={styles.modalSectionTitle}>Security & Anti-Cheat Parameters</Text>
              <View style={styles.securityBox}>
                <View style={styles.secRow}>
                  <Text style={styles.secLabel}>Max Tab Switches / Violations</Text>
                  <Text style={styles.secValue}>
                    {inspectingExam.securitySettings?.maxTabSwitches || inspectingExam.maxViolations || 5} Violations Max
                  </Text>
                </View>
                <View style={styles.secRow}>
                  <Text style={styles.secLabel}>Device Enforcement</Text>
                  <Text style={[styles.secStatus, { color: inspectingExam.restrictToLaptop ? colors.primary : colors.textSecondary }]}>
                    {inspectingExam.restrictToLaptop ? 'LAPTOP REQUIRED' : 'ANY DEVICE'}
                  </Text>
                </View>
                <View style={styles.secRow}>
                  <Text style={styles.secLabel}>Code Run During Exam</Text>
                  <Text style={[styles.secStatus, { color: inspectingExam.allowCodeRun ? colors.success : colors.textMuted }]}>
                    {inspectingExam.allowCodeRun ? 'PERMITTED' : 'DISABLED'}
                  </Text>
                </View>
                <View style={styles.secRow}>
                  <Text style={styles.secLabel}>Question Order Randomization</Text>
                  <Text style={[styles.secStatus, { color: inspectingExam.randomizeQuestions ? colors.success : colors.textMuted }]}>
                    {inspectingExam.randomizeQuestions ? 'ENABLED' : 'DISABLED'}
                  </Text>
                </View>
                <View style={styles.secRow}>
                  <Text style={styles.secLabel}>Webcam Proctoring</Text>
                  <Text style={[styles.secStatus, { color: inspectingExam.securitySettings?.enableProctoring ? colors.success : colors.textMuted }]}>
                    {inspectingExam.securitySettings?.enableProctoring ? 'ENABLED' : 'DISABLED'}
                  </Text>
                </View>
              </View>

              {/* Description / Instructions */}
              {(inspectingExam.description || inspectingExam.instructions) ? (
                <View style={{ marginTop: 14 }}>
                  <Text style={styles.modalSectionTitle}>Instructions & Guidelines</Text>
                  <Text style={styles.descriptionText}>
                    {inspectingExam.description || inspectingExam.instructions}
                  </Text>
                </View>
              ) : null}

              {/* Attached Problems */}
              {questionsList.length > 0 ? (
                <View style={{ marginTop: 14 }}>
                  <Text style={styles.modalSectionTitle}>
                    Attached Assessment Problems ({questionsList.length})
                  </Text>
                  {questionsList.map((qItem, i) => {
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
                </View>
              ) : null}

              {/* Action Button: Drilldown into Submissions */}
              <TouchableOpacity
                style={styles.modalDrilldownBtn}
                onPress={() => {
                  const target = inspectingExam;
                  setInspectingExam(null);
                  handleSelectExam(target);
                }}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="trophy-outline" size={18} color="#FFFFFF" />
                <Text style={styles.modalDrilldownBtnText}>Inspect Candidate Results for this Exam</Text>
              </TouchableOpacity>
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
  examTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 10,
  },
  allSubmissionsBtn: {
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
  allSubmissionsBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  examStatusTabsRow: {
    paddingVertical: 8,
  },
  statusTabChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 6,
  },
  statusTabChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusTabChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  statusTabChipTextActive: {
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
  examCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  examCardHeader: {
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
  examCodeText: {
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
  examTitleLarge: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  fullMetaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  fullMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fullMetaText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
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
  examCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  drilldownPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  drilldownPromptText: {
    fontSize: 11,
    fontWeight: '800',
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
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  drilldownSub: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  exportExcelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 4,
  },
  exportExcelBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#047857',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  outcomePillsRow: {
    paddingBottom: 8,
  },
  outcomeChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 6,
  },
  outcomeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  outcomeChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  outcomeChipTextActive: {
    color: colors.textInverse,
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  candidateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  candidateName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  rollBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontFamily: 'monospace',
  },
  emailSubtext: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  examTitleText: {
    fontSize: 11,
    color: colors.textPrimary,
    fontWeight: '600',
    marginTop: 2,
  },
  marksSubtext: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  scorePill: {
    alignItems: 'flex-end',
    gap: 4,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  infoMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  metaChip: {
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
  metaChipText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  telemetryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  violationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  violationText: {
    fontSize: 11,
    color: colors.violation,
    fontWeight: '700',
  },
  cleanTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cleanText: {
    fontSize: 11,
    color: colors.success,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  detailsBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  secondaryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  exportCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 3,
  },
  exportCardBtnText: {
    fontSize: 11,
    color: '#047857',
    fontWeight: '700',
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  retakeBtnText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  terminateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    backgroundColor: colors.dangerLight,
  },
  terminateBtnText: {
    fontSize: 11,
    color: colors.danger,
    fontWeight: '700',
  },
  diffBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  diffNormal: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  diffHard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  diffText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primary,
  },
  secBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  secChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  secChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  specBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  specBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  drilldownSpecBtn: {
    padding: 2,
  },
  modalOverlay: {
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
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  inspectInfoCard: {
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 8,
  },
  inspectInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inspectLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  inspectValue: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  modalSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 12,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  descriptionText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    backgroundColor: colors.background,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  securityBox: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 6,
  },
  secRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
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
    gap: 10,
    backgroundColor: colors.background,
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  attachedQNum: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
    backgroundColor: colors.primaryLight,
    width: 28,
    height: 28,
    borderRadius: 14,
    textAlign: 'center',
    textAlignVertical: 'center',
    lineHeight: 28,
  },
  attachedQTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  attachedQMeta: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  modalDrilldownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 20,
    marginBottom: 10,
  },
  modalDrilldownBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
