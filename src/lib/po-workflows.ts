import "server-only";

import { makeId, nowIso, readStore, writeStore } from "@/lib/data-store";
import {
  formatPoDateTime,
  getPoStateLabel,
  normalizeWaitlistEmail,
  normalizeWhatsapp,
  resolvePoState,
} from "@/lib/po";
import {
  sendPoOpenedSubscriberEmail,
  sendPoScheduledSubscriberEmail,
} from "@/lib/email";
import {
  PoSettings,
  PoWaitlistSubscriber,
  StoreData,
} from "@/lib/types";

type WaitlistNotificationKind = "scheduled" | "opened";

type CycleNotificationSummary = {
  kind: WaitlistNotificationKind;
  cycleId: string;
  discovered: number;
  sent: number;
  skipped: number;
};

function buildPendingSubscribers(
  store: StoreData,
  kind: WaitlistNotificationKind,
  cycleId: string,
) {
  return store.poWaitlistSubscribers.filter((subscriber) =>
    kind === "scheduled"
      ? subscriber.lastScheduledNotifiedCycleId !== cycleId
      : subscriber.lastOpenedNotifiedCycleId !== cycleId,
  );
}

function buildNotification(
  title: string,
  body: string,
  dedupeKey?: string,
) {
  return {
    id: makeId("notif"),
    title,
    body,
    href: "/seller/po",
    read: false,
    kind: "po",
    dedupeKey,
    createdAt: nowIso(),
  };
}

export function upsertPoWaitlistSubscriber(
  store: StoreData,
  input: { name: string; email: string; whatsapp: string },
) {
  const email = normalizeWaitlistEmail(input.email);
  const whatsapp = normalizeWhatsapp(input.whatsapp);
  const now = nowIso();
  const existing = store.poWaitlistSubscribers.find(
    (subscriber) => subscriber.email === email,
  );

  if (existing) {
    existing.name = input.name.trim();
    existing.whatsapp = whatsapp;
    existing.updatedAt = now;

    return {
      status: "updated" as const,
      subscriber: existing,
    };
  }

  const subscriber: PoWaitlistSubscriber = {
    id: makeId("po-sub"),
    name: input.name.trim(),
    email,
    whatsapp,
    createdAt: now,
    updatedAt: now,
  };

  store.poWaitlistSubscribers.unshift(subscriber);

  return {
    status: "created" as const,
    subscriber,
  };
}

export async function sendPoWaitlistNotifications(
  kind: WaitlistNotificationKind,
  cycleId: string,
): Promise<CycleNotificationSummary> {
  const store = await readStore();
  const pending = buildPendingSubscribers(store, kind, cycleId);
  const successfulIds: string[] = [];

  for (const subscriber of pending) {
    try {
      const result =
        kind === "scheduled"
          ? await sendPoScheduledSubscriberEmail(subscriber, store.poSettings, cycleId)
          : await sendPoOpenedSubscriberEmail(subscriber, store.poSettings, cycleId);

      if (result.sent) {
        successfulIds.push(subscriber.id);
      }
    } catch (error) {
      console.error("Failed to send PO waitlist notification", {
        kind,
        cycleId,
        subscriberId: subscriber.id,
        error,
      });
    }
  }

  if (successfulIds.length) {
    await writeStore((current) => {
      current.poWaitlistSubscribers = current.poWaitlistSubscribers.map((subscriber) => {
        if (!successfulIds.includes(subscriber.id)) {
          return subscriber;
        }

        return kind === "scheduled"
          ? {
              ...subscriber,
              lastScheduledNotifiedCycleId: cycleId,
              updatedAt: nowIso(),
            }
          : {
              ...subscriber,
              lastOpenedNotifiedCycleId: cycleId,
              updatedAt: nowIso(),
            };
      });

      return current;
    });
  }

  return {
    kind,
    cycleId,
    discovered: pending.length,
    sent: successfulIds.length,
    skipped: pending.length - successfulIds.length,
  };
}

export async function runPoScheduleSync() {
  const now = new Date();
  const nowText = nowIso();
  let cycleId = "";
  let autoOpened = false;
  let autoClosed = false;

  await writeStore((store) => {
    const state = resolvePoState(store.poSettings, now);

    if (store.poSettings.manualOverride !== null || !store.poSettings.cycleId) {
      return store;
    }

    cycleId = store.poSettings.cycleId;
    const closeDedupeKey = `po:auto-close:${cycleId}`;
    const openDedupeKey = `po:auto-open:${cycleId}`;

    if (
      state.reason === "scheduled_open" &&
      !store.notifications.some((notification) => notification.dedupeKey === openDedupeKey)
    ) {
      store.notifications.unshift(
        buildNotification(
          "PO otomatis dibuka",
          `Jadwal PO aktif. Window sekarang berjalan sampai ${formatPoDateTime(store.poSettings.scheduledEndAt, "id")}.`,
          openDedupeKey,
        ),
      );
      autoOpened = true;
    }

    if (
      store.poSettings.scheduledEndAt &&
      new Date(store.poSettings.scheduledEndAt).getTime() <= now.getTime() &&
      !store.notifications.some((notification) => notification.dedupeKey === closeDedupeKey)
    ) {
      store.notifications.unshift(
        buildNotification(
          "PO otomatis ditutup",
          "Window PO terakhir sudah selesai. Customer akan diarahkan ke halaman notice sampai kamu buka lagi.",
          closeDedupeKey,
        ),
      );
      autoClosed = true;
      store.poSettings.updatedAt = nowText;
    }

    return store;
  });

  const state = resolvePoState((await readStore()).poSettings, now);
  let emailSummary: CycleNotificationSummary | null = null;

  if (state.reason === "scheduled_open" && cycleId) {
    emailSummary = await sendPoWaitlistNotifications("opened", cycleId);
  }

  return {
    cycleId: cycleId || null,
    stateReason: state.reason,
    isOpen: state.isOpen,
    autoOpened,
    autoClosed,
    emailedOpenedSubscribers: emailSummary?.sent ?? 0,
    pendingOpenedSubscribers: emailSummary?.discovered ?? 0,
  };
}

export function describePoStatusForSeller(settings: PoSettings) {
  const state = resolvePoState(settings);

  return {
    state,
    label: getPoStateLabel(state.reason, "id"),
  };
}
