import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import type { AssetBalance } from '@/api/balances';
import { useClaims } from '@/claims/claims-context';
import type { SubmitResult } from '@/claims/claims-store';
import { Button } from '@/components/button';
import { SubmissionBanner } from '@/components/claim/submission-banner';
import { DetailRow } from '@/components/detail-row';
import { ErrorView } from '@/components/state-views';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useClaimOptions } from '@/hooks/use-claims-data';
import { useTheme } from '@/hooks/use-theme';
import { formatAmount, formatUsd, toAmountString, usdValue } from '@/lib/amount';
import { validateClaimAmount, type ClaimAmountError } from '@/lib/claim';

type ClaimFormProps = {
  /** Balances already adjusted for the user's own claims. */
  items: AssetBalance[];
  initialAsset?: string;
};

export function ClaimForm({ items, initialAsset }: ClaimFormProps) {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { submission, submit, retry, dismiss } = useClaims();

  const [asset, setAsset] = useState(() => pickInitialAsset(items, initialAsset));
  const [input, setInput] = useState('');
  const [destinationId, setDestinationId] = useState<string | null>(null);
  const [step, setStep] = useState<'edit' | 'review'>('edit');
  // Set on confirm. Once the claim exists the balance already reflects it, so the old form
  // would show "above available" for a moment before we navigate away; show a spinner instead.
  const [sent, setSent] = useState(false);

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const item = items.find((i) => i.asset === asset);
  const options = useClaimOptions(item?.asset, item?.decimals);

  if (!item) {
    return (
      <ThemedText themeColor="textSecondary">
        You have no balances to claim yet.
      </ThemedText>
    );
  }

  const { decimals } = item;
  const unit = (units: bigint) => `${formatAmount(units, decimals)} ${item.asset}`;

  // Re-validated on every render, so a balance refresh while the user types or reviews
  // is taken into account before anything is sent.
  const check = options.data
    ? validateClaimAmount(input, {
        decimals,
        available: item.available,
        minAmount: options.data.minAmount,
        fee: options.data.fee,
      })
    : null;
  const destinations = options.data?.destinations ?? [];
  const destination = destinations.find((d) => d.id === destinationId) ?? destinations[0];

  function selectAsset(next: string) {
    setAsset(next);
    setInput('');
    setDestinationId(null);
    setStep('edit');
  }

  function handleResult(result: SubmitResult) {
    if (!mounted.current) return; // the user left; Home shows the outcome
    if (result.kind === 'created') {
      router.replace({ pathname: '/claims/[id]', params: { id: result.claim.id } });
    } else if (result.kind === 'rejected') {
      // e.g. available changed on the server: get a fresh snapshot for the next try.
      void queryClient.invalidateQueries({ queryKey: ['balances'] });
    } else if (result.kind === 'stopped') {
      setSent(false);
    }
  }

  if (submission) {
    return (
      <SubmissionBanner
        submission={submission}
        onCheckAgain={async () => handleResult(await retry())}
        onDismiss={() => {
          dismiss();
          setSent(false);
          setStep('edit');
        }}
        dismissLabel="Edit claim"
      />
    );
  }

  if (sent) return <ActivityIndicator color={theme.tint} />;

  // If the amount stopped being valid (e.g. a refresh lowered available), we fall back to editing.
  if (step === 'review' && check?.ok && destination) {
    const confirm = async () => {
      setSent(true);
      handleResult(
        await submit({
          asset: item.asset,
          amount: toAmountString(check.amount, decimals),
          destinationId: destination.id,
        }),
      );
    };

    return (
      <View style={styles.form}>
        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold">Review your claim</ThemedText>
          <DetailRow label="Amount" value={unit(check.amount)} />
          <DetailRow label="Fee" value={`− ${unit(check.fee)}`} />
          <DetailRow
            label="You receive"
            value={unit(check.receive)}
            hint={`≈ ${formatUsd(usdValue(check.receive, decimals, item.usdPrice))}`}
            strong
          />
          <DetailRow label="To" value={destination.label} />
        </ThemedView>
        <ThemedText type="small" themeColor="textSecondary">
          The fee is taken from the amount. A claim usually completes in about 20 seconds.
        </ThemedText>
        <Button title="Confirm claim" onPress={confirm} />
        <Button title="Edit" variant="secondary" onPress={() => setStep('edit')} />
      </View>
    );
  }

  const notEnough = check?.ok === false && check.error.kind === 'not-enough';
  const amountError = check && !check.ok ? amountErrorText(check.error, item.asset, decimals, unit) : null;

  return (
    <View style={styles.form}>
      <View style={styles.section}>
        <ThemedText type="smallBold">Asset</ThemedText>
        <View style={styles.chips}>
          {items.map((i) => (
            <Chip
              key={i.asset}
              label={i.asset}
              selected={i.asset === item.asset}
              onPress={() => selectAsset(i.asset)}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText type="smallBold">Amount</ThemedText>
        <View style={styles.inputRow}>
          <TextInput
            value={input}
            onChangeText={setInput}
            editable={!notEnough}
            placeholder="0.00"
            placeholderTextColor={theme.textSecondary}
            keyboardType="decimal-pad"
            inputMode="decimal"
            autoCorrect={false}
            autoComplete="off"
            accessibilityLabel={`Amount in ${item.asset}`}
            style={[
              styles.input,
              { color: theme.text, backgroundColor: theme.backgroundElement },
              notEnough && styles.disabled,
            ]}
          />
          <Button
            title="Max"
            variant="secondary"
            onPress={() => setInput(toAmountString(item.available, decimals))}
            disabled={notEnough}
          />
        </View>
        <ThemedText type="small" themeColor="textSecondary" style={styles.number}>
          Available {unit(item.available)}
          {options.data && ` · Minimum ${unit(options.data.minAmount)}`}
        </ThemedText>
        {amountError && (
          <ThemedText type="small" themeColor={notEnough ? 'warning' : 'danger'}>
            {amountError}
          </ThemedText>
        )}
      </View>

      {options.data ? (
        <>
          <ThemedView type="backgroundElement" style={styles.card}>
            <DetailRow label="Fee" value={unit(options.data.fee)} />
            <DetailRow
              label="You receive"
              value={check?.ok ? unit(check.receive) : '—'}
              hint={
                check?.ok
                  ? `≈ ${formatUsd(usdValue(check.receive, decimals, item.usdPrice))}`
                  : undefined
              }
              strong
            />
          </ThemedView>

          <View style={styles.section}>
            <ThemedText type="smallBold">Send to</ThemedText>
            {destinations.length === 0 ? (
              <ThemedText type="small" themeColor="danger">
                No destination is available for {item.asset}.
              </ThemedText>
            ) : (
              <View style={styles.chips}>
                {destinations.map((d) => (
                  <Chip
                    key={d.id}
                    label={d.label}
                    selected={d.id === destination?.id}
                    onPress={() => setDestinationId(d.id)}
                  />
                ))}
              </View>
            )}
          </View>
        </>
      ) : options.isError ? (
        <ErrorView
          error={options.error}
          onRetry={() => options.refetch()}
          retrying={options.isFetching}
        />
      ) : (
        <ActivityIndicator color={theme.tint} />
      )}

      <Button
        title="Review claim"
        onPress={() => setStep('review')}
        disabled={!check?.ok || !destination}
      />
    </View>
  );
}

function pickInitialAsset(items: AssetBalance[], requested?: string) {
  if (requested && items.some((i) => i.asset === requested)) return requested;
  return (items.find((i) => i.available > 0n) ?? items[0])?.asset ?? '';
}

function amountErrorText(
  error: ClaimAmountError,
  asset: string,
  decimals: number,
  unit: (units: bigint) => string,
): string | null {
  switch (error.kind) {
    case 'not-enough':
      return `Not enough ${asset} to claim (min ${unit(error.smallest)})`;
    case 'empty':
      return null;
    case 'grouping':
      return 'Type amounts without thousands separators, e.g. 1234 or 1.234';
    case 'format':
      return 'Enter an amount like 0.5';
    case 'too-many-decimals':
      return decimals === 0
        ? `${asset} can only be claimed in whole units`
        : `${asset} allows at most ${decimals} decimal places`;
    case 'above-available':
      return `You can claim at most ${unit(error.available)}`;
    case 'below-min':
      return `The minimum claim is ${unit(error.minAmount)}`;
    case 'not-above-fee':
      return `The amount must be more than the ${unit(error.fee)} fee`;
  }
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[
        styles.chip,
        { backgroundColor: selected ? theme.tint : theme.backgroundElement },
      ]}>
      <ThemedText type="smallBold" style={{ color: selected ? theme.onTint : theme.text }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.four,
  },
  section: {
    gap: Spacing.two,
  },
  card: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.four,
  },
  inputRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    fontSize: 20,
    fontVariant: ['tabular-nums'],
  },
  number: {
    fontVariant: ['tabular-nums'],
  },
  disabled: {
    opacity: 0.5,
  },
});
