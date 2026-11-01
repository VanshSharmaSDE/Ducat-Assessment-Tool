import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  StatusBar,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, shadows } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import ServerSettingsModal from '../components/common/ServerSettingsModal';

export default function LoginScreen() {
  const { login, serverUrl, serverStatus } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [serverModalVisible, setServerModalVisible] = useState(false);

  const handleLogin = async () => {
    if (!identifier.trim()) {
      setErrorMessage('Please enter your Administrator ID or Email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setErrorMessage('');
    setLoading(true);

    try {
      await login(identifier.trim(), password);
    } catch (err) {
      const msg = err.message || 'Invalid credentials or connection error.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#F4F7FE" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top Server Indicator Button */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.serverPill}
            onPress={() => setServerModalVisible(true)}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: serverStatus.online ? colors.success : colors.danger },
              ]}
            />
            <Text style={styles.serverPillText} numberOfLines={1}>
              {serverStatus.online ? 'Server Online' : 'Check Server'}
            </Text>
            <Ionicons name="settings-sharp" size={13} color={colors.textSecondary} style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>

        {/* Branding Hero Card */}
        <View style={styles.heroSection}>
          <View style={[styles.logoCard, shadows.md]}>
            <Image
              source={require('../../assets/logo.jpeg')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <View style={styles.badgeRow}>
            <View style={styles.adminRoleBadge}>
              <MaterialCommunityIcons name="shield-check" size={14} color={colors.primary} />
              <Text style={styles.adminRoleBadgeText}>ADMINISTRATOR PORTAL ONLY</Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>Control Center</Text>
          <Text style={styles.heroSubtitle}>
            Manage assessments, monitor anti-cheat telemetry, and review candidate code submissions.
          </Text>
        </View>

        {/* Login Form Box */}
        <View style={[styles.card, shadows.md]}>
          {errorMessage ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={colors.danger} style={{ marginRight: 8 }} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Identifier Input */}
          <Text style={styles.inputLabel}>Admin ID or Email</Text>
          <View style={styles.inputRow}>
            <MaterialCommunityIcons
              name="account-tie-outline"
              size={20}
              color={colors.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="e.g. admin@skillcodex.tech or ADM01"
              placeholderTextColor={colors.textMuted}
              value={identifier}
              onChangeText={(text) => {
                setIdentifier(text);
                if (errorMessage) setErrorMessage('');
              }}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password Input */}
          <Text style={[styles.inputLabel, { marginTop: 16 }]}>Password</Text>
          <View style={styles.inputRow}>
            <MaterialCommunityIcons
              name="lock-outline"
              size={20}
              color={colors.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Enter your account password"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errorMessage) setErrorMessage('');
              }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* Server Target Indicator Bar */}
          <View style={styles.serverTargetBar}>
            <View style={{ flex: 1 }}>
              <Text style={styles.serverTargetLabel}>Target Server API:</Text>
              <Text style={styles.serverTargetUrl} numberOfLines={1}>
                {serverUrl}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.serverChangeBtn}
              onPress={() => setServerModalVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.serverChangeBtnText}>Change</Text>
            </TouchableOpacity>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={colors.textInverse} size="small" />
            ) : (
              <View style={styles.submitRow}>
                <Text style={styles.submitButtonText}>Sign In as Administrator</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.textInverse} style={{ marginLeft: 8 }} />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer Notice */}
        <View style={styles.footerNotice}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} style={{ marginRight: 6 }} />
          <Text style={styles.footerNoticeText}>
            Faculty and candidates must access evaluations and coursework on the web portal.
          </Text>
        </View>
      </ScrollView>

      {/* Server Endpoint Settings Modal */}
      <ServerSettingsModal
        visible={serverModalVisible}
        onClose={() => setServerModalVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 30,
    justifyContent: 'center',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: Platform.OS === 'android' ? 14 : 0,
    marginBottom: 8,
  },
  serverPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  serverPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    width: 200,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  badgeRow: {
    marginBottom: 8,
  },
  adminRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  adminRoleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.6,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 320,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.border,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
  },
  serverTargetBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 10,
    marginTop: 18,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  serverTargetLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  serverTargetUrl: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  serverChangeBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginLeft: 8,
  },
  serverChangeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitButtonText: {
    color: colors.textInverse,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  footerNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    paddingHorizontal: 20,
  },
  footerNoticeText: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 15,
    flex: 1,
  },
});
