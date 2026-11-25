import { GUIDE_LABELS } from "./guide-labels";
import type { LanguageCode } from "./constants";

/**
 * What the app can do and where to find it. This is the one place the assistant learns about the app, so the
 * answers always match the app as it is built. Names of buttons and screens are written between double square brackets. A label is
 * the app's own English sentence; `guide-labels.ts` (generated from the app's translations) turns it into the name
 * the person sees in their language, so the assistant never invents a menu name.
 *
 * Adding a feature to the app means adding an entry here. `npm run check:i18n -w @oracle/mobile` fails when a
 * label in brackets is not a real, translated sentence of the app.
 */
export type GuideEntry = {
  id: string;
  /** Short English title, for the assistant to match against the question. */
  topic: string;
  /** Words people use for it, in any language. */
  keywords: string[];
  steps: string[];
  /** Things to know. Optional. */
  notes?: string[];
};

export const APP_GUIDE: GuideEntry[] = [
  {
    id: "add-transaction",
    topic: "Add an expense, income or transfer",
    keywords: ["add", "record", "expense", "income", "transfer", "catat", "tambah", "pengeluaran", "pemasukan", "transaksi"],
    steps: [
      "Tap the round [[Add transaction]] button in the middle of the bottom bar.",
      "Pick [[Expense]], [[Income]] or [[Transfer]] at the top.",
      "Type the amount with the keypad, choose the account, the category and the date, and add a description if you like.",
      "Tap [[Save Transaction]].",
    ],
    notes: [
      "An expense or a transfer is refused when it would take an account below zero. A debt account (paylater or credit card) may go below zero, because bills are exempt. Each account keeps its own balance, and money from other accounts is never used.",
      "A transfer moves money between two of your accounts. It is not income and not an expense. An admin fee (optional) is booked as an expense on the account the money leaves.",
      "You can also ask the assistant to add records. It shows cards that you confirm.",
    ],
  },
  {
    id: "edit-transaction",
    topic: "Change or delete a transaction",
    keywords: ["edit", "change", "delete", "remove", "ubah", "hapus", "koreksi"],
    steps: [
      "On [[Home]], tap [[See all]] next to [[Recent Transactions]], or open an account from [[Accounts & bills]].",
      "Tap the transaction.",
      "Change the amount, account, category, description or date and tap [[Save changes]], or tap [[Delete]].",
    ],
    notes: [
      "The assistant can change or delete a transfer as a card that you confirm. You can also open the transfer and tap [[Delete]], which removes both sides and the fee.",
      "Changes and deletions that would leave an account below zero are refused.",
    ],
  },
  {
    id: "accounts",
    topic: "Add, view or archive accounts, e-wallets, bank accounts and bills",
    keywords: ["account", "bank", "wallet", "gopay", "dana", "cash", "rekening", "dompet", "tagihan", "paylater", "kartu kredit", "saldo"],
    steps: [
      "Open [[Profile]], then [[Accounts & bills]]. You can also tap the [[Total balance]] card on [[Home]].",
      "Tap [[Add accounts]] to add a bank, e-wallet, cash or a bill (paylater or credit card).",
      "Tap an account to see its statement. There you can use [[Update balance]].",
      "To archive an account, tap the [[Total balance]] card on [[Home]], open the account, then tap [[Archive account]]. An archived account can be restored with [[Restore account]].",
    ],
    notes: [
      "Paylater and credit cards are bills: you type how much you owe, and it counts against your total.",
      "Archived accounts keep their history and can be restored.",
    ],
  },
  {
    id: "update-balance",
    topic: "Make an account match the balance in the real bank or wallet app",
    keywords: ["balance", "adjust", "match", "reconcile", "saldo", "sesuaikan", "perbarui"],
    steps: [
      "Open [[Profile]], then [[Accounts & bills]], then tap the account.",
      "Tap [[Update balance]], type the balance you see in the real app and tap [[Update]].",
    ],
    notes: ["The difference is booked as an adjustment, so the history stays complete."],
  },
  {
    id: "stats-insight",
    topic: "Read the Oracle insight and the AI summary on Statistics",
    keywords: ["insight", "summary", "analysis", "ai", "wawasan", "ringkasan", "analisis", "rangkuman"],
    steps: [
      "Open [[Stats]] in the bottom bar and scroll to the bottom. The [[Oracle insight]] card lists short notes about your numbers for the week, month or year you picked.",
      "Below it is the [[AI summary]] card, a short plain-language read of the current period. Tap [[Write my summary]] to write it. Once it is written, the button says [[Write it again]].",
    ],
    notes: [
      "The AI summary appears only when the assistant is on (see the assistant topic), and only for the current period. Going back to an earlier period hides it.",
      "Sometimes the summary is written from your numbers without the AI, and the card then shows [[Written from your numbers without the AI.]]",
    ],
  },
  {
    id: "budget",
    topic: "Set, edit or copy budgets",
    keywords: ["budget", "limit", "anggaran", "batas", "copy"],
    steps: [
      "Open [[Budget]] in the bottom bar and use the arrows to pick the month.",
      "Tap [[Set budgets]] (or [[Edit]] when budgets exist), type a limit per category and tap [[Save budgets]].",
      "To start from last month, tap [[Copy last month]].",
      "Need a category that is not there? Tap [[New category]] in the editor.",
    ],
    notes: ["The assistant can also set a budget for you as a card you confirm. It changes the same budget you see here."],
  },
  {
    id: "statistics",
    topic: "See where the money went: statistics and spending by category",
    keywords: ["stats", "statistics", "chart", "report", "category", "statistik", "laporan", "grafik"],
    steps: [
      "Open [[Stats]] in the bottom bar and pick [[Week]], [[Month]] or [[Year]].",
      "Use the arrows above the chart to look at an earlier period.",
      "Tap a category under [[Top Categories]] to see every transaction behind it.",
    ],
  },
  {
    id: "categories",
    topic: "Add, rename or hide categories",
    keywords: ["category", "kategori", "icon"],
    steps: ["Open [[Profile]], then [[Categories]].", "Add a new one, or tap a category to rename it or change its icon."],
    notes: [
      "The category used for transfer fees cannot be renamed or removed.",
      "To hide a category, open it and tap [[Hide category]]. Past transactions keep it. Its budgets are removed.",
      "The assistant can rename or hide a category as a card that you confirm. It cannot bring a hidden category back.",
    ],
  },
  {
    id: "month-start",
    topic: "Change the day a month starts (pay cycle)",
    keywords: ["month", "start", "payday", "gajian", "cycle", "awal bulan", "tanggal"],
    steps: [
      "Open [[Profile]], then [[Preferences]], then [[Month starts on]].",
      "Choose [[1st of the month]], or [[A day I choose]] and pick the day you are paid.",
    ],
    notes: [
      "The assistant can change this for you as a card that you confirm.","Home, Stats, Budget and the assistant then count a month from that day to the day before the next one. Weeks, years and account statements stay on the calendar."],
  },
  {
    id: "language",
    topic: "Change the language",
    keywords: ["language", "bahasa", "idioma", "langue", "sprache"],
    steps: ["Open [[Profile]], then [[Preferences]], then [[Language]] and pick one."],
  },
  {
    id: "appearance",
    topic: "Change how the app looks (theme)",
    keywords: ["theme", "appearance", "dark", "light", "color", "tema", "tampilan", "warna", "gelap", "terang"],
    steps: ["Open [[Profile]], then [[Preferences]], then [[Appearance]].", "Pick [[Oracle]], [[Oracle Day]], [[Oracle Midnight]] or [[System]]. The change shows at once and is remembered."],
    notes: ["The assistant can change the look for you as a card that you confirm."],
  },
  {
    id: "privacy",
    topic: "Hide the balance on Home",
    keywords: ["hide", "privacy", "balance", "sembunyi", "privasi"],
    steps: [
      "Open [[Profile]], then [[Preferences]] and turn on [[Hide my balance on Home]]. The amounts on Home then show as dots.",
      "Tap the eye on Home, or in the [[Where your money is]] card on Statistics, to show the balance. Tap the eye again to hide it.",
    ],
    notes: ["The eye keeps its state on both screens. Restarting the app hides the amounts again."],
  },
  {
    id: "assistant",
    topic: "Use or switch off the AI assistant",
    keywords: ["ai", "assistant", "asisten", "oracle", "chat"],
    steps: [
      "On [[Home]], tap the sparkle button at the top to open [[Ask Oracle]]. The button appears only when the assistant is on, and the Oracle server has it.",
      "To hide the assistant, open [[Profile]], then [[Preferences]] and turn off [[Show the AI assistant]].",
    ],
    notes: ["The assistant only talks about your own money in Oracle. It never saves anything by itself: it shows cards, and you confirm each one."],
  },
  {
    id: "profile",
    topic: "Change your name, sign out or reset the password",
    keywords: ["name", "password", "sign out", "logout", "nama", "kata sandi", "keluar"],
    steps: [
      "Open [[Profile]]. Tap [[Your name]] to change the name, or [[Sign out]] to leave.",
      "On the sign-in screen, [[Forgot password?]] sends a code by email when the server can send email. This is the way to change the password, and the reset signs out every device.",
    ],
    notes: [
      "Signing out puts the look back to Oracle. The language stays.",
      "The chat cannot change the password, sign out other devices or delete the account.",
    ],
  },
  {
    id: "first-steps",
    topic: "Getting started without accounts",
    keywords: ["start", "begin", "onboarding", "skip", "mulai", "lewati"],
    steps: [
      "When you open Oracle for the first time you can add your accounts, or tap [[Skip for now]].",
      "Add accounts later from [[Profile]], then [[Accounts & bills]], then [[Add accounts]].",
    ],
    notes: ["Transactions need an account, so add at least one before recording money."],
  },
];

