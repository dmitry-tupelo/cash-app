import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import type { ActivityItem } from '@/api/activity';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, type ThemeColor } from '@/constants/theme';
import { formatDecimalString } from '@/lib/amount';
import { formatDateTime } from '@/lib/time';

type Label = { text: string; color: ThemeColor };

const STATUS_LABELS: Partial<Record<string, Partial<Record<string, Label>>>> = {
  accrual: {
    pending: { text: 'Pending', color: 'warning' },
    confirmed: { text: 'Confirmed', color: 'textSecondary' },
  },
  reversal: {
    confirmed: { text: 'Confirmed', color: 'textSecondary' },
  },
  claim: {
    pending: { text: 'Processing', color: 'warning' },
    completed: { text: 'Completed', color: 'success' },
    failed: { text: 'Failed · returned', color: 'danger' },
  },
};

/** "manual_adjustment" -> "Manual adjustment", for types and statuses we don't know yet. */
function humanize(value: string) {
  const text = value.replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function title(item: ActivityItem) {
  const exchange = item.exchange ?? 'exchange';
  if (item.type === 'accrual') return `Payback from ${exchange}`;
  if (item.type === 'reversal') return `Reversed by ${exchange}`;
  if (item.type === 'claim') return 'Claim';
  return humanize(item.type);
}

/** One history entry. Claims we created link to their status screen. */
export function ActivityRow({ item }: { item: ActivityItem }) {
  const router = useRouter();
  const negative = item.amount.startsWith('-');
  const amount = `${negative ? '−' : '+'}${formatDecimalString(negative ? item.amount.slice(1) : item.amount)} ${item.asset}`;
  const knownStatus = STATUS_LABELS[item.type]?.[item.status];
  const status: Label = knownStatus ?? { text: humanize(item.status), color: 'textSecondary' };
  // A failed claim never left the balance, and a pending entry isn't final yet.
  // For a status we don't know, we don't guess: the amount stays neutral.
  const settledAmount = !(item.type === 'claim' && item.status === 'failed');
  const amountColor: ThemeColor = !knownStatus
    ? 'text'
    : item.status === 'pending'
      ? 'textSecondary'
      : negative
        ? 'text'
        : 'success';

  const content = (
    <ThemedView type="backgroundElement" style={styles.row}>
      <View style={styles.main}>
        <ThemedText type="small">{title(item)}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {formatDateTime(Date.parse(item.createdAt))}
        </ThemedText>
      </View>
      <View style={styles.side}>
        <ThemedText
          type="smallBold"
          themeColor={settledAmount ? amountColor : 'textSecondary'}
          style={[styles.number, !settledAmount && styles.struck]}>
          {amount}
        </ThemedText>
        <ThemedText type="small" themeColor={status.color}>
          {status.text}
        </ThemedText>
      </View>
    </ThemedView>
  );

  const claimId = item.type === 'claim' ? item.relatedId : null;
  if (!claimId) return content;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/claims/[id]', params: { id: claimId } })}
      style={({ pressed }) => pressed && styles.pressed}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  main: {
    flexShrink: 1,
  },
  side: {
    alignItems: 'flex-end',
    flexShrink: 1,
  },
  number: {
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
  struck: {
    textDecorationLine: 'line-through',
  },
  pressed: {
    opacity: 0.7,
  },
});
