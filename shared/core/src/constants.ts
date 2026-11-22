export const ACCOUNT_TYPES = ["bank", "ewallet", "emoney", "paylater", "credit_card", "investment", "cash", "other"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const CATEGORY_KINDS = ["income", "expense"] as const;
export type CategoryKind = (typeof CATEGORY_KINDS)[number];

export const TRANSACTION_KINDS = ["income", "expense", "transfer_out", "transfer_in", "adjustment"] as const;
export type TransactionKind = (typeof TRANSACTION_KINDS)[number];

export const PERIODS = ["week", "month", "year"] as const;
export type Period = (typeof PERIODS)[number];

/** The looks the person can choose in Preferences. "system" follows the phone's light or dark setting. */
export const THEMES = ["default", "day", "midnight", "system"] as const;
export type ThemeName = (typeof THEMES)[number];

/**
 * Icons a category can use, in the groups the picker shows them in. The names are Material Community Icons names,
 * which the phone app draws with the icon set that comes with Expo.
 */
export const CATEGORY_ICON_GROUPS = [
  { title: "Food", icons: ["silverware-fork-knife", "coffee", "food-apple", "pizza", "hamburger", "ice-cream", "cupcake", "beer", "glass-cocktail", "basket"] },
  { title: "Transport", icons: ["car", "motorbike", "bus", "train", "taxi", "airplane", "ferry", "bike", "gas-station", "parking", "car-wrench"] },
  { title: "Shopping", icons: ["shopping", "cart", "tshirt-crew", "hanger", "shoe-sneaker", "diamond-stone", "gift", "sale", "tag"] },
  { title: "Bills", icons: ["receipt", "lightbulb", "water", "flash", "wifi", "cellphone", "television", "web", "washing-machine"] },
  { title: "Fun", icons: ["movie-open", "gamepad-variant", "music", "headphones", "ticket", "camera", "palette", "party-popper", "soccer", "swim", "book-open-variant"] },
  { title: "Health", icons: ["heart-pulse", "medical-bag", "pill", "tooth", "dumbbell", "spa", "content-cut", "hospital-box"] },
  { title: "Home and family", icons: ["home-variant", "sofa", "bed", "hammer-wrench", "tools", "account-group", "baby-carriage", "paw", "dog", "cat", "flower", "school", "umbrella"] },
  { title: "Money", icons: ["bank", "credit-card", "cash", "cash-multiple", "piggy-bank", "wallet", "briefcase", "laptop", "trending-up", "chart-line", "hand-heart", "hand-coin-outline", "handshake-outline", "star"] },
] as const;

export const CATEGORY_ICONS = CATEGORY_ICON_GROUPS.flatMap((g) => g.icons) as unknown as readonly CategoryIcon[];
export type CategoryIcon = (typeof CATEGORY_ICON_GROUPS)[number]["icons"][number];
/** Shown for a category whose icon is missing or no longer in the list. */
export const DEFAULT_CATEGORY_ICON: CategoryIcon = "tag";
/** At most this many categories (active ones) per person. A guard against a runaway client, far above real use. */
export const MAX_CATEGORIES = 100;
/** The expense category that transfer fees are booked under. Its name is how the API finds it, so it cannot be renamed. */
export const FEE_CATEGORY = "Financial & Fees";
/** What the same category was called before. Accounts made earlier may still have it until the next update renames it. */
export const LEGACY_FEE_CATEGORY = "Admin Fee";
export const isFeeCategory = (name: string) => name === FEE_CATEGORY || name === LEGACY_FEE_CATEGORY;

/** Limits of the AI assistant. The phone app and the server use the same numbers. */
export const AI_MAX_MESSAGE_CHARS = 4000;
export const AI_MAX_MESSAGES = 12;
export const AI_MAX_DRAFTS_PER_TURN = 20;

/** The languages the app is translated into, in the order they are listed in the app. `native` is how each language writes its own name. */
export const LANGUAGES = [
  { code: "en", name: "English", native: "English" },
  { code: "id", name: "Indonesian", native: "Bahasa Indonesia" },
  { code: "de", name: "German", native: "Deutsch" },
  { code: "fr", name: "French", native: "Français" },
  { code: "es", name: "Spanish", native: "Español" },
  { code: "pt", name: "Portuguese", native: "Português" },
  { code: "ru", name: "Russian", native: "Русский" },
  { code: "zh", name: "Chinese (Mandarin)", native: "中文" },
] as const;
export type LanguageCode = (typeof LANGUAGES)[number]["code"];
export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code) as [LanguageCode, ...LanguageCode[]];
