import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, ActivityIndicator, Alert, StyleSheet, TextInput, Modal,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Feather } from "@expo/vector-icons";
import { storage } from "@/lib/firebase";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import type { LegalDoc } from "@/context/AuthContext";

interface Props {
  docType: string;
  label: string;
  required?: boolean;
  doc?: LegalDoc;
  orgId: string;
  onUpdate: (docType: string, data: LegalDoc) => void;
}

export function DocumentUploadRow({ docType, label, required, doc, orgId, onUpdate }: Props) {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const [uploading, setUploading] = useState(false);
  const [expiryModal, setExpiryModal] = useState(false);
  const [expiryInput, setExpiryInput] = useState(doc?.expiryDate ?? "");

  const isUploaded = !!doc?.url;

  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/jpeg", "image/png"],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setUploading(true);
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const storageRef = ref(storage, `organizations/${orgId}/documents/${docType}`);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);
      const updated: LegalDoc = { url, uploadedAt: new Date().toISOString(), expiryDate: doc?.expiryDate };
      onUpdate(docType, updated);
      setExpiryModal(true);
    } catch {
      Alert.alert(t.common.error, t.profile.uploadFailed);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveExpiry = () => {
    onUpdate(docType, { ...(doc ?? {}), expiryDate: expiryInput || undefined });
    setExpiryModal(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles.row,
          {
            flexDirection: isRTL ? "row-reverse" : "row",
            backgroundColor: isUploaded ? colors.success + "08" : colors.muted + "40",
            borderColor: isUploaded ? colors.success + "35" : colors.border,
          },
        ]}
        onPress={isUploaded ? () => setExpiryModal(true) : handleUpload}
        disabled={uploading}
        activeOpacity={0.75}
      >
        <View style={[styles.iconWrap, { backgroundColor: isUploaded ? colors.success + "18" : colors.border + "80" }]}>
          {uploading ? (
            <ActivityIndicator size="small" color={colors.cta} />
          ) : (
            <Feather name={isUploaded ? "check-circle" : "upload-cloud"} size={16} color={isUploaded ? colors.success : colors.outline} />
          )}
        </View>

        <View style={{ flex: 1, gap: 2, marginHorizontal: 12 }}>
          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 6 }}>
            <Text style={[styles.docLabel, { color: colors.foreground }]} numberOfLines={1}>
              {label}
            </Text>
            {required && !isUploaded && (
              <View style={[styles.badge, { backgroundColor: colors.destructive + "18" }]}>
                <Text style={[styles.badgeText, { color: colors.destructive }]}>{t.profile.required}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.docStatus, { color: isUploaded ? colors.success : colors.outline }]}>
            {uploading
              ? t.profile.uploading
              : isUploaded
              ? (doc?.expiryDate ? `${t.profile.expires}: ${doc.expiryDate}` : t.profile.docUploaded)
              : t.profile.tapToUpload}
          </Text>
        </View>

        <Feather
          name={isUploaded ? "edit-2" : (isRTL ? "chevron-left" : "chevron-right")}
          size={14}
          color={isUploaded ? colors.outline : colors.cta}
        />
      </TouchableOpacity>

      {/* Expiry date modal */}
      <Modal visible={expiryModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {t.profile.expiryDate}
            </Text>
            <Text style={[styles.modalSub, { color: colors.outline }]}>{label}</Text>
            <TextInput
              style={[styles.modalInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]}
              value={expiryInput}
              onChangeText={setExpiryInput}
              placeholder="MM/YYYY"
              placeholderTextColor={colors.outline}
              keyboardType="numeric"
              maxLength={7}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { borderColor: colors.border, borderWidth: 1 }]}
                onPress={() => setExpiryModal(false)}
              >
                <Text style={[styles.modalBtnText, { color: colors.outline }]}>{t.common.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.cta }]}
                onPress={handleSaveExpiry}
              >
                <Text style={[styles.modalBtnText, { color: "#FFFFFF" }]}>{t.common.save}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  docLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  docStatus: { fontSize: 11, fontFamily: "Inter_400Regular" },
  badge: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  badgeText: { fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 0.3 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  modalCard: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    gap: 14,
  },
  modalTitle: { fontSize: 16, fontFamily: "HankenGrotesk_700Bold" },
  modalSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: -6 },
  modalInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    letterSpacing: 2,
  },
  modalActions: { flexDirection: "row", gap: 10 },
  modalBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
