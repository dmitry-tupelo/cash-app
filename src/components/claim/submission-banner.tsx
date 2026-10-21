import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { Submission } from '@/claims/claims-store';
import { useTheme } from '@/hooks/use-theme';
import { formatDecimalString } from '@/lib/amount';
import { describeError } from '@/lib/errors';

type SubmissionBannerProps = {
  submission: Submission;
  onCheckAgain: () => void;
  onDismiss: () => void;
  dismissLabel: string;
};

/** State of the claim request being sent. Shown on Home and on the claim screen. */
export function SubmissionBanner({
  submission,
  onCheckAgain,
  onDismiss,
  dismissLabel,
}: SubmissionBannerProps) {
  const theme = useTheme();
  const { body } = submission.attempt;
  const what = `${formatDecimalString(body.amount)} ${body.asset}`;

  if (submission.phase === 'sending') {
    return (
      <View style={[styles.banner, { borderColor: theme.tint }]}>
        <View style={styles.titleRow}>
          <ActivityIndicator color={theme.tint} />
          <ThemedText type="smallBold" style={styles.titleText}>
            {submission.retries === 0 ? `Submitting your claim of ${what}…` : `Confirming your claim of ${what}…`}
          </ThemedText>
        </View>
        {submission.retries > 0 && (
          <ThemedText type="small" themeColor="textSecondary">
            The connection is unstable, so we are retrying the same request. It can’t create a
            second claim. Please don’t submit it again.
          </ThemedText>
        )}
      </View>
    );
  }

  if (submission.phase === 'unknown') {
    return (
      <View style={[styles.banner, { borderColor: theme.warning }]}>
        <ThemedText type="smallBold" themeColor="warning">
          We couldn’t confirm your claim of {what}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          It may have gone through. “Check again” resends the same request, so it either finds
          your claim or creates it once — never twice. New claims are paused until then.
        </ThemedText>
        <Button title="Check again" onPress={onCheckAgain} />
      </View>
    );
  }

  const { message } = describeError(submission.error);
  return (
    <View style={[styles.banner, { borderColor: theme.danger }]}>
      <ThemedText type="smallBold" themeColor="danger">
        Your claim of {what} was not created
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {message}
      </ThemedText>
      <Button title={dismissLabel} variant="secondary" onPress={onDismiss} />
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  titleText: {
    flexShrink: 1,
  },
});
