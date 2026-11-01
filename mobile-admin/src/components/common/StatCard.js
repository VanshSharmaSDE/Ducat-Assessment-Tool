import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, shadows } from '../../theme/colors';

export default function StatCard({
  title,
  value,
  sublabel,
  icon,
  iconColor = colors.primary,
  badgeText,
  badgeColor = colors.success,
  style,
}) {
  return (
    <View style={[styles.card, shadows.sm, style]}>
      <View style={styles.topRow}>
        <View style={[styles.iconContainer, { backgroundColor: `${iconColor}15` }]}>
          <MaterialCommunityIcons name={icon || 'chart-box-outline'} size={22} color={iconColor} />
        </View>
        {badgeText ? (
          <View style={[styles.badge, { backgroundColor: `${badgeColor}15` }]}>
            <Text style={[styles.badgeText, { color: badgeColor }]}>{badgeText}</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.value} numberOfLines={1}>
        {value !== undefined && value !== null ? value : '--'}
      </Text>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      {sublabel ? (
        <Text style={styles.sublabel} numberOfLines={1}>
          {sublabel}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    flex: 1,
    minWidth: 140,
    marginBottom: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  value: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
  },
  sublabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
});