/** Every bracketed label the guide uses. */
export const GUIDE_LABELS_USED = [...new Set(APP_GUIDE.flatMap((e) => [...e.steps, ...(e.notes ?? [])]).flatMap((s) => [...s.matchAll(/\[\[([^\]]+)\]\]/g)].map((m) => m[1])))];

/** The name of a screen or button as the person sees it in their language. */
export function guideLabel(label: string, language: LanguageCode): string {
  return language === "en" ? label : (GUIDE_LABELS[language]?.[label] ?? label);
}

function localize(text: string, language: LanguageCode): string {
  return text.replace(/\[\[([^\]]+)\]\]/g, (_, label: string) => `"${guideLabel(label, language)}"`);
}

const words = (s: string) => s.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 1);

/**
 * The entries that fit a question, best first (at most 3), with the app's own names for screens and buttons.
 * With no question, a list of every topic so the assistant can see what exists.
 */
export function lookupGuide(question: string | undefined, language: LanguageCode) {
  const view = (e: GuideEntry) => ({ id: e.id, topic: e.topic, steps: e.steps.map((s) => localize(s, language)), notes: (e.notes ?? []).map((n) => localize(n, language)) });
  const q = new Set(words(question ?? ""));
  if (q.size === 0) return { topics: APP_GUIDE.map((e) => ({ id: e.id, topic: e.topic })), entries: [] as ReturnType<typeof view>[] };
  const scored = APP_GUIDE.map((e) => {
    const hay = new Set(words(`${e.topic} ${e.keywords.join(" ")} ${e.id.replace(/-/g, " ")}`));
    let score = 0;
    for (const w of q) if (hay.has(w) || [...hay].some((h) => h.length > 3 && (h.startsWith(w) || w.startsWith(h)))) score += 1;
    return { e, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  return { topics: APP_GUIDE.map((e) => ({ id: e.id, topic: e.topic })), entries: scored.map((x) => view(x.e)) };
}
