import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Claim } from '@/api/claims';
import { ClaimStatusText } from '@/components/claim/claim-status';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { formatDecimalString } from '@/lib/amount';
import { formatTime } from '@/lib/time';

const MAX_SHOWN = 5;

/** Claims made from this browser in the last day, newest first. Tap to follow one. */
export function RecentClaims({ claims }: { claims: Claim[] }) {
  const router = useRouter();
  if (claims.length === 0) return null;

  return (
    <View style={styles.section}>
      <ThemedText type="smallBold">Your recent claims</ThemedText>
      {claims.slice(0, MAX_SHOWN).map((claim) => (
        <Pressable
          key={claim.id}
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/claims/[id]', params: { id: claim.id } })}
          style={({ pressed }) => pressed && styles.pressed}>
          <ThemedView type="backgroundElement" style={styles.row}>
            <View style={styles.main}>
              <ThemedText type="small" style={styles.number}>
                {formatDecimalString(claim.amount)} {claim.asset}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {formatTime(Date.parse(claim.createdAt))}
                {claim.status === 'failed' && ' · returned to available'}
              </ThemedText>
            </View>
            <ClaimStatusText status={claim.status} />
          </ThemedView>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  main: {
    flexShrink: 1,
  },
  number: {
    fontVariant: ['tabular-nums'],
  },
  pressed: {
    opacity: 0.7,
  },
});
