import { StyleSheet, View } from 'react-native';

import type { Balances } from '@/api/balances';
import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { formatUsd } from '@/lib/amount';
import { formatAge } from '@/lib/time';
import { usdTotals } from '@/lib/totals';

/** Snapshots refresh every 15s and we poll every 15s, so anything older means refreshes are failing. */
const STALE_AFTER_MS = 60_000;

type BalanceSummaryProps = {
  balances: Balances;
  /** When we last received these balances, ms since epoch. */
  fetchedAt: number;
  isFetching: boolean;
  onRefresh: () => void;
};

export function BalanceSummary({ balances, fetchedAt, isFetching, onRefresh }: BalanceSummaryProps) {
  const totals = usdTotals(balances.items);

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="small" themeColor="textSecondary">
        Available to claim
      </ThemedText>
      <ThemedText style={styles.total}>{formatUsd(totals.available)}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.numbers}>
        Pending {formatUsd(totals.pending)} · Claiming {formatUsd(totals.claiming)}
      </ThemedText>
      <View style={styles.footer}>
        <Freshness fetchedAt={fetchedAt} asOf={balances.asOf} />
        <Button title="Refresh" variant="secondary" onPress={onRefresh} loading={isFetching} />
      </View>
    </ThemedView>
  );
}

// Separate component so only this line re-renders every second.
// "Updated" counts from our last refresh, so it restarts at 0s on every refresh. The server
// recomputes balances only every 15s, so the snapshot itself can be older: the out-of-date
// warning is based on the snapshot time (asOf), not on our refresh.
function Freshness({ fetchedAt, asOf }: { fetchedAt: number; asOf: number }) {
  const now = useNow();
  const stale = now - asOf > STALE_AFTER_MS;
  return (
    <ThemedText type="small" themeColor={stale ? 'warning' : 'textSecondary'} style={styles.freshness}>
      Updated {formatAge(now - fetchedAt)}
      {stale && ' · may be out of date'}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  total: {
    fontSize: 36,
    lineHeight: 44,
    fontWeight: 700,
    fontVariant: ['tabular-nums'],
  },
  numbers: {
    fontVariant: ['tabular-nums'],
  },
  footer: {
    marginTop: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  freshness: {
    flexShrink: 1,
  },
});
