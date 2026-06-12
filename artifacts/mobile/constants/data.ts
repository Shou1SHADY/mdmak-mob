export const CATEGORIES = [
  { id: "iron_metals", label: "Iron & Metals", labelAr: "الحديد والمعادن", icon: "layers" },
  { id: "cement_concrete", label: "Cement & Concrete", labelAr: "الأسمنت والخرسانة", icon: "cube-scan" },
  { id: "bricks_blocks", label: "Bricks & Blocks", labelAr: "الطوب والبلوك", icon: "grid-2" },
  { id: "flooring_finishes", label: "Flooring & Finishes", labelAr: "الأرضيات والتشطيبات", icon: "square" },
  { id: "doors_windows", label: "Doors & Windows", labelAr: "الأبواب والنوافذ", icon: "door-open" },
  { id: "electrical_lighting", label: "Electrical & Lighting", labelAr: "الكهرباء والإضاءة", icon: "flash" },
  { id: "sanitary_plumbing", label: "Sanitary Ware & Plumbing", labelAr: "الصحي والسباكة", icon: "water" },
  { id: "insulation_roofing", label: "Insulation & Roofing", labelAr: "العزل والأسقف", icon: "home-hashtag" },
  { id: "paints_colors", label: "Paints & Colors", labelAr: "الدهانات والألوان", icon: "paintbucket" },
  { id: "gypsum_ceilings", label: "Gypsum & False Ceilings", labelAr: "الجبس والأسقف المستعارة", icon: "ceiling" },
  { id: "ready_mix", label: "Ready Mix Concrete", labelAr: "الخرسانة الجاهزة", icon: "truck" },
  { id: "equipment_machinery", label: "Equipment & Machinery", labelAr: "المعدات والآلات", icon: "setting-2" },
  { id: "adhesives_chemicals", label: "Adhesives & Chemicals", labelAr: "المواد اللاصقة والكيماويات", icon: "flask" },
  { id: "blacksmithing", label: "Blacksmithing", labelAr: "الحدادة", icon: "hammer" },
  { id: "hvac", label: "HVAC", labelAr: "التكييف والتهوية", icon: "wind" },
  { id: "wood", label: "Wood", labelAr: "الخشب", icon: "tree" },
];

export const SAUDI_CITIES = [
  "Riyadh", "Jeddah", "Mecca", "Medina", "Dammam",
  "Khobar", "Tabuk", "Abha", "Taif", "Buraydah",
  "Najran", "Hail", "Jizan", "Yanbu", "Jubail",
  "Khamis Mushait", "Arar", "Sakaka", "Qatif", "Dhahran",
  "Other",
];

export const RFQ_STATUSES = [
  { id: "Draft", label: "Draft", labelAr: "مسودة", color: "#94a3b8" },
  { id: "New", label: "New", labelAr: "جديد", color: "#3b82f6" },
  { id: "Active", label: "Active", labelAr: "نشط", color: "#06b6d4" },
  { id: "Under Review", label: "Under Review", labelAr: "قيد المراجعة", color: "#f59e0b" },
  { id: "Awarded", label: "Awarded", labelAr: "تم الترسية", color: "#12A063" },
  { id: "Closed", label: "Closed", labelAr: "مغلق", color: "#22c55e" },
];

export const OFFER_STATUS = {
  UNDER_REVIEW: "قيد المراجعة",
  ACCEPTED: "مقبول",
  REJECTED: "مرفوض",
  PRICE_REDUCTION: "مطلوب تخفيض",
  DELIVERED: "تم التسليم",
  IN_TRANSIT: "جاري التوصيل",
  IN_PREPARATION: "قيد التجهيز",
} as const;

export const OFFER_STATUSES = [
  { id: "قيد المراجعة", label: "Under Review", labelAr: "قيد المراجعة", color: "#f59e0b" },
  { id: "مقبول", label: "Accepted", labelAr: "مقبول", color: "#22c55e" },
  { id: "مرفوض", label: "Rejected", labelAr: "مرفوض", color: "#ef4444" },
  { id: "مطلوب تخفيض", label: "Price Reduction", labelAr: "مطلوب تخفيض", color: "#8b5cf6" },
  { id: "تم التسليم", label: "Delivered", labelAr: "تم التسليم", color: "#06b6d4" },
  { id: "جاري التوصيل", label: "In Transit", labelAr: "جاري التوصيل", color: "#3b82f6" },
  { id: "قيد التجهيز", label: "In Preparation", labelAr: "قيد التجهيز", color: "#a855f7" },
];
