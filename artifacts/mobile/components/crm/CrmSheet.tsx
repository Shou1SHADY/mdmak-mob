import React from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { Button } from "@/components/ui/Button";
import { type, space, radius } from "@/lib/design";

interface CrmSheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  submitLabel: string;
  submitting?: boolean;
  children: React.ReactNode;
}

/**
 * The bottom sheet every CRM create form uses.
 *
 * The website puts these behind multi-step dialogs (CrmFormDialog) because it
 * has the room for eight fields at once. On a phone the same record is captured
 * in one short scroll — the fields that did not make the cut are the ones the
 * website fills in later anyway, and lib/crm-writes.ts writes them as null so
 * the document shape stays identical either way.
 */
export function CrmSheet({
  visible,
  title,
  onClose,
  onSubmit,
  submitLabel,
  submitting,
  children,
}: CrmSheetProps) {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable accessible={false} style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              paddingBottom: (insets.bottom || 0) + 16,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.grabber}>
            <View style={[styles.grabberBar, { backgroundColor: colors.border }]} />
          </View>

          <View style={[styles.header, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Text
              style={[type.title, styles.title, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}
              numberOfLines={1}
            >
              {title}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.close}
              accessibilityRole="button"
              accessibilityLabel={t.common.close}
            >
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={{ paddingBottom: 12 }}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>

          <View style={styles.footer}>
            <Button
              title={submitLabel}
              onPress={onSubmit}
              loading={submitting}
              disabled={submitting}
              fullWidth
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  sheet: {
    maxHeight: "88%",
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    borderTopWidth: 1,
    paddingHorizontal: space.lg,
  },
  grabber: { alignItems: "center", paddingTop: space.sm, paddingBottom: space.xs },
  grabberBar: { width: 40, height: 4, borderRadius: radius.hairline },
  header: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: space.sm,
    gap: space.md,
  },
  title: { flex: 1 },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginHorizontal: -10 },
  body: { flexGrow: 0 },
  footer: { paddingTop: space.md },
});
