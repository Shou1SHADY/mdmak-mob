import React, { useState } from "react";
import { View, Text, TouchableOpacity, Modal, Pressable, Platform, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useColors } from "@/hooks/useColors";
import { useT } from "@/context/LanguageContext";
import { type, space, radius, MIN_TOUCH } from "@/lib/design";
import { Button } from "./Button";

/**
 * A date the user picks, never types. The value crossing the boundary is a
 * string in the shape the record stores — an ISO day ("2026-09-12") for due
 * and close dates, or "MM/YYYY" for a document's expiry month, which is what
 * the website keeps on legalDocuments — so callers change nothing but the
 * control. Android opens the system dialog, iOS a spinner in a sheet, and the
 * web build the browser's own date input.
 */
interface DateFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** "day" stores YYYY-MM-DD; "month" stores MM/YYYY. */
  granularity?: "day" | "month";
  isRTL?: boolean;
  required?: boolean;
  placeholder?: string;
  containerStyle?: object;
}

const pad = (n: number) => String(n).padStart(2, "0");
const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toMonth = (d: Date) => `${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

function parse(value: string, granularity: "day" | "month"): Date | null {
  if (!value) return null;
  if (granularity === "month") {
    const m = value.match(/^(\d{1,2})\/(\d{4})$/);
    return m ? new Date(+m[2], +m[1] - 1, 1) : null;
  }
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}

export function DateField({ label, value, onChange, granularity = "day", isRTL = false, required = false, placeholder, containerStyle }: DateFieldProps) {
  const colors = useColors();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(parse(value, granularity) ?? new Date());
  const align = isRTL ? "right" : "left";
  const current = parse(value, granularity);
  const format = (d: Date) => (granularity === "month" ? toMonth(d) : toIso(d));
  const display = current
    ? current.toLocaleDateString(isRTL ? "ar-SA" : "en-GB", granularity === "month" ? { month: "long", year: "numeric" } : { day: "numeric", month: "short", year: "numeric" })
    : placeholder ?? "";

  const commit = (d: Date) => onChange(format(d));

  const press = () => {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: current ?? new Date(),
        mode: "date",
        onChange: (e: DateTimePickerEvent, d?: Date) => { if (e.type === "set" && d) commit(d); },
      });
      return;
    }
    setDraft(current ?? new Date());
    setOpen(true);
  };

  if (Platform.OS === "web") {
    // The browser's own input, styled to sit beside our text fields.
    const { unstable_createElement } = require("react-native-web") as { unstable_createElement: (type: string, props: Record<string, unknown>) => React.ReactElement };
    const webValue = granularity === "month" && current ? `${current.getFullYear()}-${pad(current.getMonth() + 1)}` : value;
    return (
      <View style={[styles.container, containerStyle]}>
        <Text style={[type.captionStrong, { color: colors.mutedForeground, textAlign: align }]}>
          {label}{required ? <Text style={{ color: colors.destructive }}> *</Text> : null}
        </Text>
        {unstable_createElement("input", {
          type: granularity === "month" ? "month" : "date",
          value: webValue,
          "aria-label": label,
          onChange: (e: { target: { value: string } }) => {
            const v = e.target.value;
            if (!v) { onChange(""); return; }
            if (granularity === "month") { const [y, m] = v.split("-"); onChange(`${m}/${y}`); } else onChange(v);
          },
          style: {
            minHeight: 48, borderRadius: radius.control, border: `1px solid ${colors.border}`, background: colors.surfaceGray,
            color: colors.foreground, padding: `0 ${space.md}px`, fontFamily: "Inter_400Regular, sans-serif", fontSize: 14,
            direction: isRTL ? "rtl" : "ltr", width: "100%", boxSizing: "border-box", colorScheme: "light dark",
          },
        })}
      </View>
    );
  }

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={[type.captionStrong, { color: colors.mutedForeground, textAlign: align }]}>
        {label}{required ? <Text style={{ color: colors.destructive }}> *</Text> : null}
      </Text>
      <TouchableOpacity
        onPress={press}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: current ? format(current) : undefined }}
        style={[styles.field, { backgroundColor: colors.surfaceGray, borderColor: colors.border, flexDirection: isRTL ? "row-reverse" : "row" }]}
      >
        <Feather name="calendar" size={16} color={colors.outline} />
        <Text style={[type.body, { flex: 1, color: current ? colors.foreground : colors.outline, textAlign: align }]} numberOfLines={1}>
          {display}
        </Text>
        {current ? (
          <TouchableOpacity onPress={() => onChange("")} accessibilityRole="button" accessibilityLabel={t.common.close} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Feather name="x" size={16} color={colors.outline} />
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>

      {Platform.OS === "ios" && (
        <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
          <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={() => setOpen(false)} />
          <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[type.title, { color: colors.foreground, textAlign: "center" }]}>{label}</Text>
            <DateTimePicker
              value={draft}
              mode="date"
              display="spinner"
              locale={isRTL ? "ar" : "en-GB"}
              onChange={(_e: DateTimePickerEvent, d?: Date) => { if (d) setDraft(d); }}
              themeVariant={undefined}
            />
            <Button title={t.common.ok} onPress={() => { commit(draft); setOpen(false); }} fullWidth />
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  field: { alignItems: "center", gap: space.sm, minHeight: 48, borderWidth: 1, borderRadius: radius.control, paddingHorizontal: space.md },
  backdrop: { flex: 1 },
  sheet: { borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card, borderTopWidth: 1, padding: space.lg, paddingBottom: space.xxl, gap: space.md },
});
