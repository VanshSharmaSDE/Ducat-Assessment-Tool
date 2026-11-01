import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, shadows } from '../../theme/colors';
import { SERVER_PRESETS, testServerPing } from '../../config/apiConfig';
import { useAuth } from '../../context/AuthContext';

export default function ServerSettingsModal({ visible, onClose }) {
  const { serverUrl, updateServerUrl } = useAuth();
  const [customUrl, setCustomUrl] = useState(serverUrl);
  const [pingState, setPingState] = useState({ testing: false, result: null });

  useEffect(() => {
    if (visible) {
      setCustomUrl(serverUrl);
      setPingState({ testing: false, result: null });
    }
  }, [visible, serverUrl]);

  const handleTestPing = async (urlToTest) => {
    const target = urlToTest || customUrl;
    setPingState({ testing: true, result: null });
    const res = await testServerPing(target);
    setPingState({ testing: false, result: res });
  };

  const handleSelectPreset = (url) => {
    setCustomUrl(url);
    handleTestPing(url);
  };

  const handleSave = async () => {
    if (!customUrl.trim()) return;
    await updateServerUrl(customUrl.trim());
    onClose();
  };

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
            <View style={styles.headerTitleRow}>
              <MaterialCommunityIcons name="server-network" size={24} color={colors.primary} />
              <Text style={styles.title}>Server Endpoint Settings</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={{ paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
          >
            <Text style={styles.subtitle}>
              Configure the backend API server that this Android app connects to.
            </Text>

            {/* Presets List */}
            <Text style={styles.sectionHeading}>Quick Presets</Text>
            {SERVER_PRESETS.map((preset) => {
              const isSelected = customUrl.trim().toLowerCase() === preset.url.trim().toLowerCase();
              return (
                <TouchableOpacity
                  key={preset.id}
                  style={[styles.presetCard, isSelected && styles.presetCardActive]}
                  onPress={() => handleSelectPreset(preset.url)}
                  activeOpacity={0.7}
                >
                  <View style={styles.presetRadio}>
                    <View style={[styles.radioOuter, isSelected && styles.radioOuterActive]}>
                      {isSelected ? <View style={styles.radioInner} /> : null}
                    </View>
                  </View>
                  <View style={styles.presetInfo}>
                    <Text style={[styles.presetLabel, isSelected && styles.presetLabelActive]}>
                      {preset.label}
                    </Text>
                    <Text style={styles.presetSublabel}>{preset.sublabel}</Text>
                    <Text style={styles.presetUrl} numberOfLines={1}>
                      {preset.url}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Custom URL Input */}
            <Text style={[styles.sectionHeading, { marginTop: 16 }]}>Active Endpoint URL</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="link-outline" size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.input}
                value={customUrl}
                onChangeText={(text) => {
                  setCustomUrl(text);
                  setPingState({ testing: false, result: null });
                }}
                placeholder="http://10.0.2.2:5000/api"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Ping Status Banner */}
            {pingState.testing ? (
              <View style={styles.pingBox}>
                <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.pingText}>Testing connection to {customUrl}...</Text>
              </View>
            ) : pingState.result ? (
              <View
                style={[
                  styles.pingBox,
                  pingState.result.success ? styles.pingSuccess : styles.pingError,
                ]}
              >
                <Ionicons
                  name={pingState.result.success ? 'checkmark-circle' : 'alert-circle'}
                  size={20}
                  color={pingState.result.success ? colors.success : colors.danger}
                  style={{ marginRight: 8 }}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.pingStatusTitle,
                      { color: pingState.result.success ? colors.success : colors.danger },
                    ]}
                  >
                    {pingState.result.success
                      ? `Online • ${pingState.result.latency}ms latency`
                      : 'Connection Failed'}
                  </Text>
                  {pingState.result.error ? (
                    <Text style={styles.pingErrorDetail}>{pingState.result.error}</Text>
                  ) : null}
                </View>
              </View>
            ) : null}

            {/* Action Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.testButton}
                onPress={() => handleTestPing()}
                disabled={pingState.testing}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="speedometer" size={18} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.testButtonText}>Test Connection</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}
                activeOpacity={0.8}
              >
                <Text style={styles.saveButtonText}>Apply & Connect</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
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
    maxHeight: '88%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    margin: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
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
    paddingTop: 12,
    flexShrink: 1,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  presetCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  presetCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  presetRadio: {
    marginRight: 10,
    marginTop: 2,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.borderDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  presetInfo: {
    flex: 1,
  },
  presetLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  presetLabelActive: {
    color: colors.primary,
  },
  presetSublabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  presetUrl: {
    fontSize: 11,
    color: colors.textMuted,
    fontFamily: 'monospace',
    marginTop: 3,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
    fontFamily: 'monospace',
  },
  pingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.background,
    marginBottom: 16,
  },
  pingSuccess: {
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: colors.successBorder,
  },
  pingError: {
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  pingText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  pingStatusTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  pingErrorDetail: {
    fontSize: 11,
    color: colors.danger,
    marginTop: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    marginBottom: 20,
  },
  testButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 14,
    height: 48,
  },
  testButtonText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  saveButton: {
    flex: 1.2,
    backgroundColor: colors.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
  },
  saveButtonText: {
    color: colors.textInverse,
    fontWeight: '700',
    fontSize: 14,
  },
});
