import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/context/LanguageContext";
import { CrmSheet } from "@/components/crm/CrmSheet";
import { Button } from "@/components/ui/Button";
import { type, space, radius, toneColors, MIN_TOUCH, HIT_SLOP, type Tone } from "@/lib/design";

/**
 * The one filter sheet for both RFQ lists.
 *
 * Each screen describes its sections (status / category / city) and the value
 * that means "no filter" for each; the sheet edits a DRAFT the screen owns and
 * commits it on apply, so cancelling never disturbs the list. Chips are the
 * CrmChoice pattern — every option visible, 44px tall — with one addition: a
 * status chip carries its tone, so an active "Awarded" is green here for the
 * same reason its badge is green on the card.
 */

export interface FilterOption {
  value: string;
  label: string;
  /** Status chips colour by meaning when active; other chips use the cta fill. */
  tone?: Tone;
}

export interface FilterSection {
  key: string;
  label: string;
  /** The value that means "no filter" — rendered first as the "all" chip. */
  allValue: string;
  options: FilterOption[];
}

export interface FilterSheetLabels {
  title: string;
  apply: string;
  reset: string;
  all: string;
}

interface FilterSheetProps {
  visible: boolean;
  onClose: () => void;
  sections: FilterSection[];
  /** Draft values keyed by section key — edited here, committed by onApply. */
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onApply: () => void;
  onReset: () => void;
  labels: FilterSheetLabels;
}

export function FilterSheet({
  visible,
  onClose,
  sections,
  values,
  onChange,
  onApply,
  onReset,
  labels,
}: FilterSheetProps) {
  const colors = useColors();
  const { isRTL } = useLanguage();
  const rowDirection = isRTL ? "row-reverse" : "row";

  const renderChip = (
    sectionKey: string,
    allValue: string,
    option: FilterOption,
    active: boolean,
  ) => {
    // An active option toggles back to "all" on a second tap, as both lists
    // always did; the "all" chip itself is only ever selected.
    const isAll = option.value === allValue;
    const next = active && !isAll ? allValue : option.value;
    const tone = active && option.tone ? toneColors(colors, option.tone) : null;
    const backgroundColor = tone ? tone.bg : active ? colors.cta : colors.muted;
    const borderColor = tone ? tone.fg : active ? colors.cta : colors.border;
    const color = tone ? tone.fg : active ? colors.ctaForeground : colors.mutedForeground;

    return (
      <TouchableOpacity
        key={option.value || "__all"}
        onPress={() => onChange(sectionKey, next)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        style={[styles.chip, { backgroundColor, borderColor }]}
      >
        <Text style={[type.bodyStrong, { color }]} numberOfLines={1}>
          {option.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <CrmSheet
      visible={visible}
      title={labels.title}
      onClose={onClose}
      onSubmit={onApply}
      submitLabel={labels.apply}
    >
      {sections.map((section) => {
        const current = values[section.key] ?? section.allValue;
        return (
          <View key={section.key} style={styles.section}>
            <Text
              style={[type.captionStrong, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}
            >
              {section.label}
            </Text>
            <View style={[styles.chips, { flexDirection: rowDirection }]}>
              {renderChip(
                section.key,
                section.allValue,
                { value: section.allValue, label: labels.all },
                current === section.allValue,
              )}
              {section.options.map((option) =>
                renderChip(section.key, section.allValue, option, current === option.value),
              )}
            </View>
          </View>
        );
      })}
      <Button
        title={labels.reset}
        onPress={onReset}
        variant="ghost"
        size="sm"
        style={{ alignSelf: isRTL ? "flex-end" : "flex-start" }}
      />
    </CrmSheet>
  );
}

/** The square control that opens the sheet, with a count of applied filters. */
export function FilterButton({
  activeCount,
  onPress,
  label,
}: {
  activeCount: number;
  onPress: () => void;
  label: string;
}) {
  const colors = useColors();
  const active = activeCount > 0;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={[
        styles.trigger,
        {
          backgroundColor: active ? colors.ctaSoft : colors.surfaceGray,
          borderColor: active ? colors.cta : colors.border,
        },
      ]}
    >
      <Feather name="sliders" size={18} color={active ? colors.cta : colors.outline} />
      {active && (
        <View style={[styles.triggerBadge, { backgroundColor: colors.cta }]}>
          <Text style={[type.captionStrong, { color: colors.ctaForeground }]}>{activeCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

/** An applied filter, shown above the list; tapping it removes that filter. */
export function FilterPill({
  label,
  tone = "cta",
  icon,
  onRemove,
  removeLabel,
}: {
  label: string;
  tone?: Tone;
  icon?: keyof typeof Feather.glyphMap;
  onRemove: () => void;
  removeLabel: string;
}) {
  const colors = useColors();
  const { isRTL } = useLanguage();
  const c = toneColors(colors, tone);
  return (
    <TouchableOpacity
      onPress={onRemove}
      hitSlop={HIT_SLOP}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`${removeLabel}: ${label}`}
      style={[
        styles.pill,
        { backgroundColor: c.bg, borderColor: c.border, flexDirection: isRTL ? "row-reverse" : "row" },
      ]}
    >
      {icon ? <Feather name={icon} size={11} color={c.fg} /> : null}
      <Text style={[type.captionStrong, { color: c.fg, flexShrink: 1 }]} numberOfLines={1}>
        {label}
      </Text>
      <Feather name="x" size={12} color={c.fg} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.sm, marginBottom: space.lg },
  chips: { flexWrap: "wrap", gap: space.sm },
  chip: {
    minHeight: MIN_TOUCH,
    justifyContent: "center",
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    maxWidth: "100%",
  },
  trigger: {
    width: 48,
    height: 48,
    borderRadius: radius.control,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  triggerBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 20,
    height: 20,
    paddingHorizontal: space.xs,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    alignItems: "center",
    gap: space.xs,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    minHeight: 32,
    maxWidth: 160,
  },
});
