import type { Locale } from "@/lib/i18n/config";

// Sample content for the dev-only style guide, in both languages so every component is seen in RTL and LTR.
// Not UI text: the page is a 404 in production, so this never reaches a visitor. It stays out of messages/*.json,
// which the layout hands to the browser on every page (NextIntlClientProvider).

type Samples = {
  title: string;
  intro: string;
  sections: Record<
    | "colors"
    | "typography"
    | "buttons"
    | "cards"
    | "bento"
    | "labels"
    | "headers"
    | "forms"
    | "alerts",
    string
  >;
  typeSample: string;
  buttons: { primary: string; ghost: string; link: string; disabled: string };
  card: { title: string; body: string };
  bento: {
    heroTitle: string;
    heroBody: string;
    demoTitle: string;
    demoBody: string;
    postTitle: string;
    postBody: string;
    stackTitle: string;
    statusTitle: string;
    statusBody: string;
  };
  tags: string[];
  header: { eyebrow: string; title: string; description: string; action: string };
  form: {
    name: string;
    email: string;
    emailHint: string;
    emailError: string;
    message: string;
    messagePlaceholder: string;
    send: string;
  };
  alerts: {
    infoTitle: string;
    info: string;
    successTitle: string;
    success: string;
    dangerTitle: string;
    danger: string;
  };
};

export const samples: Record<Locale, Samples> = {
  en: {
    title: "Style guide",
    intro:
      "Every UI component on one page. Switch the theme and the language in the header to check both.",
    sections: {
      colors: "Colors",
      typography: "Typography",
      buttons: "Buttons",
      cards: "Card",
      bento: "Bento grid",
      labels: "Tags & badges",
      headers: "Section header",
      forms: "Form fields",
      alerts: "Alerts",
    },
    typeSample: "Real systems under hard constraints",
    buttons: {
      primary: "Start a project",
      ghost: "View resume",
      link: "Read the case study",
      disabled: "Sending…",
    },
    card: {
      title: "Gym management system",
      body: "Check-in, lockers and memberships for a real gym, with live capacity.",
    },
    bento: {
      heroTitle: "Mahdi Azghandi",
      heroBody: "Full-stack engineer: C#/.NET back-end, React/TypeScript front-end.",
      demoTitle: "Live demo",
      demoBody: "Two buyers, one seat: watch the database pick the winner.",
      postTitle: "Latest post",
      postBody: "Row locks in PostgreSQL, explained with cinema seats.",
      stackTitle: "Stack",
      statusTitle: "Status",
      statusBody: "Projects carry their state.",
    },
    tags: ["C#", ".NET", "React", "TypeScript", "PostgreSQL", "Docker", "architecture"],
    header: {
      eyebrow: "Blog",
      title: "Latest posts",
      description: "Notes on .NET, React and building under real constraints.",
      action: "All posts",
    },
    form: {
      name: "Name",
      email: "Email",
      emailHint: "Only used to reply to you.",
      emailError: "Enter a valid email address.",
      message: "Message",
      messagePlaceholder: "What are you building?",
      send: "Send",
    },
    alerts: {
      infoTitle: "Sandbox data",
      info: "This demo runs on real endpoints with data that resets every hour.",
      successTitle: "Message sent",
      success: "Thanks — you'll get a reply within two working days.",
      dangerTitle: "Couldn't send",
      danger: "Please check the highlighted fields and try again.",
    },
  },
  fa: {
    title: "راهنمای طراحی",
    intro:
      "همه اجزای رابط کاربری در یک صفحه. برای دیدن هر دو حالت، تم و زبان را از سربرگ عوض کنید.",
    sections: {
      colors: "رنگ‌ها",
      typography: "تایپوگرافی",
      buttons: "دکمه‌ها",
      cards: "کارت",
      bento: "شبکه بنتو",
      labels: "برچسب‌ها و نشان‌ها",
      headers: "سرعنوان بخش",
      forms: "فیلدهای فرم",
      alerts: "پیام‌ها",
    },
    typeSample: "سیستم‌های واقعی، زیر محدودیت‌های سخت",
    buttons: {
      primary: "شروع یک پروژه",
      ghost: "دیدن رزومه",
      link: "خواندن شرح پروژه",
      disabled: "در حال ارسال…",
    },
    card: {
      title: "سامانه مدیریت باشگاه",
      body: "پذیرش، کمدها و عضویت‌های یک باشگاه واقعی، با ظرفیت زنده.",
    },
    bento: {
      heroTitle: "مهدی ازقندی",
      heroBody: "مهندس فول‌استک: بک‌اند C#/.NET و فرانت‌اند React/TypeScript.",
      demoTitle: "دموی زنده",
      demoBody: "دو خریدار، یک صندلی: ببینید پایگاه داده برنده را چطور انتخاب می‌کند.",
      postTitle: "تازه‌ترین نوشته",
      postBody: "قفل سطری در PostgreSQL، با مثال صندلی سینما.",
      stackTitle: "فناوری‌ها",
      statusTitle: "وضعیت",
      statusBody: "هر پروژه وضعیت خودش را دارد.",
    },
    tags: ["C#", ".NET", "React", "TypeScript", "PostgreSQL", "Docker", "معماری"],
    header: {
      eyebrow: "بلاگ",
      title: "تازه‌ترین نوشته‌ها",
      description: "یادداشت‌هایی درباره ‎.NET، React و ساختن زیر محدودیت‌های واقعی.",
      action: "همه نوشته‌ها",
    },
    form: {
      name: "نام",
      email: "ایمیل",
      emailHint: "فقط برای پاسخ دادن به شما.",
      emailError: "یک نشانی ایمیل معتبر وارد کنید.",
      message: "پیام",
      messagePlaceholder: "چه چیزی می‌سازید؟",
      send: "ارسال",
    },
    alerts: {
      infoTitle: "داده آزمایشی",
      info: "این دمو روی endpointهای واقعی اجرا می‌شود و داده‌هایش هر ساعت از نو ساخته می‌شوند.",
      successTitle: "پیام ارسال شد",
      success: "ممنون — ظرف دو روز کاری پاسخ می‌گیرید.",
      dangerTitle: "ارسال نشد",
      danger: "لطفاً فیلدهای مشخص‌شده را بررسی کنید و دوباره بفرستید.",
    },
  },
};
