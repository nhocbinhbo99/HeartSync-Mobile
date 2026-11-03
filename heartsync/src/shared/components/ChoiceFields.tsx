import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ChoiceOption } from '../domain/profileOptions';
import { optionLabel } from '../domain/profileOptions';
import { colors, radii, spacing, type } from '../theme/tokens';
import { ChoiceBottomSheet } from './ChoiceBottomSheet';
import { InlineFieldError } from './InlineFieldError';
import { SelectedChip } from './SelectedChip';

type BaseProps = {
  label: string;
  options: readonly ChoiceOption[];
  error?: string;
  helperText?: string;
  disabled?: boolean;
  searchable?: boolean;
};

export function SingleChoiceField({ label, options, value, onChange, error, helperText, disabled = false, searchable = true }:
  BaseProps & { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  return <View style={styles.group}>
    <Text style={styles.label}>{label}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled}
      onPress={() => setOpen(true)} style={({ pressed }) => [styles.field, error && styles.fieldError, disabled && styles.disabled, pressed && styles.pressed]}>
      <Text style={[styles.value, !value && styles.placeholder]}>{value ? optionLabel(options, value) : 'Chọn một lựa chọn'}</Text>
      <Text aria-hidden style={styles.disclosure}>Mở</Text>
    </Pressable>
    {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
    <InlineFieldError message={error} />
    <ChoiceBottomSheet visible={open} title={label} options={options} selectedValues={value ? [value] : []}
      searchable={searchable} onChange={(values) => onChange(values[0] ?? '')} onClose={() => setOpen(false)} />
  </View>;
}

export function MultiChoiceField({ label, options, values, onChange, error, helperText, disabled = false, searchable = true }:
  BaseProps & { values: string[]; onChange: (values: string[]) => void }) {
  const [open, setOpen] = useState(false);
  return <View style={styles.group}>
    <Text style={styles.label}>{label}</Text>
    {values.length ? <View style={styles.chips}>{values.map((value) => <SelectedChip key={value}
      label={optionLabel(options, value)} disabled={disabled} onRemove={() => onChange(values.filter((item) => item !== value))} />)}</View> : null}
    <Pressable accessibilityRole="button" accessibilityLabel={`Chọn ${label}`} accessibilityState={{ disabled }} disabled={disabled}
      onPress={() => setOpen(true)} style={({ pressed }) => [styles.field, error && styles.fieldError, disabled && styles.disabled, pressed && styles.pressed]}>
      <Text style={[styles.value, values.length === 0 && styles.placeholder]}>{values.length ? `${values.length} lựa chọn` : 'Chọn một hoặc nhiều'}</Text>
      <Text aria-hidden style={styles.disclosure}>Mở</Text>
    </Pressable>
    {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
    <InlineFieldError message={error} />
    <ChoiceBottomSheet visible={open} title={label} options={options} selectedValues={values} multiple
      searchable={searchable} onChange={onChange} onClose={() => setOpen(false)} />
  </View>;
}

const styles = StyleSheet.create({
  group: { gap: spacing.xs },
  label: { ...type.label, color: colors.ink },
  field: { minHeight: 52, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md,
    backgroundColor: colors.background, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  fieldError: { borderColor: colors.danger },
  value: { ...type.body, color: colors.ink, flex: 1 },
  placeholder: { color: colors.inkMuted },
  disclosure: { ...type.label, color: colors.primaryPressed },
  helper: { ...type.caption, color: colors.inkMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.72 },
});
