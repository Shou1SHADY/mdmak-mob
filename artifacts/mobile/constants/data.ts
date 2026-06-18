// labelAr values match exactly what the web app stores in Firestore
export const CATEGORIES = [
  { id: "iron_metals",        label: "Iron & Metals",             labelAr: "حديد ومعادن",                 icon: "layers" },
  { id: "cement_concrete",    label: "Cement & Concrete",         labelAr: "أسمنت وخرسانة",               icon: "cube-scan" },
  { id: "bricks_blocks",      label: "Bricks & Blocks",           labelAr: "طوب وبلوك",                   icon: "grid-2" },
  { id: "flooring_finishes",  label: "Flooring & Finishes",       labelAr: "أرضيات وتشطيبات",             icon: "square" },
  { id: "doors_windows",      label: "Doors & Windows",           labelAr: "أبواب ونوافذ",                icon: "door-open" },
  { id: "electrical_lighting",label: "Electrical & Lighting",     labelAr: "كهرباء وإنارة",               icon: "flash" },
  { id: "sanitary_plumbing",  label: "Sanitary Ware & Plumbing",  labelAr: "أدوات صحية وسباكة",           icon: "water" },
  { id: "insulation_roofing", label: "Insulation & Roofing",      labelAr: "عزل وأسقف",                   icon: "home-hashtag" },
  { id: "paints_colors",      label: "Paints & Colors",           labelAr: "دهانات وألوان",               icon: "paintbucket" },
  { id: "gypsum_ceilings",    label: "Gypsum & False Ceilings",   labelAr: "جبس وأسقف مستعارة",           icon: "ceiling" },
  { id: "ready_mix",          label: "Ready Mix Concrete",        labelAr: "خرسانة جاهزة ومواد خام",     icon: "truck" },
  { id: "equipment_machinery",label: "Equipment & Machinery",     labelAr: "معدات وآليات",                icon: "setting-2" },
  { id: "adhesives_chemicals",label: "Adhesives & Chemicals",     labelAr: "مواد لاصقة وكيميائية",        icon: "flask" },
  { id: "blacksmithing",      label: "Blacksmithing & Metal Works",labelAr: "حدادة ومصنوعات معدنية",     icon: "hammer" },
  { id: "hvac",               label: "HVAC",                      labelAr: "تكييف وتهوية (HVAC)",         icon: "wind" },
  { id: "wood",               label: "Wood",                      labelAr: "أخشاب",                       icon: "tree" },
];

// Arabic strings are the canonical Firestore values (matching the web app)
export const SAUDI_CITIES = [
  "الرياض", "جدة", "مكة المكرمة", "المدينة المنورة", "الدمام",
  "الخبر", "الظهران", "الأحساء", "الجبيل", "تبوك",
  "حائل", "القصيم", "بريدة", "عنيزة", "أبها",
  "خميس مشيط", "جازان", "نجران", "الباحة", "سكاكا",
  "عرعر",
];

// Arabic → English display translation for SAUDI_CITIES
export const CITIES_EN: Record<string, string> = {
  "الرياض":          "Riyadh",
  "جدة":             "Jeddah",
  "مكة المكرمة":     "Makkah",
  "المدينة المنورة": "Madinah",
  "الدمام":          "Dammam",
  "الخبر":           "Khobar",
  "الظهران":         "Dhahran",
  "الأحساء":         "Al Ahsa",
  "الجبيل":          "Jubail",
  "تبوك":            "Tabuk",
  "حائل":            "Hail",
  "القصيم":          "Qassim",
  "بريدة":           "Buraidah",
  "عنيزة":           "Unaizah",
  "أبها":            "Abha",
  "خميس مشيط":      "Khamis Mushait",
  "جازان":           "Jazan",
  "نجران":           "Najran",
  "الباحة":          "Al Baha",
  "سكاكا":           "Sakaka",
  "عرعر":            "Arar",
};

// Reverse map: English name → Arabic (for handling legacy English city values in old data)
export const CITIES_AR: Record<string, string> = Object.fromEntries(
  Object.entries(CITIES_EN).map(([ar, en]) => [en, ar])
);

/** Returns the Arabic canonical city name regardless of whether input is Arabic or English */
export function normalizeCityToAr(city: string): string {
  return CITIES_AR[city] ?? city;
}

