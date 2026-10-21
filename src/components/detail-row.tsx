import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

type DetailRowProps = {
  label: string;
  value: string;
  hint?: string;
  strong?: boolean;
};

/** Label on the left, value (and an optional smaller hint under it) on the right. */
export function DetailRow({ label, value, hint, strong }: DetailRowProps) {
  return (
    <View style={styles.row}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <View style={styles.value}>
        <ThemedText type={strong ? 'smallBold' : 'small'} style={styles.text}>
          {value}
        </ThemedText>
        {hint && (
          <ThemedText type="small" themeColor="textSecondary" style={styles.text}>
            {hint}
          </ThemedText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  value: {
    flexShrink: 1,
    alignItems: 'flex-end',
  },
  text: {
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
});
