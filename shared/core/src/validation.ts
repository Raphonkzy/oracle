import { z } from "zod";
import { MAX_AMOUNT } from "./amount";
import { ACCOUNT_TYPES, AI_MAX_MESSAGE_CHARS, AI_MAX_MESSAGES, CATEGORY_ICONS, CATEGORY_KINDS, LANGUAGE_CODES, PERIODS, THEMES } from "./constants";
import { isISODate } from "./dates";

const id = z.uuid({ error: "Invalid data." });
const day = z.string().refine(isISODate, { error: "Invalid date." });
const positiveAmount = z.number().int().positive({ error: "Amount must be greater than 0." }).max(MAX_AMOUNT, { error: "Amount is too large." });
const signedAmount = z.number().int().min(-MAX_AMOUNT).max(MAX_AMOUNT);
/** PostgreSQL cannot store the NUL character in text, so it is refused here with a clear message instead of failing later. */
const noNul = (v: string) => !v.includes("\u0000");
const NUL_MESSAGE = "Text contains a character that is not allowed.";
const text = (max: number) => z.string().trim().max(max, { error: `Maximum ${max} characters.` }).refine(noNul, { error: NUL_MESSAGE });
const optionalText = (max: number) =>
  text(max)
    .nullish()
    .transform((v) => (v ? v : null));

export const accountInput = z.object({
  providerId: z.string().max(64).nullable(),
  name: text(60).min(1, { error: "Account name is required." }),
  type: z.enum(ACCOUNT_TYPES),
  initialBalance: signedAmount,
  initialBalanceDate: day,
  includeInTotal: z.boolean(),
});

export const onboardingInput = z.object({
  accounts: z.array(accountInput).min(1, { error: "Pick at least one bank account or e-wallet." }).max(50),
});

export const accountUpdateInput = accountInput.omit({ providerId: true, initialBalanceDate: true }).extend({ id });

/** Partial edit used by the REST API. At least one field must be present. */
export const accountPatchInput = accountInput
  .omit({ providerId: true, initialBalanceDate: true })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { error: "Nothing to change." });

export const transactionInput = z.object({
  kind: z.enum(["income", "expense"]),
  accountId: id,
  amount: positiveAmount,
  date: day,
  categoryId: id.nullable(),
  description: optionalText(120),
  note: optionalText(500),
});

export const transactionUpdateInput = transactionInput.extend({ id });
export const transactionPatchInput = transactionInput
  .partial()
  .refine((v) => Object.keys(v).length > 0, { error: "Nothing to change." });

/** Transfer fields with no defaults and no refinements, shared by the create and patch schemas. */
const transferBase = z.object({
  fromAccountId: id,
  toAccountId: id,
  amount: positiveAmount,
  fee: z.number().int().min(0).max(MAX_AMOUNT),
  date: day,
  note: optionalText(200),
});

export const transferInput = transferBase
  .extend({ fee: transferBase.shape.fee.default(0) })
  .refine((v) => v.fromAccountId !== v.toAccountId, { error: "Source and destination accounts must differ.", path: ["toAccountId"] });

/** Partial transfer edit. At least one field must be present. A missing fee or note stays missing. */
export const transferPatchInput = transferBase.partial().refine((v) => Object.keys(v).length > 0, { error: "Nothing to change." });

export const balanceCheckInput = z.object({ accountId: id, actualBalance: signedAmount, date: day });
export const balanceCheckBody = balanceCheckInput.omit({ accountId: true });

export const idInput = z.object({ id });
export const moveInput = z.object({ id, direction: z.enum(["up", "down"]) });
export const reorderInput = z.object({ ids: z.array(id).min(1).max(200) });

const limit = (def: number, max: number) =>
  z
    .string()
    .regex(/^\d+$/, { error: "Invalid limit." })
    .transform(Number)
    .pipe(z.number().int().min(1).max(max))
    .default(def);

export const ledgerQuery = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, { error: "Month must be in YYYY-MM format." }).optional(),
  limit: limit(100, 200),
  cursor: z.string().max(300).optional(),
});

