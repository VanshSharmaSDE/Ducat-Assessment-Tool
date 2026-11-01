import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

export default function StatusBadge({ status, label, size = 'medium' }) {
  const norm = String(status || label || '').toUpperCase();

  let bg = '#F1F5F9';
  let text = '#475569';
  let border = '#E2E8F0';

  if (['ACTIVE', 'PASS', 'PASSED', 'SUCCESS', 'PUBLISHED', 'EASY'].includes(norm)) {
    bg = colors.successLight;
    text = colors.success;
    border = colors.successBorder;
  } else if (['UPCOMING', 'CODING', 'INFO'].includes(norm)) {
    bg = colors.infoLight;
    text = colors.info;
    border = colors.infoBorder;
  } else if (['MEDIUM', 'DRAFT', 'ONGOING', 'IN_PROGRESS', 'PENDING', 'EVALUATING'].includes(norm)) {
    bg = colors.warningLight;
    text = colors.warning;
    border = colors.warningBorder;
  } else if (['FAIL', 'FAILED', 'TERMINATED', 'HARD', 'SUSPENDED', 'ERROR'].includes(norm)) {
    bg = colors.dangerLight;
    text = colors.danger;
    border = colors.dangerBorder;
  } else if (['VIOLATION', 'WARNING'].includes(norm)) {
    bg = colors.violationLight;
    text = colors.violation;
    border = colors.violationBorder;
  } else if (['MCQ'].includes(norm)) {
    bg = '#F5F3FF';
    text = '#7C3AED';
    border = '#DDD6FE';
  } else if (['HYBRID'].includes(norm)) {
    bg = '#EFF6FF';
    text = '#2563EB';
    border = '#BFDBFE';
  }

  const isSmall = size === 'small';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bg,
          borderColor: border,
          paddingHorizontal: isSmall ? 6 : 9,
          paddingVertical: isSmall ? 2 : 4,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: text,
            fontSize: isSmall ? 10 : 11,
          },
        ]}
      >
        {label || status || 'N/A'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});
