import type { Locale } from "@/lib/i18n/segments";

type TextSection = {
  readonly heading: string;
  readonly body: string;
};

type ActionCopy = {
  readonly heading: string;
  readonly body: string;
  readonly label: string;
  readonly accessibleLabel: string;
  readonly externalNotice: string;
};

type AboutCopy = {
  readonly eyebrow: string;
  readonly title: string;
  readonly titleFont: "display" | "sans";
  readonly introduction: string;
  readonly sections: readonly TextSection[];
  readonly action: ActionCopy;
};

type TeamCopy = {
  readonly name: "Propulsion" | "Avionics" | "Structures" | "Software";
  readonly responsibility: string;
};

type JoinCopy = {
  readonly eyebrow: string;
  readonly title: string;
  readonly titleFont: "display" | "sans";
  readonly introduction: string;
  readonly teamsLabel: string;
  readonly teams: readonly TeamCopy[];
  readonly action: ActionCopy;
};

export const ABOUT_COPY: Readonly<Record<Locale, AboutCopy>> = {
  en: {
    eyebrow: "About KUASAR",
    title: "We build student rockets as one engineering team.",
    titleFont: "display",
    introduction:
      "KUASAR is a student rocketry team at Koç University. Four sub-teams turn a flight objective into hardware, software, tests, and flight data.",
    sections: [
      {
        heading: "How we work",
        body:
          "Propulsion, Avionics, Structures, and Software work on one vehicle. Each decision has to survive integration, testing, and flight.",
      },
      {
        heading: "Why partners matter",
        body:
          "Support gives students access to materials, manufacturing, test time, and the tools needed to learn through real engineering work.",
      },
    ],
    action: {
      heading: "Start a conversation",
      body:
        "Use the club's Connect Us form for partnership and sponsorship enquiries.",
      label: "Open Connect Us form",
      accessibleLabel: "Open the Connect Us Google Form in a new tab",
      externalNotice: "Opens Google Forms in a new tab.",
    },
  },
  tr: {
    eyebrow: "KUASAR Hakkında",
    title: "Roketi birlikte geliştiriyor, test ediyor ve uçuruyoruz.",
    titleFont: "sans",
    introduction:
      "KUASAR, Koç Üniversitesi öğrencilerinin oluşturduğu bir roket takımıdır. Dört alt takım, bir uçuş hedefini donanıma, yazılıma, testlere ve uçuş verisine dönüştürür.",
    sections: [
      {
        heading: "Nasıl çalışıyoruz",
        body:
          "Propulsion, Avionics, Structures ve Software aynı araç üzerinde çalışır. Her kararın entegrasyon, test ve uçuş koşullarında karşılığını bulması gerekir.",
      },
      {
        heading: "Destek neden önemli",
        body:
          "Destek; öğrencilerin malzemeye, üretim olanaklarına, test süresine ve gerçek mühendislik çalışmaları için gereken araçlara erişmesini sağlar.",
      },
    ],
    action: {
      heading: "İletişime geçelim",
      body:
        "İş birliği ve sponsorluk görüşmeleri için kulüp hesabındaki Connect Us formunu kullanın.",
      label: "Connect Us formunu aç",
      accessibleLabel: "Connect Us Google Formunu yeni sekmede aç",
      externalNotice: "Google Forms yeni bir sekmede açılır.",
    },
  },
};

export const JOIN_COPY: Readonly<Record<Locale, JoinCopy>> = {
  en: {
    eyebrow: "Join KUASAR",
    title: "Choose the work you want to learn by doing.",
    titleFont: "display",
    introduction:
      "KUASAR brings four engineering disciplines around one flight objective. Find the sub-team where you can contribute, ask questions, and build alongside other students.",
    teamsLabel: "KUASAR sub-teams",
    teams: [
      {
        name: "Propulsion",
        responsibility:
          "Designs, tests, and integrates the system that produces thrust.",
      },
      {
        name: "Avionics",
        responsibility:
          "Builds flight electronics, sensing, telemetry, and recovery control.",
      },
      {
        name: "Structures",
        responsibility:
          "Designs the airframe, mechanical interfaces, and recovery structures.",
      },
      {
        name: "Software",
        responsibility:
          "Builds flight and ground software, data tools, and test support systems.",
      },
    ],
    action: {
      heading: "Apply to the team",
      body:
        "Tell us what you want to work on through the club's Join Us form.",
      label: "Open Join Us form",
      accessibleLabel: "Open the Join Us Google Form in a new tab",
      externalNotice: "Opens Google Forms in a new tab.",
    },
  },
  tr: {
    eyebrow: "KUASAR'a Katıl",
    title: "Bize Katıl",
    titleFont: "display",
    introduction:
      "KUASAR, dört mühendislik disiplinini tek bir uçuş hedefi etrafında buluşturur. Katkı sunabileceğiniz, soru sorabileceğiniz ve diğer öğrencilerle birlikte üretebileceğiniz alt takımı seçin.",
    teamsLabel: "KUASAR alt takımları",
    teams: [
      {
        name: "Propulsion",
        responsibility:
          "İtki üreten sistemin tasarım, test ve araç entegrasyonu üzerinde çalışır.",
      },
      {
        name: "Avionics",
        responsibility:
          "Uçuş elektroniği, algılama, telemetri ve kurtarma kontrol sistemlerini geliştirir.",
      },
      {
        name: "Structures",
        responsibility:
          "Gövdeyi, mekanik arayüzleri ve kurtarma yapılarını tasarlar.",
      },
      {
        name: "Software",
        responsibility:
          "Uçuş ve yer yazılımlarını, veri araçlarını ve test destek sistemlerini geliştirir.",
      },
    ],
    action: {
      heading: "Takıma başvur",
      body:
        "Hangi alanda çalışmak istediğinizi kulüp hesabındaki Bize Katıl formundan anlatın.",
      label: "Bize Katıl formunu aç",
      accessibleLabel: "Bize Katıl Google Formunu yeni sekmede aç",
      externalNotice: "Google Forms yeni bir sekmede açılır.",
    },
  },
};