export const transactionsQuery = z.object({
  q: z.string().trim().max(100).refine(noNul, { error: NUL_MESSAGE }).optional(),
  account: id.optional(),
  /** A category id, or "none" for transactions without a category. */
  category: z.union([id, z.literal("none")]).optional(),
  kind: z.enum(["income", "expense", "transfer", "adjustment"]).optional(),
  from: day.optional(),
  to: day.optional(),
  limit: limit(50, 200),
  cursor: z.string().max(300).optional(),
});
/** The same filters as the transaction list, without paging: an export always returns everything that matches. */
export const exportQuery = transactionsQuery.omit({ limit: true, cursor: true });

/** `date` is any day inside the period to show (YYYY-MM-DD). Left out, the current period is shown. */
export const summaryQuery = z.object({
  period: z.enum(PERIODS).default("month"),
  date: z.string().refine(isISODate, { error: "Date must be a real day in YYYY-MM-DD format." }).optional(),
});

const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, { error: "Month must be in YYYY-MM format." });
export const monthParam = z.object({ month });
export const budgetsQuery = z.object({ month: month.optional() });
export const budgetsInput = z.object({
  items: z
    .array(z.object({ categoryId: id, amount: positiveAmount }))
    .max(100)
    .refine((items) => new Set(items.map((i) => i.categoryId)).size === items.length, { error: "Each category can only have one budget." }),
});
/** Only icons from the list in constants.ts are accepted. */
const categoryIcon = z.enum(CATEGORY_ICONS as unknown as [string, ...string[]]);
export const categoryPatchInput = z
  .object({ name: text(40).min(1, { error: "Category name is required." }), icon: categoryIcon })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { error: "Nothing to change." });
export const statsQuery = summaryQuery;
/** The last `months` pay cycles, ending with the one that holds `date` (today when left out). */
export const trendQuery = z.object({
  months: z.coerce.number({ error: "months must be a number." }).int({ error: "months must be a whole number." }).min(1, { error: "months must be at least 1." }).max(12, { error: "months can be at most 12." }).default(6),
  date: summaryQuery.shape.date,
});
/** Insights are worded in the app language. */
export const insightsQuery = summaryQuery.extend({ language: z.enum(LANGUAGE_CODES).default("en") });
export const categoryCreateInput = z.object({
  name: text(40).min(1, { error: "Category name is required." }),
  kind: z.enum(CATEGORY_KINDS),
  icon: categoryIcon,
});
export const suggestionsQuery = z.object({ kind: z.enum(["income", "expense"]).default("expense") });

export const settingsInput = z.object({ cycleStartDay: z.number().int().min(1).max(28) }).strict();
/** The language the app is shown in. The assistant answers in it unless the person writes in another one. */
const aiLanguage = z.enum(LANGUAGE_CODES).default("en");
export const aiSummaryInput = z.object({ period: z.enum(PERIODS).default("week"), language: aiLanguage });
/** Only the person's own words and the assistant's earlier answers are accepted. The roles system and tool can never come from outside. */
export const aiViewInput = z.object({
  screen: z.enum(["home", "stats", "budget", "accounts", "transactions", "profile", "other"]).optional(),
  period: z.enum(PERIODS).optional(),
  from: day.optional(),
  to: day.optional(),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
  theme: z.enum(THEMES).optional(),
});
export const aiChatInput = z.object({
  language: aiLanguage,
  view: aiViewInput.optional(),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1, { error: "Message is empty." }).max(AI_MAX_MESSAGE_CHARS, { error: `A message can be at most ${AI_MAX_MESSAGE_CHARS} characters.` }).refine(noNul, { error: NUL_MESSAGE }) }))
    .min(1)
    .max(AI_MAX_MESSAGES, { error: `At most ${AI_MAX_MESSAGES} messages.` })
    .refine((m) => m.at(-1)?.role === "user", { error: "The last message must be yours." }),
});

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid data.";
}

export type AccountInput = z.output<typeof accountInput>;
export type TransactionInput = z.output<typeof transactionInput>;
export type TransferInput = z.output<typeof transferInput>;
export type TransferPatchInput = z.output<typeof transferPatchInput>;
