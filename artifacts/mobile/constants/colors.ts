const colors = {
  light: {
    text: "#0B1220",
    tint: "#0369A1",

    // A cool, slightly deeper ground than the website's slate-50, so a white
    // card reads as a lifted object rather than a faint outline.
    background: "#F3F5F9",
    foreground: "#0B1220",

    card: "#FFFFFF",
    cardForeground: "#0B1220",

    // primary is a FILL: a solid brand surface with primaryForeground on it.
    // primaryText is the same brand as INK on the page. They were one token,
    // and the token cannot be both — a fill has to contrast with the page and
    // ink has to contrast with it, which are opposite requirements. Inverting
    // the single token for dark mode duly turned fourteen filled buttons and
    // the register hero into near-white panels with white text on them.
    primary: "#0F172A",
    primaryForeground: "#FFFFFF",
    primaryText: "#0F172A",

    cta: "#0369A1",
    ctaForeground: "#FFFFFF",

    secondary: "#334155",
    secondaryForeground: "#FFFFFF",

    muted: "#F1F5F9",
    mutedForeground: "#475569", // 7.6:1 — was #64748B at 4.6:1

    accent: "#20CBD5",
    accentForeground: "#04252A", // white on teal is 2.0:1
    // Teal as INK (a badge's text) cannot be the teal itself on a light ground;
    // this is the deep teal that reads on white and on accentSoft.
    accentText: "#0B6E75",

    destructive: "#C81E1E", // AA on white, on the page and on destructiveSoft
    destructiveForeground: "#FFFFFF",

    success: "#0F7A4C", // 5.4:1 both ways — was #12A063 at 3.4:1
    successForeground: "#FFFFFF",

    warning: "#976000", // AA on white, on the page and on warningSoft
    warningForeground: "#FFFFFF",

    border: "#E1E6EE",
    input: "#E1E6EE",

    surface: "#FFFFFF",
    surfaceSecondary: "#F3F5F9",

    tabBar: "#FFFFFF",
    header: "#F3F5F9",

    // Soft tints: the ground of a badge, chip or callout in its tone. Solid
    // colours, not alpha, so they look the same over a card and over the page
    // and can be tuned per theme instead of inverting into mud.
    ctaSoft: "#E4F0F9",
    accentSoft: "#DCF5F7",
    successSoft: "#E2F3EA",
    warningSoft: "#FBF0D9",
    destructiveSoft: "#FCE7E7",
    purple: "#5B5BD6",
    purpleSoft: "#ECEBFB",
    /** Modal / sheet backdrop. */
    overlay: "rgba(8, 15, 30, 0.45)",

    drawerBg: "#0F172A",
    drawerText: "#F8FAFC",
    drawerActive: "#0369A1",
    drawerHover: "#1E293B",

    accentBlueSoft: "#E0E7FF",
    accentPurpleSoft: "#EEF2FF",
    surfaceGray: "#F1F5F9",
    outline: "#5F6E82", // AA on the deeper page ground, on white and on muted
    onSurfaceVariant: "#334155", // 10.9:1

    chartColors: ["#0F172A", "#0369A1", "#12A063", "#334155", "#64748B"],

    gradientPrimary: ["#0F172A", "#1E3A5F"] as [string, string],
    gradientBlue: ["#0369A1", "#0284C7"] as [string, string],
    gradientTeal: ["#0F172A", "#0369A1"] as [string, string],
    gradientGlass: ["rgba(255,255,255,0.12)", "rgba(255,255,255,0.05)"] as [string, string],

    textWhite: "#FFFFFF",
    textWhite80: "rgba(255,255,255,0.8)",
    textWhite60: "rgba(255,255,255,0.6)",
    textWhite40: "rgba(255,255,255,0.4)",
    textWhite12: "rgba(255,255,255,0.12)",

    pillBlue: "#E0E7FF",
    pillLavender: "#EEF2FF",
    pillBlueText: "#94A3B8",
    pillTeal: "#0D9488",
    tealAccent: "#20CBD5",
    purpleAccent: "#6366F1",
    whatsappGreen: "#25D366",

    atmosphericBlue: "rgba(3, 105, 161, 0.05)",
    atmosphericPurple: "rgba(99, 102, 241, 0.05)",
    glowBlue: "rgba(3, 105, 161, 0.1)",
    glowTeal: "rgba(32, 203, 213, 0.1)",
  },

  dark: {
    text: "#EAEFF7",
    tint: "#4DA3FF",

    background: "#0A0E17",
    foreground: "#EAEFF7",

    card: "#171F2E", // more separation from background
    cardForeground: "#EAEFF7",

    // The brand navy cannot be a fill here — it is the background. A deep
    // brand blue keeps the "filled, important" reading and carries white at
    // 6.6:1, while staying clearly distinct from the lighter cta blue.
    primary: "#1C5FA6",
    primaryForeground: "#FFFFFF",
    // Brand ink and brand tints: 10:1 on the background.
    primaryText: "#A6C3E8",

    cta: "#4DA3FF",
    ctaForeground: "#04101F",

    secondary: "#93A3BA",
    secondaryForeground: "#0A0E17",

    muted: "#202A3B", // reads as a filled chip, not a void
    mutedForeground: "#93A3BA",

    accent: "#2DD4BF",
    accentForeground: "#032622",
    accentText: "#2DD4BF",

    destructive: "#FF7070",
    destructiveForeground: "#1A0505",

    success: "#3DD68C",
    successForeground: "#04170D",

    warning: "#F5B544",
    warningForeground: "#1C1200",

    border: "#28344A", // visible against the lifted card
    input: "#1B2432",

    surface: "#131A27", // matches card
    surfaceSecondary: "#0D131E",

    tabBar: "#131A27",
    header: "#0D131E",

    // Soft tints for dark: deep, desaturated grounds that keep the tone's hue
    // legible under its text colour (4.5:1 or better for every pair).
    ctaSoft: "#15304F",
    accentSoft: "#0F3336",
    successSoft: "#12321F",
    warningSoft: "#3A2C0F",
    destructiveSoft: "#3B1717",
    purple: "#A78BFA",
    purpleSoft: "#26224A",
    /** Modal / sheet backdrop. */
    overlay: "rgba(2, 6, 14, 0.6)",

    drawerBg: "#0A0E17",
    drawerText: "#EAEFF7",
    drawerActive: "#4DA3FF",
    drawerHover: "#202A3B",

    accentBlueSoft: "#17273D",
    accentPurpleSoft: "#1D2440",
    surfaceGray: "#202A3B",
    outline: "#8797AF", // ~5.6:1 on the dark background
    onSurfaceVariant: "#AEBBCE",

    chartColors: ["#4DA3FF", "#2DD4BF", "#3DD68C", "#F5B544", "#A78BFA"],

    // The app-wide header gradient, under white text on eleven screens. It ran
    // from the page colour to almost the page colour, so every header dissolved
    // into the screen behind it — in light mode the same gradient is a solid
    // navy block. A deep brand blue restores the header as a surface: 9.3:1
    // under white, 2.0:1 against the page.
    gradientPrimary: ["#17518C", "#0C2A4A"] as [string, string],
    gradientBlue: ["#4DA3FF", "#1C5FA6"] as [string, string],
    gradientTeal: ["#0A0E17", "#1C5FA6"] as [string, string],
    gradientGlass: ["rgba(255,255,255,0.06)", "rgba(255,255,255,0.02)"] as [string, string],

    textWhite: "#F8FAFC",
    textWhite80: "rgba(248,250,252,0.85)",
    textWhite60: "rgba(248,250,252,0.65)",
    textWhite40: "rgba(248,250,252,0.45)",
    textWhite12: "rgba(248,250,252,0.15)",

    pillBlue: "#1C2A42",
    pillLavender: "#1E2A42",
    pillBlueText: "#94A3B8",
    pillTeal: "#20CBD5",
    tealAccent: "#20CBD5",
    purpleAccent: "#818CF8",
    whatsappGreen: "#25D366",

    atmosphericBlue: "rgba(56, 189, 248, 0.06)",
    atmosphericPurple: "rgba(129, 140, 248, 0.06)",
    glowBlue: "rgba(56, 189, 248, 0.12)",
    glowTeal: "rgba(32, 203, 213, 0.12)",
  },

  // The four radii of lib/design.ts (hairline 4, pill 8, control 12, card 16),
  // under the names older screens already use. Anything larger collapsed onto
  // the card radius — 20 and 24 were what made cards, sheets and inputs look
  // like three different products.
  radius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 12,
    xl: 16,
    "2xl": 16,
    "3xl": 16,
    full: 999,
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    base: 16,
    lg: 20,
    xl: 24,
    "2xl": 32,
    "3xl": 40,
    "4xl": 48,
  },

  shadow: {
    none: {
      shadowColor: "transparent",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    sm: {
      shadowColor: "#050810",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 1,
    },
    md: {
      shadowColor: "#050810",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 16,
      elevation: 3,
    },
    lg: {
      shadowColor: "#050810",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.07,
      shadowRadius: 32,
      elevation: 6,
    },
    xl: {
      shadowColor: "#050810",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.09,
      shadowRadius: 40,
      elevation: 10,
    },
    primary: {
      shadowColor: "#0369A1",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 20,
      elevation: 8,
    },
    card: {
      shadowColor: "#050810",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 14,
      elevation: 3,
    },
    nav: {
      shadowColor: "#050810",
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.05,
      shadowRadius: 16,
      elevation: 6,
    },
    logo: {
      shadowColor: "#0369A1",
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.18,
      shadowRadius: 36,
      elevation: 20,
    },
  },

  // The same four sizes and two weights as lib/design.ts, under the role names
  // older screens use. Every line height is >= 1.6x for Arabic.
  typography: {
    display: { fontSize: 24, lineHeight: 40, fontFamily: "Inter_600SemiBold" as const },
    h1: { fontSize: 24, lineHeight: 40, fontFamily: "Inter_600SemiBold" as const },
    h2: { fontSize: 24, lineHeight: 40, fontFamily: "Inter_600SemiBold" as const },
    h3: { fontSize: 17, lineHeight: 28, fontFamily: "Inter_600SemiBold" as const },
    h4: { fontSize: 17, lineHeight: 28, fontFamily: "Inter_600SemiBold" as const },
    body: { fontSize: 14, lineHeight: 24, fontFamily: "Inter_400Regular" as const },
    bodySm: { fontSize: 14, lineHeight: 24, fontFamily: "Inter_400Regular" as const },
    caption: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_400Regular" as const },
    label: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_600SemiBold" as const },
    button: { fontSize: 14, lineHeight: 24, fontFamily: "Inter_600SemiBold" as const },
    buttonSm: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_600SemiBold" as const },
    overline: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_600SemiBold" as const },
    stat: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_600SemiBold" as const },
  },
};

export default colors;
