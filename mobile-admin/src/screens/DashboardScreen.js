import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../theme/colors';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Header from '../components/common/Header';
import StatCard from '../components/common/StatCard';
import StatusBadge from '../components/common/StatusBadge';

export default function DashboardScreen({ onNavigateTab }) {
  const { isSuperAdmin } = useAuth();
  const [data, setData] = useState(null);
  const [recentAttempts, setRecentAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    try {
      const [analyticsRes, resultsRes] = await Promise.allSettled([
        api.get('/admin/analytics'),
        api.get('/admin/results?page=1&limit=6'),
      ]);

      if (analyticsRes.status === 'fulfilled') {
        const payload = analyticsRes.value?.data || analyticsRes.value || null;
        if (payload) setData(payload);
      }

      if (resultsRes.status === 'fulfilled') {
        const rData = resultsRes.value?.data || resultsRes.value || {};
        const list = rData.results || rData.attempts || (Array.isArray(rData) ? rData : []);
        setRecentAttempts(Array.isArray(list) ? list : []);
      }
    } catch (err) {
      console.warn('Failed to fetch analytics', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  const stats = data?.stats || {
    totalUsers: 0,
    totalFaculty: 0,
    totalBatches: 0,
    totalTechnologies: 0,
    totalOrganizations: 0,
    totalExams: 0,
    activeExams: 0,
    totalSubmissions: 0,
    totalAttempts: 0,
    averageScore: 0,
    passRate: 0,
    passedCount: 0,
    failedCount: 0,
    totalViolations: 0,
  };

  const totalEvaluated = (stats.passedCount || 0) + (stats.failedCount || 0);
  const passPercent = totalEvaluated > 0
    ? Math.round((stats.passedCount / totalEvaluated) * 100)
    : (stats.passRate || 0);

  const topExams = Array.isArray(data?.topExams) ? data.topExams : [];
  const languageData = Array.isArray(data?.languageDistribution) ? data.languageDistribution : [];
  const batchData = Array.isArray(data?.batchPerformance) ? data.batchPerformance : [];

  return (
    <View style={styles.container}>
      <Header />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Executive Header Banner */}
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>
            {isSuperAdmin ? 'Institutional Telemetry & Analytics' : 'Faculty Command Dashboard'}
          </Text>
          <Text style={styles.bannerSubtitle}>
            Real-time evaluation outcomes, candidate score distributions, and anti-cheat supervision
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Synthesizing platform telemetry...</Text>
          </View>
        ) : (
          <>
            {/* Quick Action Navigation Buttons */}
            <View style={styles.quickActionsRow}>
              <TouchableOpacity
                style={[styles.quickActionBtn, { backgroundColor: colors.primary }]}
                onPress={() => onNavigateTab ? onNavigateTab('Results') : null}
                activeOpacity={0.8}
              >
                <Ionicons name="trophy-outline" size={15} color={colors.textInverse} />
                <Text style={styles.quickActionText}>View Results</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickActionBtn, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
                onPress={() => onNavigateTab ? onNavigateTab('Students') : null}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="account-group" size={15} color={colors.primary} />
                <Text style={[styles.quickActionText, { color: colors.textPrimary }]}>Candidates</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickActionBtn, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
                onPress={() => onNavigateTab ? onNavigateTab('Faculty') : null}
                activeOpacity={0.8}
              >
                <Ionicons name="school-outline" size={15} color={colors.primary} />
                <Text style={[styles.quickActionText, { color: colors.textPrimary }]}>Faculty</Text>
              </TouchableOpacity>
            </View>

            {/* Performance KPI Cards Grid */}
            <Text style={styles.sectionHeader}>Evaluation Performance</Text>
            <View style={styles.grid}>
              <StatCard
                title="Pass Rate"
                value={`${passPercent}%`}
                sublabel={`${stats.passedCount} Pass • ${stats.failedCount} Fail`}
                icon="seal"
                iconColor={passPercent >= 60 ? colors.success : colors.warning}
                badgeText={passPercent >= 60 ? 'HEALTHY' : 'NEEDS ATTENTION'}
                badgeColor={passPercent >= 60 ? colors.success : colors.warning}
              />
              <StatCard
                title="Average Score"
                value={`${Math.round(stats.averageScore || 0)}%`}
                sublabel="Cohort average score"
                icon="trending-up"
                iconColor="#3B82F6"
              />
            </View>

            <View style={styles.grid}>
              <StatCard
                title="Total Attempts"
                value={stats.totalAttempts || stats.totalSubmissions || 0}
                sublabel="Submitted assessments"
                icon="send-check-outline"
                iconColor="#10B981"
              />
              <StatCard
                title="Violations"
                value={stats.totalViolations || 0}
                sublabel="Proctoring events"
                icon="shield-alert-outline"
                iconColor={colors.danger}
                badgeText={stats.totalViolations > 0 ? 'LOGGED' : 'CLEAN'}
                badgeColor={stats.totalViolations > 0 ? colors.danger : colors.success}
              />
            </View>

            {/* Platform Scope Grid */}
            <Text style={[styles.sectionHeader, { marginTop: 14 }]}>Institutional Scope</Text>
            <View style={styles.grid}>
              <StatCard
                title="Candidates"
                value={stats.totalUsers}
                sublabel="Enrolled students"
                icon="account-group"
                iconColor="#6366F1"
              />
              <StatCard
                title="Assessments"
                value={stats.totalExams}
                sublabel={`${stats.activeExams} Active now`}
                icon="file-document-edit-outline"
                iconColor="#8B5CF6"
                badgeText={stats.activeExams > 0 ? `${stats.activeExams} ACTIVE` : null}
                badgeColor={colors.success}
              />
            </View>

            <View style={styles.grid}>
              <StatCard
                title="Cohorts"
                value={stats.totalBatches}
                sublabel="Active student batches"
                icon="folder-account-outline"
                iconColor="#06B6D4"
              />
              <StatCard
                title="Instructors"
                value={stats.totalFaculty}
                sublabel="Verified faculty"
                icon="school-outline"
                iconColor="#14B8A6"
              />
            </View>

            {/* Evaluation Outcomes Visual Bar */}
            <View style={[styles.telemetryCard, shadows.sm]}>
              <View style={styles.telemetryHeader}>
                <Text style={styles.telemetryTitle}>Evaluation Outcomes Ratio</Text>
                <Text style={styles.telemetryStatText}>{passPercent}% Pass Rate</Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarPassed,
                    { flex: Math.max(stats.passedCount, 1) },
                  ]}
                />
                <View
                  style={[
                    styles.progressBarFailed,
                    { flex: Math.max(stats.failedCount, 1) },
                  ]}
                />
              </View>
              <View style={styles.progressLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
                  <Text style={styles.legendText}>Passed: {stats.passedCount}</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
                  <Text style={styles.legendText}>Failed: {stats.failedCount}</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                  <Text style={styles.legendText}>Total: {totalEvaluated}</Text>
                </View>
              </View>
            </View>

            {/* Top Examinations Performance */}
            {topExams.length > 0 ? (
              <View style={[styles.telemetryCard, shadows.sm, { marginTop: 14 }]}>
                <View style={styles.telemetryHeader}>
                  <Text style={styles.telemetryTitle}>Top Performing Examinations</Text>
                  <TouchableOpacity onPress={() => onNavigateTab ? onNavigateTab('Results') : null}>
                    <Text style={styles.viewMoreLink}>Inspect All ➔</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ gap: 8, marginTop: 4 }}>
                  {topExams.slice(0, 4).map((ex, exIdx) => {
                    const avg = Math.round(ex.avgScore || 0);
                    return (
                      <View key={ex.examId || exIdx} style={styles.topExamRow}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={styles.topExamTitle} numberOfLines={1}>{ex.title}</Text>
                          <Text style={styles.topExamMeta}>
                            {ex.attempts} attempts • {ex.passed || 0} passed / {ex.failed || 0} failed
                          </Text>
                        </View>
                        <View style={styles.topExamScoreBox}>
                          <Text style={[styles.topExamScoreText, { color: avg >= 60 ? colors.success : colors.primary }]}>
                            {avg}%
                          </Text>
                          <Text style={styles.topExamScoreLabel}>Avg Score</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {/* Languages Breakdown */}
            {languageData.length > 0 ? (
              <View style={[styles.telemetryCard, shadows.sm, { marginTop: 14 }]}>
                <Text style={styles.telemetryTitle}>Submissions by Language Track</Text>
                <View style={styles.langRow}>
                  {languageData.map((lang, idx) => (
                    <View key={idx} style={styles.langChip}>
                      <Text style={styles.langName}>{(lang.language || '').toUpperCase()}</Text>
                      <Text style={styles.langCount}>{lang.count}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Recent Candidate Submissions & Scores */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeader}>Recent Candidate Evaluations</Text>
              <TouchableOpacity onPress={() => onNavigateTab ? onNavigateTab('Results') : null}>
                <Text style={styles.seeAllText}>Analyse All</Text>
              </TouchableOpacity>
            </View>

            {recentAttempts.length === 0 ? (
              <View style={[styles.emptyBox, shadows.sm]}>
                <Text style={styles.emptyBoxText}>No candidate attempts recorded yet.</Text>
              </View>
            ) : (
              recentAttempts.slice(0, 6).map((att, index) => {
                const candidateName = att.userId?.name || att.userName || 'Candidate';
                const roll = att.userId?.rollNumber || att.userId?.studentId || '';
                const examTitle = att.examId?.title || att.examTitle || 'Assessment';
                const status = (att.resultStatus || att.status || 'SUBMITTED').toUpperCase();
                const isOngoing = status === 'IN_PROGRESS' || status === 'ONGOING';
                const violations = att.violationCount !== undefined ? att.violationCount : (att.violations?.length || 0);

                // Accurate Score Display - NEVER show Pending when evaluated!
                let scoreDisplay = '--';
                if (isOngoing) {
                  scoreDisplay = 'In Progress';
                } else if (att.percentage !== undefined && att.percentage !== null) {
                  scoreDisplay = `${att.percentage}%`;
                } else if (att.totalScore !== undefined && att.totalScore !== null) {
                  scoreDisplay = `${att.totalScore}/${att.maxScore || 100}`;
                } else {
                  scoreDisplay = status;
                }

                return (
                  <TouchableOpacity
                    key={att._id || index}
                    style={[styles.submissionCard, shadows.sm]}
                    onPress={() => onNavigateTab ? onNavigateTab('Results') : null}
                    activeOpacity={0.8}
                  >
                    <View style={styles.submissionHeader}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.candidateName}>{candidateName}</Text>
                          {roll ? <Text style={styles.candidateRollBadge}>{roll}</Text> : null}
                        </View>
                        <Text style={styles.examTitleText} numberOfLines={1}>{examTitle}</Text>
                      </View>
                      <StatusBadge status={status} size="small" />
                    </View>

                    <View style={styles.submissionFooter}>
                      <View style={styles.scoreRow}>
                        <Text style={styles.submissionDetail}>Score: </Text>
                        <Text
                          style={[
                            styles.boldDetail,
                            { color: status === 'PASS' ? colors.success : status === 'FAIL' || status === 'TERMINATED' ? colors.danger : colors.primary },
                          ]}
                        >
                          {scoreDisplay}
                        </Text>
                        {att.totalScore !== undefined && !isOngoing ? (
                          <Text style={styles.marksDetailText}>
                            ({att.totalScore}/{att.maxScore || 100} Marks)
                          </Text>
                        ) : null}
                      </View>

                      {violations > 0 ? (
                        <View style={styles.violationTag}>
                          <Ionicons name="warning-outline" size={12} color={colors.violation} />
                          <Text style={styles.violationTagText}>{violations} Violations</Text>
                        </View>
                      ) : (
                        <Text style={styles.cleanTag}>Clean Session</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </>
        )}
      </ScrollView>
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
  banner: {
    marginBottom: 14,
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.4,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 3,
    lineHeight: 17,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 12,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 5,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textInverse,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 8,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  viewMoreLink: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  grid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  telemetryCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginTop: 4,
  },
  telemetryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  telemetryTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  telemetryStatText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
  },
  progressBarTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.borderLight,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  progressBarPassed: {
    backgroundColor: colors.success,
  },
  progressBarFailed: {
    backgroundColor: colors.danger,
  },
  progressLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  topExamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  topExamTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  topExamMeta: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  topExamScoreBox: {
    alignItems: 'flex-end',
  },
  topExamScoreText: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  topExamScoreLabel: {
    fontSize: 9,
    color: colors.textMuted,
  },
  langRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  langChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
  },
  langName: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  langCount: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
  submissionCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  submissionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  candidateName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  candidateRollBadge: {
    fontSize: 10,
    color: colors.primary,
    fontFamily: 'monospace',
    fontWeight: '700',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  examTitleText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  submissionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submissionDetail: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  boldDetail: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  marksDetailText: {
    fontSize: 10,
    color: colors.textMuted,
    marginLeft: 4,
  },
  violationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  violationTagText: {
    fontSize: 10,
    color: colors.violation,
    fontWeight: '700',
  },
  cleanTag: {
    fontSize: 10,
    color: colors.success,
    fontWeight: '700',
  },
  emptyBox: {
    padding: 24,
    backgroundColor: colors.surface,
    borderRadius: 14,
    alignItems: 'center',
  },
  emptyBoxText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
