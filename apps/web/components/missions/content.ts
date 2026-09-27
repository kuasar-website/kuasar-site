import type { Locale } from "@/lib/i18n/segments";
import type {
  MissionLifecycleStatus,
  MissionType,
} from "@/lib/content/missions";

export type MissionCopy = {
  readonly archiveEyebrow: string;
  readonly archiveTitle: string;
  readonly archiveIntroduction: string;
  readonly archiveEmpty: string;
  readonly archiveSectionTitle: string;
  readonly detailEyebrow: string;
  readonly backToArchive: string;
  readonly openMission: (name: string) => string;
  readonly patchAlt: (name: string) => string;
  readonly labels: {
    readonly year: string;
    readonly type: string;
    readonly status: string;
    readonly competition: string;
    readonly launchDate: string;
    readonly apogee: string;
  };
  readonly types: Readonly<Record<MissionType, string>>;
  readonly statuses: Readonly<Record<MissionLifecycleStatus, string>>;
  readonly notScheduled: string;
  readonly unconfirmed: string;
  readonly galleryTitle: string;
  readonly linksTitle: string;
  readonly teamTitle: string;
  readonly incompleteTitle: string;
  readonly incompleteBody: string;
  readonly incompleteLink: string;
  readonly externalNotice: string;
};

export const MISSION_COPY: Readonly<Record<Locale, MissionCopy>> = {
  en: {
    archiveEyebrow: "Flight archive",
    archiveTitle: "Missions",
    archiveIntroduction:
      "Explore KUASAR's flight programme through the objectives, engineering work, and recorded results of each mission.",
    archiveEmpty: "No missions have been published yet.",
    archiveSectionTitle: "Mission archive",
    detailEyebrow: "Mission record",
    backToArchive: "Back to missions",
    openMission: (name) => `Open ${name} mission record`,
    patchAlt: (name) => `${name} mission patch`,
    labels: {
      year: "Year",
      type: "Mission type",
      status: "Status",
      competition: "Competition",
      launchDate: "Launch date",
      apogee: "Apogee",
    },
    types: {
      competition: "Competition",
      research: "Research",
      test: "Test",
    },
    statuses: {
      planned: "Planned",
      active: "Active",
      flown: "Flown",
      retired: "Retired",
    },
    notScheduled: "Not yet scheduled",
    unconfirmed: "Not yet confirmed",
    galleryTitle: "Gallery",
    linksTitle: "Mission links",
    teamTitle: "Team roles",
    incompleteTitle: "Translation in progress",
    incompleteBody:
      "This page contains the English material currently available. The Turkish mission record may contain more complete information.",
    incompleteLink: "Open the Turkish mission record",
    externalNotice: "External link opens in a new tab.",
  },
  tr: {
    archiveEyebrow: "Uçuş arşivi",
    archiveTitle: "Görevler",
    archiveIntroduction:
      "KUASAR'ın uçuş programını her görevin amacı, mühendislik çalışmaları ve kayıt altına alınmış sonuçları üzerinden inceleyin.",
    archiveEmpty: "Henüz yayımlanmış bir görev bulunmuyor.",
    archiveSectionTitle: "Görev arşivi",
    detailEyebrow: "Görev kaydı",
    backToArchive: "Görevlere dön",
    openMission: (name) => `${name} görev kaydını aç`,
    patchAlt: (name) => `${name} görev arması`,
    labels: {
      year: "Yıl",
      type: "Görev türü",
      status: "Durum",
      competition: "Yarışma",
      launchDate: "Fırlatma tarihi",
      apogee: "Apogee",
    },
    types: {
      competition: "Yarışma",
      research: "Araştırma",
      test: "Test",
    },
    statuses: {
      planned: "Planlandı",
      active: "Aktif",
      flown: "Uçuş tamamlandı",
      retired: "Emekliye ayrıldı",
    },
    notScheduled: "Henüz planlanmadı",
    unconfirmed: "Henüz doğrulanmadı",
    galleryTitle: "Galeri",
    linksTitle: "Görev bağlantıları",
    teamTitle: "Takım rolleri",
    incompleteTitle: "Çeviri devam ediyor",
    incompleteBody:
      "Bu sayfada şu anda mevcut olan Türkçe içerik yer alıyor. İngilizce görev kaydı tamamlanmıştır.",
    incompleteLink: "Tam İngilizce görev kaydını aç",
    externalNotice: "Harici bağlantı yeni sekmede açılır.",
  },
};
