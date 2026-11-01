import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, shadows } from '../theme/colors';
import { api } from '../api/client';
import StatusBadge from '../components/common/StatusBadge';
import { downloadResultsExcel, shareSubmissionDossier } from '../utils/exportUtils';

export default function ResultDetailModal({ visible, attemptId, onClose, onRefreshList }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retakeLoading, setRetakeLoading] = useState(false);

  useEffect(() => {
    if (visible && attemptId) {
      loadDetails();
    } else {
      setResult(null);
    }
  }, [visible, attemptId]);

  const loadDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/results/${attemptId}`);
      setResult(res?.data || res || null);
    } catch (e) {
      console.warn('Failed to load result details', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAllowRetake = () => {
    Alert.alert(
      'Allow Examination Retake',
      'Are you sure you want to grant a retake for this candidate? Their current attempt evaluation will be reset to permit a new submission session.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Grant Retake',
          onPress: async () => {
            setRetakeLoading(true);
            try {
              await api.post(`/admin/results/${attemptId}/allow-retake`);
              Alert.alert('Retake Granted', 'The candidate has been permitted to retake this assessment.');
              if (onRefreshList) onRefreshList();
              onClose();
            } catch (err) {
              Alert.alert('Retake Error', err.message || 'Failed to grant retake permission.');
            } finally {
              setRetakeLoading(false);
            }
          },
        },
      ]
    );
  };

  const attempt = result?.attempt || result || {};
  const candidate = attempt.user || attempt.userId || {};
  const exam = attempt.exam || attempt.examId || {};
  const questions = result?.questionBreakdown || attempt.questionBreakdown || result?.submissions || [];
  const events = attempt.events || attempt.violations || [];
  const violationCount = attempt.violationCount !== undefined ? attempt.violationCount : events.length;

  // Duration calculation
  let durationFormatted = '--';
  if (attempt.startedAt && attempt.submittedAt) {
    const diffMs = new Date(attempt.submittedAt).getTime() - new Date(attempt.startedAt).getTime();
    if (diffMs > 0) {
      const totalSec = Math.floor(diffMs / 1000);
      const mins = Math.floor(totalSec / 60);
      const secs = totalSec % 60;
      durationFormatted = `${mins}m ${secs}s`;
    }
  } else if (exam.duration) {
    durationFormatted = `${exam.duration}m limit`;
  }

  const scoreText = attempt.percentage !== undefined
    ? `${attempt.percentage}%`
    : attempt.totalScore !== undefined
    ? `${attempt.totalScore}/${attempt.maxScore || 100}`
    : '--';

  const marksScoredText = attempt.totalScore !== undefined
    ? `${attempt.totalScore} / ${attempt.maxScore || exam.totalMarks || 100}`
    : '--';

  const outcomeStatus = (attempt.resultStatus || attempt.status || 'SUBMITTED').toUpperCase();
  const isOngoing = outcomeStatus === 'IN_PROGRESS' || outcomeStatus === 'ONGOING';

  return (
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
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.title}>Submission Assessment Details</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {exam.title || 'Examination Evaluation Dossier'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Fetching candidate submission telemetry...</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.content}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{ paddingBottom: 40 }}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
            >
              {/* Executive Action Toolbar */}
              <View style={styles.actionToolbar}>
                <TouchableOpacity
                  style={[styles.toolBtn, styles.downloadBtn]}
                  onPress={() => downloadResultsExcel({ attemptIds: attemptId })}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="file-excel-box" size={16} color="#047857" />
                  <Text style={[styles.toolBtnText, { color: '#047857' }]}>Download Excel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.toolBtn, styles.shareBtn]}
                  onPress={() => shareSubmissionDossier({ attempt, candidate, exam, questions })}
                  activeOpacity={0.7}
                >
                  <Ionicons name="share-social-outline" size={15} color={colors.primary} />
                  <Text style={[styles.toolBtnText, { color: colors.primary }]}>Share Dossier</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.toolBtn, styles.retakeBtn]}
                  onPress={handleAllowRetake}
                  disabled={retakeLoading}
                  activeOpacity={0.7}
                >
                  {retakeLoading ? (
                    <ActivityIndicator size="small" color={colors.warning} />
                  ) : (
                    <>
                      <Ionicons name="refresh" size={15} color={colors.warning} />
                      <Text style={[styles.toolBtnText, { color: colors.warning }]}>Allow Retake</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Candidate Info Card with all profile fields */}
              <View style={[styles.infoCard, shadows.sm]}>
                <View style={styles.candidateHeader}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{String(candidate.name || 'C').charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.candidateName}>{candidate.name || 'Candidate'}</Text>
                    <Text style={styles.candidateRoll}>{candidate.rollNumber || candidate.studentId || 'ID N/A'}</Text>
                    <Text style={styles.candidateEmail}>{candidate.email || '--'}</Text>
                  </View>
                  <StatusBadge status={outcomeStatus} />
                </View>

                {/* Candidate Secondary Profile Fields */}
                <View style={styles.profileDetailsRow}>
                  {candidate.organization ? (
                    <View style={styles.profileDetailChip}>
                      <MaterialCommunityIcons name="domain" size={13} color={colors.primary} />
                      <Text style={styles.profileDetailText}>{candidate.organization}</Text>
                    </View>
                  ) : null}

                  {candidate.technology ? (
                    <View style={styles.profileDetailChip}>
                      <MaterialCommunityIcons name="code-tags" size={13} color={colors.textSecondary} />
                      <Text style={styles.profileDetailText}>{candidate.technology}</Text>
                    </View>
                  ) : null}

                  {candidate.batch ? (
                    <View style={styles.profileDetailChip}>
                      <MaterialCommunityIcons name="folder-account-outline" size={13} color={colors.textSecondary} />
                      <Text style={styles.profileDetailText}>{candidate.batch}</Text>
                    </View>
                  ) : null}

                  {candidate.phone ? (
                    <View style={styles.profileDetailChip}>
                      <Ionicons name="call-outline" size={13} color={colors.textSecondary} />
                      <Text style={styles.profileDetailText}>{candidate.phone}</Text>
                    </View>
                  ) : null}

                  {candidate.gender ? (
                    <View style={styles.profileDetailChip}>
                      <Ionicons name="person-outline" size={13} color={colors.textSecondary} />
                      <Text style={styles.profileDetailText}>{candidate.gender}</Text>
                    </View>
                  ) : null}
                </View>

                {/* Key Assessment Telemetry Metrics */}
                <View style={styles.metricGrid}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Total Score</Text>
                    <Text style={[styles.metricValue, { color: outcomeStatus === 'PASS' ? colors.success : outcomeStatus === 'FAIL' || outcomeStatus === 'TERMINATED' ? colors.danger : colors.primary }]}>
                      {scoreText}
                    </Text>
                  </View>

                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Marks Scored</Text>
                    <Text style={styles.metricValue}>
                      {marksScoredText}
                    </Text>
                  </View>

                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Duration</Text>
                    <Text style={styles.metricValue}>
                      {durationFormatted}
                    </Text>
                  </View>

                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Violations</Text>
                    <Text
                      style={[
                        styles.metricValue,
                        { color: violationCount > 0 ? colors.danger : colors.success },
                      ]}
                    >
                      {violationCount}
                    </Text>
                  </View>
                </View>

                {/* Timing Telemetry Timestamps */}
                <View style={styles.timeAuditRow}>
                  <View style={styles.timeAuditItem}>
                    <Text style={styles.timeAuditLabel}>Started Session:</Text>
                    <Text style={styles.timeAuditValue}>
                      {attempt.startedAt ? new Date(attempt.startedAt).toLocaleString() : '--'}
                    </Text>
                  </View>
                  <View style={styles.timeAuditItem}>
                    <Text style={styles.timeAuditLabel}>Submitted Session:</Text>
                    <Text style={styles.timeAuditValue}>
                      {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString() : isOngoing ? 'Still Active' : '--'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Termination Reason Alert (if terminated) */}
              {attempt.terminationReason ? (
                <View style={styles.terminationBanner}>
                  <Ionicons name="ban" size={16} color={colors.danger} style={{ marginRight: 6 }} />
                  <Text style={styles.terminationText}>
                    Terminated: {attempt.terminationReason}
                  </Text>
                </View>
              ) : null}

              {/* Anti-Cheat Telemetry Audit */}
              <Text style={styles.sectionTitle}>Anti-Cheat Telemetry Audit</Text>
              {violationCount > 0 || events.length > 0 ? (
                <View style={styles.violationsBox}>
                  <View style={styles.violationAlertRow}>
                    <Ionicons name="warning" size={18} color={colors.danger} />
                    <Text style={styles.violationAlertText}>
                      Candidate triggered {violationCount || events.length} proctoring violations
                    </Text>
                  </View>
                  {events.length > 0 ? (
                    events.map((v, i) => {
                      const rawType = typeof v === 'string' ? v : (v?.type || 'Violation');
                      const typeLabel = typeof rawType === 'string' ? rawType.replace(/_/g, ' ').toUpperCase() : 'VIOLATION';
                      const timeStr = v?.timestamp ? new Date(v.timestamp).toLocaleTimeString() : `Violation #${i + 1}`;
                      const details = v?.details || '';
                      return (
                        <View key={i} style={styles.violationItem}>
                          <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={styles.violationType}>{typeLabel}</Text>
                            {details ? <Text style={styles.violationDetailsText}>{details}</Text> : null}
                          </View>
                          <Text style={styles.violationTime}>{timeStr}</Text>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={styles.violationSubNote}>
                      {violationCount} total violation count logged during active assessment session.
                    </Text>
                  )}
                </View>
              ) : (
                <View style={styles.cleanAuditBox}>
                  <Ionicons name="shield-checkmark" size={20} color={colors.success} style={{ marginRight: 8 }} />
                  <Text style={styles.cleanAuditText}>
                    Clean Session • No proctoring or fullscreen violations recorded.
                  </Text>
                </View>
              )}

              {/* Question Evaluation Breakdown */}
              <Text style={[styles.sectionTitle, { marginTop: 18 }]}>
                Problem Evaluation Breakdown ({questions.length})
              </Text>

              {questions.length === 0 ? (
                <View style={styles.emptySubmissions}>
                  <Text style={styles.emptySubText}>No question submission breakdown found for this attempt.</Text>
                </View>
              ) : (
                questions.map((q, index) => {
                  const title = q.questionTitle || q.title || (typeof q.questionId === 'object' ? q.questionId?.title : null) || `Question ${index + 1}`;
                  const isMcq = q.questionType === 'MCQ' || q.type === 'MCQ' || q.result?.questionType === 'MCQ';
                  const res = q.result || {};
                  const marks = res.score !== undefined ? res.score : (q.marksObtained !== undefined ? q.marksObtained : 0);
                  const maxMarks = q.maxMarks || (typeof q.questionId === 'object' ? q.questionId?.marks : null) || res.maxScore || 5;
                  const itemKey = typeof q.questionId === 'string' ? q.questionId : (q.questionId?._id || q._id || `q-${index}`);

                  if (isMcq) {
                    // ============================================
                    // MCQ VIEW: Strict Analytics & Correct Options
                    // ABSOLUTELY NO TEST CASES SHOWN HERE!
                    // ============================================
                    const options = Array.isArray(q.options) ? q.options : [];
                    const selectedOpt = q.selectedOption !== undefined && q.selectedOption !== null
                      ? Number(q.selectedOption)
                      : (res.selectedOption !== undefined && res.selectedOption !== null ? Number(res.selectedOption) : null);
                    const correctOpt = q.correctAnswer !== undefined && q.correctAnswer !== null ? Number(q.correctAnswer) : null;
                    const isPassed = res.status === 'PASSED' || res.isCorrect || (selectedOpt !== null && correctOpt !== null && selectedOpt === correctOpt);
                    const isAttempted = selectedOpt !== null && selectedOpt !== -1;

                    return (
                      <View key={itemKey} style={[styles.subCard, shadows.sm]}>
                        {/* MCQ Card Header */}
                        <View style={styles.subCardHeader}>
                          <View style={{ flex: 1, marginRight: 8 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={styles.subQNumber}>Question {index + 1}</Text>
                              <View style={styles.mcqPill}>
                                <Text style={styles.mcqPillText}>MULTIPLE CHOICE</Text>
                              </View>
                            </View>
                            <Text style={styles.subQTitle}>{title}</Text>
                          </View>
                          <View style={styles.subScorePill}>
                            <Text style={styles.subScoreText}>
                              {marks} / {maxMarks} Marks
                            </Text>
                          </View>
                        </View>

                        {/* MCQ Evaluation Status Pill */}
                        <View style={styles.mcqStatusRow}>
                          <View
                            style={[
                              styles.evalStatusBadge,
                              isPassed
                                ? styles.evalStatusPassed
                                : isAttempted
                                ? styles.evalStatusFailed
                                : styles.evalStatusNeutral,
                            ]}
                          >
                            <Ionicons
                              name={isPassed ? 'checkmark-circle' : isAttempted ? 'close-circle' : 'help-circle-outline'}
                              size={14}
                              color={isPassed ? colors.success : isAttempted ? colors.danger : colors.textSecondary}
                              style={{ marginRight: 4 }}
                            />
                            <Text
                              style={[
                                styles.evalStatusText,
                                { color: isPassed ? colors.success : isAttempted ? colors.danger : colors.textSecondary },
                              ]}
                            >
                              {isPassed
                                ? 'Correct Answer (+Full Marks)'
                                : isAttempted
                                ? 'Incorrect Answer (0 Marks)'
                                : 'Not Attempted (0 Marks)'}
                            </Text>
                          </View>
                        </View>

                        {/* MCQ Options List */}
                        {options.length > 0 ? (
                          <View style={styles.mcqOptionsContainer}>
                            <Text style={styles.mcqOptionsHeader}>Options & Evaluation Breakdown</Text>
                            {options.map((opt, oIdx) => {
                              const optText = typeof opt === 'string' ? opt : (opt.text || opt.title || `Option ${oIdx + 1}`);
                              const isSelected = selectedOpt === oIdx;
                              const isCorrect = correctOpt === oIdx;
                              const optionLetter = String.fromCharCode(65 + oIdx);

                              let cardStyle = styles.optionItemNeutral;
                              let letterCircleStyle = styles.letterCircleNeutral;
                              let letterTextStyle = styles.letterTextNeutral;

                              if (isCorrect) {
                                cardStyle = styles.optionItemCorrect;
                                letterCircleStyle = styles.letterCircleCorrect;
                                letterTextStyle = styles.letterTextCorrect;
                              } else if (isSelected && !isCorrect) {
                                cardStyle = styles.optionItemWrong;
                                letterCircleStyle = styles.letterCircleWrong;
                                letterTextStyle = styles.letterTextWrong;
                              }

                              return (
                                <View key={oIdx} style={[styles.optionItem, cardStyle]}>
                                  <View style={styles.optionLeft}>
                                    <View style={[styles.letterCircle, letterCircleStyle]}>
                                      <Text style={[styles.letterText, letterTextStyle]}>{optionLetter}</Text>
                                    </View>
                                    <Text style={[styles.optionText, isCorrect && { fontWeight: '700', color: '#065F46' }, isSelected && !isCorrect && { color: '#9F1239' }]}>
                                      {optText}
                                    </Text>
                                  </View>

                                  <View style={styles.optionBadgesCol}>
                                    {isCorrect ? (
                                      <View style={styles.correctBadge}>
                                        <Ionicons name="checkmark-done" size={11} color="#065F46" />
                                        <Text style={styles.correctBadgeText}>Correct Option</Text>
                                      </View>
                                    ) : null}

                                    {isSelected ? (
                                      <View style={[styles.selectedBadge, isCorrect ? styles.selectedBadgeGreen : styles.selectedBadgeRed]}>
                                        <Ionicons
                                          name={isCorrect ? 'checkmark' : 'close'}
                                          size={11}
                                          color={isCorrect ? '#065F46' : '#9F1239'}
                                        />
                                        <Text style={[styles.selectedBadgeText, { color: isCorrect ? '#065F46' : '#9F1239' }]}>
                                          Candidate Selection
                                        </Text>
                                      </View>
                                    ) : null}
                                  </View>
                                </View>
                              );
                            })}
                          </View>
                        ) : (
                          <View style={styles.noOptionsNotice}>
                            <Text style={styles.noOptionsText}>
                              Selected Option: {selectedOpt !== null ? `Option ${String.fromCharCode(65 + selectedOpt)}` : 'None'} • Correct Answer: {correctOpt !== null ? `Option ${String.fromCharCode(65 + correctOpt)}` : 'N/A'}
                            </Text>
                          </View>
                        )}

                        {/* Explanation / Rationale Box */}
                        {q.explanation ? (
                          <View style={styles.explanationBox}>
                            <View style={styles.explanationHeader}>
                              <Ionicons name="bulb-outline" size={14} color="#1D4ED8" />
                              <Text style={styles.explanationTitle}>Explanation / Rationale</Text>
                            </View>
                            <Text style={styles.explanationContent}>{q.explanation}</Text>
                          </View>
                        ) : null}
                      </View>
                    );
                  }

                  // ============================================
                  // CODING VIEW: Test Cases & Full Source Code
                  // ============================================
                  const lang = q.language || res.language || 'code';
                  const code = q.submittedCode || q.sourceCode || q.code || '';
                  const passedTests = res.passedTests !== undefined ? res.passedTests : q.passedTests;
                  const totalTests = res.totalTests !== undefined ? res.totalTests : q.totalTests;
                  const execTime = res.executionTime || 0;
                  const memUsed = res.memoryUsed || 0;

                  return (
                    <View key={itemKey} style={[styles.subCard, shadows.sm]}>
                      <View style={styles.subCardHeader}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.subQNumber}>Question {index + 1}</Text>
                            <View style={styles.codingPill}>
                              <Text style={styles.codingPillText}>CODING</Text>
                            </View>
                          </View>
                          <Text style={styles.subQTitle}>{title}</Text>
                        </View>
                        <View style={styles.subScorePill}>
                          <Text style={styles.subScoreText}>
                            {marks} / {maxMarks} Marks
                          </Text>
                        </View>
                      </View>

                      {/* Language, Test Cases, & Performance Telemetry */}
                      <View style={styles.subMetaRow}>
                        <View style={styles.subMetaBadge}>
                          <Text style={styles.subMetaText}>{String(lang).toUpperCase()}</Text>
                        </View>

                        {passedTests !== undefined && totalTests !== undefined ? (
                          <View style={styles.testBadge}>
                            <Ionicons
                              name={passedTests === totalTests ? 'checkmark-circle' : 'alert-circle'}
                              size={12}
                              color={passedTests === totalTests ? colors.success : colors.warning}
                              style={{ marginRight: 4 }}
                            />
                            <Text
                              style={[
                                styles.subTestcasesText,
                                { color: passedTests === totalTests ? colors.success : colors.warning },
                              ]}
                            >
                              {passedTests} / {totalTests} Testcases Passed
                            </Text>
                          </View>
                        ) : null}

                        {execTime > 0 || memUsed > 0 ? (
                          <View style={styles.perfBadge}>
                            <Text style={styles.perfBadgeText}>
                              {execTime}s • {memUsed} MB
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      {/* Compilation Output if any */}
                      {res.compileOutput ? (
                        <View style={styles.compilerBox}>
                          <Text style={styles.compilerTitle}>Compiler Output / Logs:</Text>
                          <Text style={styles.compilerContent}>{res.compileOutput}</Text>
                        </View>
                      ) : null}

                      {/* Source Code Container */}
                      {code ? (
                        <View style={styles.codeContainer}>
                          <View style={styles.codeHeader}>
                            <Text style={styles.codeHeaderLang}>Submitted Solution ({lang})</Text>
                            <Text style={styles.codeLengthText}>
                              {code.length} characters
                            </Text>
                          </View>
                          <ScrollView horizontal nestedScrollEnabled={true} showsHorizontalScrollIndicator={true}>
                            <Text style={styles.codeText}>{code}</Text>
                          </ScrollView>
                        </View>
                      ) : (
                        <Text style={styles.noCodeText}>No code submitted for this question.</Text>
                      )}
                    </View>
                  );
                })
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
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
    maxHeight: '92%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    margin: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 10,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    flexShrink: 1,
  },
  actionToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  toolBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 5,
  },
  downloadBtn: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  shareBtn: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryLight,
  },
  retakeBtn: {
    backgroundColor: colors.warningLight,
    borderColor: colors.warningBorder,
  },
  toolBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  infoCard: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  candidateHeader: {
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
    fontWeight: '800',
    fontSize: 16,
  },
  candidateName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  candidateRoll: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700',
    fontFamily: 'monospace',
    marginTop: 1,
  },
  candidateEmail: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  profileDetailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  profileDetailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  profileDetailText: {
    fontSize: 11,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  metricGrid: {
    flexDirection: 'row',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
  },
  timeAuditRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: 4,
  },
  timeAuditItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeAuditLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  timeAuditValue: {
    fontSize: 11,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  terminationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  terminationText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: colors.danger,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  violationsBox: {
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  violationAlertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  violationAlertText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.danger,
  },
  violationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: 'rgba(239, 68, 68, 0.15)',
  },
  violationType: {
    fontSize: 11,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  violationDetailsText: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  violationTime: {
    fontSize: 11,
    color: colors.danger,
    fontWeight: '600',
  },
  violationSubNote: {
    fontSize: 11,
    color: colors.danger,
    marginTop: 2,
  },
  cleanAuditBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: colors.successBorder,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  cleanAuditText: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '600',
    flex: 1,
  },
  emptySubmissions: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
  },
  emptySubText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  subCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 14,
    marginBottom: 12,
  },
  subCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  subQNumber: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
  },
  mcqPill: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  mcqPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#065F46',
  },
  codingPill: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  codingPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primary,
  },
  subQTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 3,
  },
  subScorePill: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  subScoreText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
  mcqStatusRow: {
    marginTop: 8,
  },
  evalStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  evalStatusPassed: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  evalStatusFailed: {
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  evalStatusNeutral: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  evalStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  mcqOptionsContainer: {
    marginTop: 10,
    gap: 8,
  },
  mcqOptionsHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionItem: {
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionItemNeutral: {
    backgroundColor: colors.background,
    borderColor: colors.border,
  },
  optionItemCorrect: {
    backgroundColor: '#ECFDF5',
    borderColor: '#6EE7B7',
  },
  optionItemWrong: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FDA4AF',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  letterCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  letterCircleNeutral: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  letterCircleCorrect: {
    backgroundColor: '#059669',
  },
  letterCircleWrong: {
    backgroundColor: '#E11D48',
  },
  letterText: {
    fontSize: 11,
    fontWeight: '800',
  },
  letterTextNeutral: {
    color: colors.textSecondary,
  },
  letterTextCorrect: {
    color: '#FFFFFF',
  },
  letterTextWrong: {
    color: '#FFFFFF',
  },
  optionText: {
    fontSize: 12,
    color: colors.textPrimary,
    flex: 1,
  },
  optionBadgesCol: {
    alignItems: 'flex-end',
    gap: 3,
  },
  correctBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  correctBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#065F46',
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  selectedBadgeGreen: {
    backgroundColor: '#A7F3D0',
  },
  selectedBadgeRed: {
    backgroundColor: '#FECDD3',
  },
  selectedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  noOptionsNotice: {
    padding: 10,
    backgroundColor: colors.background,
    borderRadius: 8,
    marginTop: 8,
  },
  noOptionsText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  explanationBox: {
    marginTop: 10,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    padding: 10,
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  explanationTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  explanationContent: {
    fontSize: 11,
    color: '#1E40AF',
    lineHeight: 16,
  },
  subMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  subMetaBadge: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  subMetaText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  testBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  subTestcasesText: {
    fontSize: 11,
    fontWeight: '700',
  },
  perfBadge: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  perfBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  compilerBox: {
    marginTop: 8,
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    borderRadius: 8,
    padding: 8,
  },
  compilerTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6B21A8',
    marginBottom: 2,
  },
  compilerContent: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#581C87',
  },
  codeContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  codeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  codeHeaderLang: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  codeLengthText: {
    fontSize: 10,
    color: '#64748B',
  },
  codeText: {
    color: '#F8FAFC',
    fontFamily: 'monospace',
    fontSize: 11,
    lineHeight: 16,
  },
  noCodeText: {
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: 8,
  },
});
