import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { filterChoiceOptions, type ChoiceOption } from '../domain/profileOptions';
import { colors, radii, spacing, type } from '../theme/tokens';
import { AppButton } from './AppButton';

type Props = {
  visible: boolean;
  title: string;
  options: readonly ChoiceOption[];
  selectedValues: string[];
  multiple?: boolean;
  searchable?: boolean;
  onChange: (values: string[]) => void;
  onClose: () => void;
};

export function ChoiceBottomSheet({ visible, title, options, selectedValues, multiple = false, searchable = true, onChange, onClose }: Props) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => filterChoiceOptions(options, query), [options, query]);
  const close = () => { setQuery(''); onClose(); };
  const choose = (value: string) => {
    if (!multiple) { onChange([value]); close(); return; }
    onChange(selectedValues.includes(value) ? selectedValues.filter((item) => item !== value) : [...selectedValues, value]);
  };
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
    <View style={styles.layer}>
      <Pressable accessibilityLabel="Đóng danh sách lựa chọn" style={styles.backdrop} onPress={close} />
      <View accessibilityViewIsModal style={styles.sheet}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>{title}</Text>
          <AppButton label="Đóng" variant="quiet" onPress={close} style={styles.close} />
        </View>
        {searchable ? <TextInput accessibilityLabel={`Tìm trong ${title}`} value={query} onChangeText={setQuery}
          placeholder="Tìm kiếm" placeholderTextColor={colors.inkMuted} style={styles.search} /> : null}
        <ScrollView keyboardShouldPersistTaps="handled">
          {filtered.length === 0 ? <Text style={styles.empty}>Không có lựa chọn phù hợp.</Text> : filtered.map((item) => {
            const selected = selectedValues.includes(item.value);
            return <Pressable accessibilityRole={multiple ? 'checkbox' : 'radio'} accessibilityState={{ checked: selected }}
              key={item.value} onPress={() => choose(item.value)}
              style={({ pressed }) => [styles.option, selected && styles.optionSelected, pressed && styles.pressed]}>
              <View style={styles.optionCopy}>
                <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{item.label}</Text>
                {item.description ? <Text style={styles.optionDescription}>{item.description}</Text> : null}
              </View>
              <View aria-hidden style={[styles.marker, selected && styles.markerSelected]} />
            </Pressable>;
          })}
        </ScrollView>
        {multiple ? <AppButton label={`Xong (${selectedValues.length} đã chọn)`} onPress={close} /> : null}
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  layer: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(16,42,51,0.42)' },
  sheet: { maxHeight: '84%', minHeight: 320, backgroundColor: colors.surface, borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg, padding: spacing.lg, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  title: { ...type.title, color: colors.ink, flex: 1 },
  close: { paddingHorizontal: spacing.sm },
  search: { minHeight: 52, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md,
    color: colors.ink, backgroundColor: colors.background, paddingHorizontal: spacing.md, fontSize: 16 },
  option: { minHeight: 56, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: spacing.sm,
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  optionSelected: { backgroundColor: colors.primarySoft, paddingHorizontal: spacing.sm, borderRadius: radii.md },
  optionCopy: { flex: 1 },
  optionLabel: { ...type.body, color: colors.ink },
  optionLabelSelected: { color: colors.primaryPressed, fontWeight: '600' },
  optionDescription: { ...type.caption, color: colors.inkMuted },
  marker: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border },
  markerSelected: { borderWidth: 6, borderColor: colors.primary },
  pressed: { opacity: 0.72 },
  empty: { ...type.body, color: colors.inkMuted, paddingVertical: spacing.lg, textAlign: 'center' },
});
