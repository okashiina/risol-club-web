import {
  PoSettings,
  PoStateReason,
  PoWaitlistSubscriber,
  ResolvedPoState,
} from "@/lib/types";

export const PO_TIME_ZONE = "Asia/Jakarta";
const WIB_OFFSET_HOURS = 7;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toOptionalIso(value?: string) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return undefined;
  }

  const date = new Date(trimmed);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}

export function createDefaultPoSettings(updatedAt: string): PoSettings {
  return {
    manualOverride: "open",
    timezone: PO_TIME_ZONE,
    updatedAt,
  };
}

export function normalizePoSettings(
  settings: Partial<PoSettings> | undefined,
  updatedAt: string,
): PoSettings {
  const hasExistingSettings = Boolean(settings);

  return {
    manualOverride:
      settings?.manualOverride === "open" || settings?.manualOverride === "closed"
        ? settings.manualOverride
        : hasExistingSettings
          ? null
          : "open",
    scheduledStartAt: toOptionalIso(settings?.scheduledStartAt),
    scheduledEndAt: toOptionalIso(settings?.scheduledEndAt),
    timezone: PO_TIME_ZONE,
    cycleId: settings?.cycleId?.trim() || undefined,
    updatedAt: toOptionalIso(settings?.updatedAt) ?? updatedAt,
  };
}

export function normalizeWaitlistEmail(email: string) {
  return email.trim().toLowerCase();
}

export function normalizeWhatsapp(value: string) {
  return value.replace(/[^\d+]/g, "").trim();
}

export function normalizePoWaitlistSubscribers(
  subscribers: PoWaitlistSubscriber[] | undefined,
) {
  return (subscribers ?? [])
    .map((subscriber) => ({
      ...subscriber,
      name: subscriber.name.trim(),
      email: normalizeWaitlistEmail(subscriber.email),
      whatsapp: normalizeWhatsapp(subscriber.whatsapp),
      createdAt: toOptionalIso(subscriber.createdAt) ?? new Date().toISOString(),
      updatedAt: toOptionalIso(subscriber.updatedAt) ?? new Date().toISOString(),
      lastScheduledNotifiedCycleId:
        subscriber.lastScheduledNotifiedCycleId?.trim() || undefined,
      lastOpenedNotifiedCycleId:
        subscriber.lastOpenedNotifiedCycleId?.trim() || undefined,
    }))
    .filter(
      (subscriber) =>
        Boolean(subscriber.name) &&
        Boolean(subscriber.email) &&
        Boolean(subscriber.whatsapp),
    )
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

type WibDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

function parseWibInput(value: string): WibDateParts | null {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/,
  );

  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute] = match;

  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
  };
}

function getWibParts(date: Date) {
  const shifted = new Date(date.getTime() + WIB_OFFSET_HOURS * 60 * 60 * 1000);

  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

export function wibInputToIso(value: string) {
  const parts = parseWibInput(value);

  if (!parts) {
    return undefined;
  }

  const utcMillis = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour - WIB_OFFSET_HOURS,
    parts.minute,
  );

  return new Date(utcMillis).toISOString();
}

export function isoToWibInput(value?: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const parts = getWibParts(date);

  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function formatPoDateTime(
  value: string | undefined,
  locale: "id" | "en" = "id",
) {
  if (!value) {
    return locale === "en" ? "Not scheduled yet" : "Belum dijadwalkan";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const formatter = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "id-ID", {
    timeZone: PO_TIME_ZONE,
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${formatter.format(date)} WIB`;
}

export function formatPoWindow(
  startAt: string | undefined,
  endAt: string | undefined,
  locale: "id" | "en" = "id",
) {
  if (!startAt || !endAt) {
    return locale === "en"
      ? "PO follows manual control for now."
      : "PO sementara mengikuti kontrol manual.";
  }

  return `${formatPoDateTime(startAt, locale)} - ${formatPoDateTime(endAt, locale)}`;
}

export function resolvePoState(
  settings: PoSettings,
  now = new Date(),
): ResolvedPoState {
  const startAt = settings.scheduledStartAt
    ? new Date(settings.scheduledStartAt)
    : null;
  const endAt = settings.scheduledEndAt ? new Date(settings.scheduledEndAt) : null;

  if (settings.manualOverride === "open") {
    return {
      isOpen: true,
      reason: "manual_open",
      nextCloseAt: endAt && endAt.getTime() > now.getTime() ? endAt.toISOString() : undefined,
    };
  }

  if (settings.manualOverride === "closed") {
    return {
      isOpen: false,
      reason: "manual_closed",
    };
  }

  if (!startAt || !endAt) {
    return {
      isOpen: false,
      reason: "no_schedule",
    };
  }

  const nowTime = now.getTime();
  const startTime = startAt.getTime();
  const endTime = endAt.getTime();

  if (startTime <= nowTime && nowTime < endTime) {
    return {
      isOpen: true,
      reason: "scheduled_open",
      nextCloseAt: endAt.toISOString(),
    };
  }

  if (nowTime < startTime) {
    return {
      isOpen: false,
      reason: "scheduled_closed",
      nextOpenAt: startAt.toISOString(),
      nextCloseAt: endAt.toISOString(),
    };
  }

  return {
    isOpen: false,
    reason: "scheduled_closed",
  };
}

export function isPoAcceptingOrders(settings: PoSettings, now = new Date()) {
  return resolvePoState(settings, now).isOpen;
}

export function getPoClosedSince(settings: PoSettings, now = new Date()) {
  const state = resolvePoState(settings, now);

  if (state.isOpen) {
    return null;
  }

  if (state.reason === "manual_closed") {
    return settings.updatedAt;
  }

  if (settings.scheduledEndAt) {
    const endAt = new Date(settings.scheduledEndAt);

    if (endAt.getTime() <= now.getTime()) {
      return endAt.toISOString();
    }
  }

  return settings.updatedAt;
}

export function getPoStateLabel(reason: PoStateReason, locale: "id" | "en" = "id") {
  const labels: Record<PoStateReason, { id: string; en: string }> = {
    manual_open: {
      id: "PO dibuka manual",
      en: "PO is manually opened",
    },
    manual_closed: {
      id: "PO ditutup manual",
      en: "PO is manually closed",
    },
    scheduled_open: {
      id: "PO sedang berjalan sesuai jadwal",
      en: "PO is open on schedule",
    },
    scheduled_closed: {
      id: "PO lagi menunggu jadwal berikutnya",
      en: "PO is waiting for the next schedule",
    },
    no_schedule: {
      id: "PO belum dijadwalkan",
      en: "PO is not scheduled yet",
    },
  };

  return labels[reason][locale];
}
