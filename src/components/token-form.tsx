import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type TokenFormProps = {
  submitLabel: string;
  onSubmit: (token: string) => void;
};

export function TokenForm({ submitLabel, onSubmit }: TokenFormProps) {
  const theme = useTheme();
  const [value, setValue] = useState('');
  const trimmed = value.trim();

  function submit() {
    if (trimmed) onSubmit(trimmed);
  }

  return (
    <View style={styles.form}>
      <TextInput
        value={value}
        onChangeText={setValue}
        onSubmitEditing={submit}
        placeholder="Paste your API token"
        placeholderTextColor={theme.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        spellCheck={false}
        returnKeyType="done"
        accessibilityLabel="API token"
        style={[
          styles.input,
          { color: theme.text, backgroundColor: theme.backgroundElement },
        ]}
      />
      <Button title={submitLabel} onPress={submit} disabled={!trimmed} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.three,
    alignSelf: 'stretch',
  },
  input: {
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    fontSize: 16, // 16px+ keeps iOS Safari from zooming in on focus
  },
});
