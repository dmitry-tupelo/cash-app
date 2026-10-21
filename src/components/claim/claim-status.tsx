import type { ClaimStatus } from '@/api/claims';
import { ThemedText } from '@/components/themed-text';
import type { ThemeColor } from '@/constants/theme';

const LABELS: Record<ClaimStatus, { text: string; color: ThemeColor }> = {
  pending: { text: 'Processing', color: 'warning' },
  completed: { text: 'Completed', color: 'success' },
  failed: { text: 'Failed', color: 'danger' },
};

export function ClaimStatusText({ status, large }: { status: ClaimStatus; large?: boolean }) {
  const { text, color } = LABELS[status];
  return (
    <ThemedText type={large ? 'default' : 'smallBold'} themeColor={color} style={large && { fontWeight: 700 }}>
      {text}
    </ThemedText>
  );
}
