// i18n — team: team, connections.
//
// Both languages live side by side so a string is never added to one without
// the other, and `ar` is typed from `en`: a key missing from either side, or
// present in only one, fails the typecheck. Add new strings for this module
// HERE, never in en.ts / ar.ts, which only assemble the modules.

export const en = {
  team: {
    title: "Team",
    noMembers: "No team members",
    noMembersDesc: "Invite teammates to collaborate",
  },
  connections: {
    title: "Connections",
    invitations: "Invitations",
    connected: "Connected contractors",
    noInvitations: "No pending invitations",
    noConnections: "No connections yet",
    noConnectionsHint: "Contractors who invite you appear here.",
    accept: "Accept",
    decline: "Decline",
    accepted: "Invitation accepted",
    declined: "Invitation declined",
    failed: "Could not complete. Please try again.",
    invitedYou: "invited you to their supplier directory",
    since: "Connected",
  },
};

export const ar: typeof en = {
  team: {
    title: "الفريق",
    noMembers: "لا يوجد أعضاء",
    noMembersDesc: "ادع زملاءك للتعاون",
  },
  connections: {
    title: "الروابط",
    invitations: "الدعوات",
    connected: "المقاولون المرتبطون",
    noInvitations: "لا توجد دعوات معلقة",
    noConnections: "لا توجد روابط",
    noConnectionsHint: "يظهر هنا المقاولون الذين يدعونك.",
    accept: "قبول",
    decline: "رفض",
    accepted: "تم قبول الدعوة",
    declined: "تم رفض الدعوة",
    failed: "تعذّر إتمام العملية. حاول مرة أخرى.",
    invitedYou: "دعاك للانضمام إلى دليل مورّديه",
    since: "مرتبط",
  },
};
