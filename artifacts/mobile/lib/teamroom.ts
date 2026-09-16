import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
} from "firebase/firestore";

/**
 * The organization's own room — one channel per org, open to everyone in it.
 *
 * The channel id IS the organization id, so there is nothing to join and
 * nothing to pick. The rules require only that the sender is a member of that
 * org and stamps their own uid; there is no permission gate, deliberately, on
 * either side — a company's own room is not a privilege.
 *
 * Messages are immutable. The rules grant create and nothing else, so nothing
 * here edits or deletes one, and the screen says so rather than offering a
 * long-press that would be refused.
 */

export const TEAM_ROOM_NOTIFICATION = "team_chat_message";

/** How much history a phone pulls. The website streams the whole channel with
 * no limit, which is fine on a desk for a young org and ruinous on a phone for
 * an old one — a year of chatter downloaded on every mount, over mobile data. */
export const ROOM_PAGE = 50;

export interface TeamMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  /** A Firestore Timestamp here, unlike the 1:1 chat's ISO strings. */
  createdAt?: unknown;
}

export interface RoomActor {
  uid: string;
  name: string;
  organizationId: string;
}

export const roomMessagesRef = (firestore: Firestore, orgId: string) =>
  collection(firestore, "teamChats", orgId, "messages");

/** Newest first and capped — the screen reverses it for an inverted list. */
export const roomQuery = (firestore: Firestore, orgId: string) =>
  query(roomMessagesRef(firestore, orgId), orderBy("createdAt", "desc"), limit(ROOM_PAGE));

/**
 * Post to the room, then tell everyone else.
 *
 * Only the message itself is awaited. The channel doc's summary and the
 * notification fan-out are best-effort: a message that was said should not be
 * reported as failed because a counter did not move, and the caller restores
 * the draft only when the message itself did not land.
 */
export async function sendTeamMessage(
  firestore: Firestore,
  actor: RoomActor,
  text: string
): Promise<void> {
  const body = text.trim();
  if (!body) return;
  const orgId = actor.organizationId;

  // The channel is created by its first message — an org that has never spoken
  // has no document, and the website expects to find one after this.
  const channel = doc(firestore, "teamChats", orgId);
  const existing = await getDoc(channel);
  if (!existing.exists()) {
    await setDoc(channel, { organizationId: orgId, createdAt: serverTimestamp() });
  }

  await addDoc(roomMessagesRef(firestore, orgId), {
    senderId: actor.uid,
    senderName: actor.name,
    text: body,
    createdAt: serverTimestamp(),
  });

  void updateDoc(channel, { lastMessage: body, lastMessageAt: serverTimestamp() }).catch(() => {});
  void fanOut(firestore, actor, body).catch(() => {});
}

/**
 * One notification each, to everyone in the org but the sender.
 *
 * `createdAt` is an ISO string rather than a server timestamp, matching what
 * the website writes and what every other notification in this app writes.
 * Firestore's `orderBy` groups by type, so a collection carrying both shapes
 * sorts wrongly on the server — which is why the notifications hook re-sorts
 * client-side, and why this must not quietly become a Timestamp.
 */
async function fanOut(firestore: Firestore, actor: RoomActor, body: string): Promise<void> {
  const members = await getDocs(
    query(collection(firestore, "users"), where("organizationId", "==", actor.organizationId))
  );
  const recipients = members.docs.filter((d) => d.id !== actor.uid);
  if (recipients.length === 0) return;

  const batch = writeBatch(firestore);
  for (const member of recipients) {
    batch.set(doc(collection(firestore, "users", member.id, "notifications")), {
      type: TEAM_ROOM_NOTIFICATION,
      title: actor.name,
      message: body.length > 80 ? `${body.slice(0, 80)}...` : body,
      organizationId: actor.organizationId,
      createdAt: new Date().toISOString(),
      read: false,
    });
  }
  await batch.commit();
}

/**
 * Clear the room's unread badge.
 *
 * There is no read state on the channel or on any message — the badge is
 * derived entirely from unread notifications of this type, so marking the room
 * read means marking those read. Web and phone must agree on this or the two
 * badges drift apart.
 */
export async function markRoomRead(firestore: Firestore, uid: string): Promise<void> {
  const unread = await getDocs(
    query(
      collection(firestore, "users", uid, "notifications"),
      where("type", "==", TEAM_ROOM_NOTIFICATION),
      where("read", "==", false)
    )
  );
  if (unread.empty) return;
  const batch = writeBatch(firestore);
  for (const d of unread.docs) batch.update(d.ref, { read: true });
  await batch.commit();
}
