import { StyleSheet, View } from 'react-native';

import type { AssetBalance } from '@/api/balances';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { formatAmount, formatUsd } from '@/lib/amount';
import { availableUsd } from '@/lib/totals';

export function AssetRow({ item }: { item: AssetBalance }) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.line}>
        <ThemedText type="smallBold">{item.asset}</ThemedText>
        <View style={styles.amounts}>
          <ThemedText style={styles.number}>{formatAmount(item.available, item.decimals)}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.number}>
            {formatUsd(availableUsd(item))}
          </ThemedText>
        </View>
      </View>
      {item.pending > 0n && <DetailLine label="Pending" units={item.pending} item={item} />}
      {item.claiming > 0n && <DetailLine label="Claiming" units={item.claiming} item={item} />}
    </ThemedView>
  );
}

function DetailLine({ label, units, item }: { label: string; units: bigint; item: AssetBalance }) {
  return (
    <View style={styles.line}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.number}>
        {formatAmount(units, item.decimals)} {item.asset}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  amounts: {
    alignItems: 'flex-end',
    flexShrink: 1,
  },
  number: {
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
    flexShrink: 1,
  },
});
