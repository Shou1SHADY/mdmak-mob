import React, { useEffect, useState, useRef } from "react";
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  RefreshControl, Platform, StyleSheet, ScrollView,
  Modal, Animated, Pressable,
} from "react-native";
import { router } from "expo-router";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { tabScreenBottomPadding } from "@/lib/layout";
import { useT, useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { RFQCard, RFQItem } from "@/components/RFQCard";
import { CardSkeleton } from "@/components/ui/SkeletonLoader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScreenHeader } from "@/components/ScreenHeader";
import { CATEGORIES, SAUDI_CITIES, RFQ_STATUSES, CITIES_EN, displayCity } from "@/constants/data";

// The same set the website's supplier feed uses: an RFQ is browsable while it
// is open ("New") and stays visible once awarded ("Awarded") so a supplier can
// still see the outcome. "Active"/"Under Review" are contractor-side states the
// website never lists here.
const OPEN_STATUSES = ["New", "Awarded"];

/** `createdAt` is written as an ISO string by both apps; older mobile rows may
 *  still hold a Firestore Timestamp. */
function createdAtMs(value: any): number {
  if (!value) return 0;
  if (typeof value?.toDate === "function") return value.toDate().getTime();
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

export default function BrowseRFQsScreen() {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [rfqs, setRfqs] = useState<RFQItem[]>([]);
  const [filtered, setFiltered] = useState<RFQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  // Applied filters
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterCity, setFilterCity] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  // Draft filters (in-modal editing)
  const [draftCategory, setDraftCategory] = useState("All");
  const [draftCity, setDraftCity] = useState("All");
  const [draftStatus, setDraftStatus] = useState("All");

  // Filter modal
  const [filterVisible, setFilterVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const activeFilterCount = [filterCategory, filterCity, filterStatus].filter(
    (f) => f !== "All"
  ).length;

  const openFilter = () => {
    setDraftCategory(filterCategory);
    setDraftCity(filterCity);
    setDraftStatus(filterStatus);
    setFilterVisible(true);
    Animated.spring(slideAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  };

  const closeFilter = () => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setFilterVisible(false));
  };

  const applyFilter = () => {
    setFilterCategory(draftCategory);
    setFilterCity(draftCity);
    setFilterStatus(draftStatus);
    closeFilter();
  };

  const resetFilter = () => {
    setDraftCategory("All");
    setDraftCity("All");
    setDraftStatus("All");
  };

  const fetchRFQs = async () => {
    try {
      const orgId = user?.organizationId;
      // Two queries, mirroring the website: public RFQs anyone may bid on, plus
      // private ones this supplier's org was explicitly invited to. Querying the
      // whole collection instead — as this screen used to — surfaced other
      // contractors' private RFQs to every supplier.
      const [publicSnap, privateSnap] = await Promise.all([
        getDocs(query(
          collection(db, "rfqs"),
          where("status", "in", OPEN_STATUSES),
          where("visibility", "==", "public")
        )),
        orgId
          ? getDocs(query(
              collection(db, "rfqs"),
              where("allowedSupplierOrgIds", "array-contains", orgId)
            ))
          : Promise.resolve(null),
      ]);

      const byId = new Map<string, RFQItem>();
      publicSnap.docs.forEach((d) => byId.set(d.id, { id: d.id, ...d.data() } as RFQItem));
      privateSnap?.docs.forEach((d) => {
        const item = { id: d.id, ...d.data() } as RFQItem;
        if (OPEN_STATUSES.includes(item.status)) byId.set(d.id, item);
      });

      const items = Array.from(byId.values()).sort(
        (a, b) => createdAtMs(b.createdAt) - createdAtMs(a.createdAt)
      );
      setRfqs(items);
    } catch (e: any) {
      console.warn("[BrowseRFQs]", e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilters = (
    items: RFQItem[],
    s: string,
    cat: string,
    city: string,
    status: string
  ) => {
    let res = items;

    if (cat !== "All") {
      // cat is Arabic (canonical). Handle legacy English mobile data too.
      const catEn = CATEGORIES.find((c) => c.labelAr === cat)?.label ?? "";
      res = res.filter((r) => r.category === cat || r.category === catEn);
    }

    if (city !== "All") {
      // city is Arabic (canonical). Handle legacy English mobile data too.
      const cityEn = CITIES_EN[city] ?? "";
      res = res.filter((r) => r.city === city || r.city === cityEn);
    }

    if (status !== "All") res = res.filter((r) => r.status === status);

    if (s.trim()) {
      const q = s.toLowerCase();
      res = res.filter(
        (r) =>
          r.title?.toLowerCase().includes(q) ||
          r.city?.toLowerCase().includes(q) ||
          CITIES_EN[r.city ?? ""]?.toLowerCase().includes(q) ||
          r.category?.toLowerCase().includes(q)
      );
    }
    setFiltered(res);
  };

  // Depends on the org id: on first mount auth may not have resolved yet, and
  // without a re-run the invited-only RFQs would never load.
  useEffect(() => { fetchRFQs(); }, [user?.organizationId]);
  useEffect(() => {
    applyFilters(rfqs, search, filterCategory, filterCity, filterStatus);
  }, [search, filterCategory, filterCity, filterStatus, rfqs]);

  const modalTranslateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
  });

  const openStatuses = RFQ_STATUSES.filter((s) => OPEN_STATUSES.includes(s.id));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title={t.tabs.browseRfqs}
        right={
          filtered.length > 0 ? (
            <View style={[styles.countBadge, { backgroundColor: colors.cta + "15", borderColor: colors.cta + "30" }]}>
              <Text style={[styles.countText, { color: colors.cta }]}>{filtered.length}</Text>
            </View>
          ) : undefined
        }
      />

      {/* Search + filter row */}
      <View style={[styles.searchRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {/* Search field */}
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: searchFocused ? colors.background : colors.muted,
              borderColor: searchFocused ? colors.cta : colors.border,
              borderWidth: searchFocused ? 1.5 : 1,
              shadowColor: searchFocused ? colors.cta : "transparent",
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: searchFocused ? 0.18 : 0,
              shadowRadius: 6,
              elevation: searchFocused ? 3 : 0,
              flexDirection: isRTL ? "row-reverse" : "row",
            },
          ]}
        >
          <Feather name="search" size={15} color={searchFocused ? colors.cta : colors.outline} />
          <TextInput
            style={[
              styles.searchInput,
              { color: colors.foreground, textAlign: isRTL ? "right" : "left" },
            ]}
            placeholder={t.rfq.searchPlaceholder}
            placeholderTextColor={colors.outline}
            value={search}
            onChangeText={setSearch}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          {search.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearch("")}
              style={styles.clearBtn}
              accessibilityLabel={t.common.close}
            >
              <View style={[styles.clearIcon, { backgroundColor: colors.outline + "30" }]}>
                <Feather name="x" size={10} color={colors.outline} />
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Filter button */}
        <TouchableOpacity
          style={[
            styles.filterBtn,
            {
              backgroundColor: activeFilterCount > 0 ? colors.cta + "12" : colors.muted,
              borderColor: activeFilterCount > 0 ? colors.cta + "50" : colors.border,
            },
          ]}
          onPress={openFilter}
          activeOpacity={0.75}
        >
          <Feather
            name="sliders"
            size={18}
            color={activeFilterCount > 0 ? colors.cta : colors.outline}
          />
          {activeFilterCount > 0 && (
            <View style={[styles.filterBadge, { backgroundColor: colors.cta }]}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Active filter pills */}
      {activeFilterCount > 0 && (
        <View
          style={[
            styles.activePills,
            {
              backgroundColor: colors.surface,
              borderBottomColor: colors.border,
              flexDirection: isRTL ? "row-reverse" : "row",
            },
          ]}
        >
          {filterCategory !== "All" && (
            <TouchableOpacity
              style={[styles.activePill, { backgroundColor: colors.cta + "12", borderColor: colors.cta + "35" }]}
              onPress={() => setFilterCategory("All")}
            >
              <Text style={[styles.activePillText, { color: colors.cta }]} numberOfLines={1}>
                {isRTL ? filterCategory : (CATEGORIES.find((c) => c.labelAr === filterCategory)?.label ?? filterCategory)}
              </Text>
              <Feather name="x" size={11} color={colors.cta} />
            </TouchableOpacity>
          )}
          {filterCity !== "All" && (
            <TouchableOpacity
              style={[styles.activePill, { backgroundColor: colors.primaryText + "10", borderColor: colors.primaryText + "30" }]}
              onPress={() => setFilterCity("All")}
            >
              <Feather name="map-pin" size={11} color={colors.primaryText} />
              <Text style={[styles.activePillText, { color: colors.primaryText }]} numberOfLines={1}>
                {displayCity(filterCity, isRTL)}
              </Text>
              <Feather name="x" size={11} color={colors.primaryText} />
            </TouchableOpacity>
          )}
          {filterStatus !== "All" && (
            <TouchableOpacity
              style={[styles.activePill, { backgroundColor: colors.success + "10", borderColor: colors.success + "30" }]}
              onPress={() => setFilterStatus("All")}
            >
              <Text style={[styles.activePillText, { color: colors.success }]} numberOfLines={1}>
                {isRTL ? (RFQ_STATUSES.find((s) => s.id === filterStatus)?.labelAr ?? filterStatus) : filterStatus}
              </Text>
              <Feather name="x" size={11} color={colors.success} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => { setFilterCategory("All"); setFilterCity("All"); setFilterStatus("All"); }}
            hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
            style={{ paddingVertical: 6 }}
          >
            <Text style={[styles.clearAllText, { color: colors.destructive }]}>{t.rfq.resetFilters}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* RFQ List */}
      {loading ? (
        <View style={{ padding: 16, gap: 10 }}>
          {[1, 2, 3].map((k) => <CardSkeleton key={k} />)}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RFQCard rfq={item} onPress={() => router.push(`/(supplier)/rfq/${item.id}`)} />
          )}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: tabScreenBottomPadding(insets.bottom) },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchRFQs(); }}
              tintColor={colors.cta}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="search"
              title={t.rfq.noRfqsFound}
              subtitle={t.rfq.tryAdjustingFilters}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── Filter Modal ── */}
      <Modal visible={filterVisible} transparent animationType="none" onRequestClose={closeFilter}>
        <Pressable style={styles.modalOverlay} onPress={closeFilter}>
          <Animated.View
            style={[
              styles.modalSheet,
              {
                backgroundColor: colors.card,
                transform: [{ translateY: modalTranslateY }],
                paddingBottom: insets.bottom + 8,
              },
            ]}
          >
            {/* Sheet handle */}
            <View style={styles.handleWrap}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
            </View>

            {/* Header */}
            <View
              style={[
                styles.modalHeader,
                {
                  borderBottomColor: colors.border,
                  flexDirection: isRTL ? "row-reverse" : "row",
                },
              ]}
            >
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {t.rfq.filterTitle}
              </Text>
              <TouchableOpacity
                style={[styles.closeBtn, { backgroundColor: colors.muted }]}
                onPress={closeFilter}
              >
                <Feather name="x" size={16} color={colors.outline} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalBody}
            >
              {/* Category section */}
              <View style={styles.filterSection}>
                <View style={[styles.sectionHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <View style={[styles.sectionDot, { backgroundColor: colors.cta }]} />
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                    {t.rfq.category}
                  </Text>
                </View>
                <View style={styles.chipsWrap}>
                  {/* All chip */}
                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      draftCategory === "All"
                        ? { backgroundColor: colors.cta, borderColor: colors.cta }
                        : { backgroundColor: "transparent", borderColor: colors.border },
                    ]}
                    onPress={() => setDraftCategory("All")}
                  >
                    <Text style={[styles.filterChipText, { color: draftCategory === "All" ? "#FFF" : colors.onSurfaceVariant }]}>
                      {t.common.all}
                    </Text>
                  </TouchableOpacity>

                  {CATEGORIES.map((cat) => {
                    const active = draftCategory === cat.labelAr;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.filterChip,
                          active
                            ? { backgroundColor: colors.cta, borderColor: colors.cta }
                            : { backgroundColor: "transparent", borderColor: colors.border },
                        ]}
                        onPress={() => setDraftCategory(active ? "All" : cat.labelAr)}
                      >
                        <Text style={[styles.filterChipText, { color: active ? "#FFF" : colors.onSurfaceVariant }]} numberOfLines={1}>
                          {isRTL ? cat.labelAr : cat.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* City section */}
              <View style={styles.filterSection}>
                <View style={[styles.sectionHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <View style={[styles.sectionDot, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                    {t.rfq.city}
                  </Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cityScroll}>
                  {/* All */}
                  <TouchableOpacity
                    style={[
                      styles.cityChip,
                      draftCity === "All"
                        ? { backgroundColor: colors.primary, borderColor: colors.primary }
                        : { backgroundColor: "transparent", borderColor: colors.border },
                    ]}
                    onPress={() => setDraftCity("All")}
                  >
                    <Text style={[styles.filterChipText, { color: draftCity === "All" ? "#FFF" : colors.onSurfaceVariant }]}>
                      {t.common.all}
                    </Text>
                  </TouchableOpacity>
                  {SAUDI_CITIES.map((cityAr) => {
                    const active = draftCity === cityAr;
                    return (
                      <TouchableOpacity
                        key={cityAr}
                        style={[
                          styles.cityChip,
                          active
                            ? { backgroundColor: colors.primary, borderColor: colors.primary }
                            : { backgroundColor: "transparent", borderColor: colors.border },
                        ]}
                        onPress={() => setDraftCity(active ? "All" : cityAr)}
                      >
                        <Feather name="map-pin" size={11} color={active ? "#FFF" : colors.outline} />
                        <Text style={[styles.filterChipText, { color: active ? "#FFF" : colors.onSurfaceVariant }]}>
                          {displayCity(cityAr, isRTL)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Status section */}
              <View style={styles.filterSection}>
                <View style={[styles.sectionHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <View style={[styles.sectionDot, { backgroundColor: colors.success }]} />
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                    {t.rfq.status}
                  </Text>
                </View>
                <View style={[styles.statusRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  {/* All */}
                  <TouchableOpacity
                    style={[
                      styles.statusChip,
                      draftStatus === "All"
                        ? { backgroundColor: colors.success, borderColor: colors.success }
                        : { backgroundColor: "transparent", borderColor: colors.border },
                    ]}
                    onPress={() => setDraftStatus("All")}
                  >
                    <Text style={[styles.filterChipText, { color: draftStatus === "All" ? "#FFF" : colors.onSurfaceVariant }]}>
                      {t.common.all}
                    </Text>
                  </TouchableOpacity>
                  {openStatuses.map((s) => {
                    const active = draftStatus === s.id;
                    return (
                      <TouchableOpacity
                        key={s.id}
                        style={[
                          styles.statusChip,
                          {
                            backgroundColor: active ? s.color : "transparent",
                            borderColor: active ? s.color : colors.border,
                          },
                        ]}
                        onPress={() => setDraftStatus(active ? "All" : s.id)}
                      >
                        <View style={[styles.statusDot, { backgroundColor: active ? "#FFF" : s.color }]} />
                        <Text style={[styles.filterChipText, { color: active ? "#FFF" : colors.onSurfaceVariant }]}>
                          {isRTL ? s.labelAr : s.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            {/* Footer */}
            <View
              style={[
                styles.modalFooter,
                {
                  borderTopColor: colors.border,
                  flexDirection: isRTL ? "row-reverse" : "row",
                },
              ]}
            >
              <TouchableOpacity
                style={[styles.footerBtn, { borderColor: colors.border, borderWidth: 1.5 }]}
                onPress={resetFilter}
                activeOpacity={0.75}
              >
                <Feather name="refresh-ccw" size={14} color={colors.outline} />
                <Text style={[styles.footerBtnText, { color: colors.outline }]}>{t.rfq.resetFilters}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.footerBtn, { backgroundColor: colors.cta, flex: 1.6 }]}
                onPress={applyFilter}
                activeOpacity={0.85}
              >
                <Feather name="check" size={14} color="#FFF" />
                <Text style={[styles.footerBtnText, { color: "#FFF" }]}>{t.rfq.applyFilters}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  countBadge: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  countText: { fontSize: 12, fontFamily: "Inter_700Bold" },

  // Search row
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  clearBtn: { padding: 4 },
  clearIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  // Filter button
  filterBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  filterBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#FFF" },

  // Active pills bar
  activePills: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    flexWrap: "wrap",
  },
  activePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    maxWidth: 140,
  },
  activePillText: { fontSize: 12, fontFamily: "Inter_600SemiBold", flexShrink: 1 },
  clearAllText: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginLeft: 4 },

  // List
  list: { padding: 16, gap: 0 },

  // Modal overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 24,
  },

  // Sheet handle
  handleWrap: { alignItems: "center", paddingTop: 10, paddingBottom: 4 },
  handle: { width: 40, height: 4, borderRadius: 2 },

  // Modal header
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 17, fontFamily: "HankenGrotesk_700Bold" },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  // Modal body
  modalBody: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, gap: 4 },

  // Filter sections
  filterSection: { gap: 12, paddingVertical: 14 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionDot: { width: 6, height: 6, borderRadius: 3 },
  sectionTitle: { fontSize: 13, fontFamily: "Inter_700Bold", textTransform: "uppercase" },

  // Category chips
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterChip: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    maxWidth: 150,
  },
  filterChipText: { fontSize: 12, fontFamily: "Inter_500Medium" },

  // City chips
  cityScroll: { gap: 8, paddingRight: 4 },
  cityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexShrink: 0,
  },

  // Status chips
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },

  // Footer
  modalFooter: {
    flexDirection: "row",
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
  },
  footerBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: 14,
  },
  footerBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