/** Display city in the correct locale */
export function displayCity(city: string, isRTL: boolean): string {
  if (isRTL) return city; // already Arabic or keep as-is
  return CITIES_EN[city] ?? CITIES_EN[CITIES_AR[city] ?? ""] ?? city;
}

export const CITIES_DISTRICTS: Record<string, string[]> = {
  "الرياض": ["شمال الرياض", "جنوب الرياض", "شرق الرياض", "غرب الرياض", "وسط الرياض", "جميع الرياض"],
  "جدة": ["شمال جدة", "جنوب جدة", "وسط جدة", "أبحر", "جميع جدة"],
  "مكة المكرمة": ["العزيزية", "الشوقية", "العوالي", "بطحاء قريش", "جميع مكة"],
  "المدينة المنورة": ["العزيزية", "الخالدية", "الحرة الشرقية", "جميع المدينة"],
  "الدمام": ["شرق الدمام", "غرب الدمام", "وسط الدمام", "جميع الدمام"],
  "الخبر": ["شمال الخبر", "الخبر الجنوبية", "العقربية", "جميع الخبر"],
  "الظهران": ["حي الدانة", "حي الدوحة", "حي القصور", "جميع الظهران"],
  "الأحساء": ["الهفوف", "المبرز", "العيون", "العمران", "جميع الأحساء"],
  "الجبيل": ["الجبيل الصناعية", "الجبيل البلد", "جميع الجبيل"],
  "تبوك": ["المروج", "الروضة", "السليمانية", "جميع تبوك"],
  "حائل": ["صديان", "أجا", "النقرة", "جميع حائل"],
  "القصيم": ["بريدة", "عنيزة", "الرس", "البدائع", "جميع القصيم"],
  "أبها": ["حي المنسك", "حي الموظفين", "حي الخالدية", "جميع أبها"],
  "خميس مشيط": ["الرصراص", "الشباعة", "شكر", "جميع خميس مشيط"],
  "جازان": ["حي السويس", "حي الروضة", "حي الشاطئ", "جميع جازان"],
  "نجران": ["الفيصلية", "الخالدية", "الفهد", "جميع نجران"],
};

export const RFQ_STATUSES = [
  { id: "Draft",        label: "Draft",         labelAr: "مسودة",           color: "#94a3b8" },
  { id: "New",          label: "New",            labelAr: "جديد",            color: "#3b82f6" },
  { id: "Active",       label: "Active",         labelAr: "نشط",             color: "#06b6d4" },
  { id: "Under Review", label: "Under Review",   labelAr: "قيد المراجعة",   color: "#f59e0b" },
  { id: "Awarded",      label: "Awarded",        labelAr: "تم الترسية",     color: "#12A063" },
  { id: "Closed",       label: "Closed",         labelAr: "مغلق",            color: "#22c55e" },
];

export const OFFER_STATUS = {
  UNDER_REVIEW:     "قيد المراجعة",
  ACCEPTED:         "مقبول",
  REJECTED:         "مرفوض",
  PRICE_REDUCTION:  "مطلوب تخفيض",
  DELIVERED:        "تم التسليم",
  IN_TRANSIT:       "جاري التوصيل",
  IN_PREPARATION:   "قيد التجهيز",
} as const;

export const OFFER_STATUSES = [
  { id: "قيد المراجعة",    label: "Under Review",   labelAr: "قيد المراجعة",   color: "#f59e0b" },
  { id: "مقبول",           label: "Accepted",        labelAr: "مقبول",           color: "#22c55e" },
  { id: "مرفوض",           label: "Rejected",        labelAr: "مرفوض",           color: "#ef4444" },
  { id: "مطلوب تخفيض",    label: "Price Reduction", labelAr: "مطلوب تخفيض",    color: "#8b5cf6" },
  { id: "تم التسليم",      label: "Delivered",       labelAr: "تم التسليم",      color: "#06b6d4" },
  { id: "جاري التوصيل",   label: "In Transit",      labelAr: "جاري التوصيل",   color: "#3b82f6" },
  { id: "قيد التجهيز",    label: "In Preparation",  labelAr: "قيد التجهيز",    color: "#a855f7" },
];
