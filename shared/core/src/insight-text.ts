import type { LanguageCode } from "./constants";

/** The words of the rule-based notes (insights and the plain summary), one set per app language. Numbers are filled in by code, never written here. */
type Words = {
  /** "this week", "last week" and so on, for week, month and year. */
  period: Record<"week" | "month" | "year", { this: string; last: string }>;
  budgetOver: (a: { name: string; over: string; spent: string; budget: string; used: number; when: string }) => string;
  budgetNear: (a: { name: string; used: number; spent: string; budget: string; left: string; when: string }) => string;
  trendUp: (a: { name: string; when: string; amount: string; pct: number; last: string; prev: string }) => string;
  trendDown: (a: { name: string; when: string; amount: string; pct: number; last: string; prev: string }) => string;
  peak: (a: { when: string; amount: string; what: string }) => string;
  fees: (a: { when: string; amount: string; count: number }) => string;
  stale: (a: { name: string; days: number }) => string;
  empty: (a: { when: string }) => string;
  spentNone: (a: { when: string }) => string;
  spent: (a: { when: string; amount: string }) => string;
  change: (a: { pct: number; more: boolean; prev: string }) => string;
  topCategory: (a: { name: string; amount: string }) => string;
};

const wrap = (s: string) => (s ? ` (${s})` : "");

const WORDS: Record<LanguageCode, Words> = {
  en: {
    period: { week: { this: "this week", last: "last week" }, month: { this: "this month", last: "last month" }, year: { this: "this year", last: "last year" } },
    budgetOver: (a) => `Your ${a.name} budget is ${a.over} over ${a.when} (${a.spent} of ${a.budget}, ${a.used}% used).`,
    budgetNear: (a) => `${a.name} is at ${a.used}% of its budget ${a.when} (${a.spent} of ${a.budget}). ${a.left} left.`,
    trendUp: (a) => `${a.name} ${a.when}: ${a.amount}, up ${a.pct}% from ${a.last} (${a.prev}).`,
    trendDown: (a) => `${a.name} ${a.when}: ${a.amount}, down ${a.pct}% from ${a.last} (${a.prev}).`,
    peak: (a) => `Biggest single expense ${a.when}: ${a.amount}${wrap(a.what)}.`,
    fees: (a) => `Fees paid ${a.when}: ${a.amount} across ${a.count} transfer${a.count === 1 ? "" : "s"}.`,
    stale: (a) => `${a.name} balance not updated for ${a.days} days. Check it against the real app.`,
    empty: (a) => `No spending recorded ${a.when} yet, so there is nothing to analyze.`,
    spentNone: (a) => `Nothing spent ${a.when} yet.`,
    spent: (a) => `You spent ${a.amount} ${a.when}.`,
    change: (a) => `That is ${a.pct}% ${a.more ? "more" : "less"} than the same days before (${a.prev}).`,
    topCategory: (a) => `The biggest category is ${a.name} at ${a.amount}.`,
  },
  id: {
    period: { week: { this: "minggu ini", last: "minggu lalu" }, month: { this: "bulan ini", last: "bulan lalu" }, year: { this: "tahun ini", last: "tahun lalu" } },
    budgetOver: (a) => `Anggaran ${a.name} melewati batas ${a.over} ${a.when} (${a.spent} dari ${a.budget}, terpakai ${a.used}%).`,
    budgetNear: (a) => `${a.name} sudah ${a.used}% dari anggarannya ${a.when} (${a.spent} dari ${a.budget}). Sisa ${a.left}.`,
    trendUp: (a) => `${a.name} ${a.when}: ${a.amount}, naik ${a.pct}% dari ${a.last} (${a.prev}).`,
    trendDown: (a) => `${a.name} ${a.when}: ${a.amount}, turun ${a.pct}% dari ${a.last} (${a.prev}).`,
    peak: (a) => `Pengeluaran terbesar ${a.when}: ${a.amount}${wrap(a.what)}.`,
    fees: (a) => `Biaya yang dibayar ${a.when}: ${a.amount} untuk ${a.count} transfer.`,
    stale: (a) => `Saldo ${a.name} belum diperbarui selama ${a.days} hari. Cocokkan dengan aplikasi aslinya.`,
    empty: (a) => `Belum ada pengeluaran ${a.when}, jadi belum ada yang bisa dianalisis.`,
    spentNone: (a) => `Belum ada pengeluaran ${a.when}.`,
    spent: (a) => `Kamu menghabiskan ${a.amount} ${a.when}.`,
    change: (a) => `Itu ${a.pct}% ${a.more ? "lebih banyak" : "lebih sedikit"} dari hari-hari yang sama sebelumnya (${a.prev}).`,
    topCategory: (a) => `Kategori terbesar adalah ${a.name} sebesar ${a.amount}.`,
  },
  es: {
    period: { week: { this: "esta semana", last: "la semana pasada" }, month: { this: "este mes", last: "el mes pasado" }, year: { this: "este año", last: "el año pasado" } },
    budgetOver: (a) => `Tu presupuesto de ${a.name} se pasó ${a.over} ${a.when} (${a.spent} de ${a.budget}, ${a.used}% usado).`,
    budgetNear: (a) => `${a.name} va por el ${a.used}% de su presupuesto ${a.when} (${a.spent} de ${a.budget}). Quedan ${a.left}.`,
    trendUp: (a) => `${a.name} ${a.when}: ${a.amount}, un ${a.pct}% más que ${a.last} (${a.prev}).`,
    trendDown: (a) => `${a.name} ${a.when}: ${a.amount}, un ${a.pct}% menos que ${a.last} (${a.prev}).`,
    peak: (a) => `Mayor gasto individual ${a.when}: ${a.amount}${wrap(a.what)}.`,
    fees: (a) => `Comisiones pagadas ${a.when}: ${a.amount} en ${a.count} transferencia${a.count === 1 ? "" : "s"}.`,
    stale: (a) => `El saldo de ${a.name} no se actualiza desde hace ${a.days} días. Compáralo con la app real.`,
    empty: (a) => `Aún no hay gastos registrados ${a.when}, así que no hay nada que analizar.`,
    spentNone: (a) => `Aún no has gastado nada ${a.when}.`,
    spent: (a) => `Gastaste ${a.amount} ${a.when}.`,
    change: (a) => `Es un ${a.pct}% ${a.more ? "más" : "menos"} que en los mismos días anteriores (${a.prev}).`,
    topCategory: (a) => `La categoría más grande es ${a.name} con ${a.amount}.`,
  },
  fr: {
    period: { week: { this: "cette semaine", last: "la semaine dernière" }, month: { this: "ce mois-ci", last: "le mois dernier" }, year: { this: "cette année", last: "l'année dernière" } },
    budgetOver: (a) => `Votre budget ${a.name} est dépassé de ${a.over} ${a.when} (${a.spent} sur ${a.budget}, ${a.used}% utilisé).`,
    budgetNear: (a) => `${a.name} est à ${a.used}% de son budget ${a.when} (${a.spent} sur ${a.budget}). Il reste ${a.left}.`,
    trendUp: (a) => `${a.name} ${a.when} : ${a.amount}, en hausse de ${a.pct}% par rapport à ${a.last} (${a.prev}).`,
    trendDown: (a) => `${a.name} ${a.when} : ${a.amount}, en baisse de ${a.pct}% par rapport à ${a.last} (${a.prev}).`,
    peak: (a) => `Plus grosse dépense ${a.when} : ${a.amount}${wrap(a.what)}.`,
    fees: (a) => `Frais payés ${a.when} : ${a.amount} sur ${a.count} virement${a.count === 1 ? "" : "s"}.`,
    stale: (a) => `Le solde de ${a.name} n'a pas été mis à jour depuis ${a.days} jours. Comparez-le avec l'application réelle.`,
    empty: (a) => `Aucune dépense enregistrée ${a.when}, il n'y a donc rien à analyser.`,
    spentNone: (a) => `Aucune dépense ${a.when} pour l'instant.`,
    spent: (a) => `Vous avez dépensé ${a.amount} ${a.when}.`,
    change: (a) => `C'est ${a.pct}% de ${a.more ? "plus" : "moins"} que les mêmes jours avant (${a.prev}).`,
    topCategory: (a) => `La plus grosse catégorie est ${a.name} avec ${a.amount}.`,
  },
  pt: {
    period: { week: { this: "esta semana", last: "a semana passada" }, month: { this: "este mês", last: "o mês passado" }, year: { this: "este ano", last: "o ano passado" } },
    budgetOver: (a) => `Seu orçamento de ${a.name} estourou em ${a.over} ${a.when} (${a.spent} de ${a.budget}, ${a.used}% usado).`,
    budgetNear: (a) => `${a.name} está em ${a.used}% do orçamento ${a.when} (${a.spent} de ${a.budget}). Restam ${a.left}.`,
    trendUp: (a) => `${a.name} ${a.when}: ${a.amount}, ${a.pct}% a mais que ${a.last} (${a.prev}).`,
    trendDown: (a) => `${a.name} ${a.when}: ${a.amount}, ${a.pct}% a menos que ${a.last} (${a.prev}).`,
    peak: (a) => `Maior gasto individual ${a.when}: ${a.amount}${wrap(a.what)}.`,
    fees: (a) => `Taxas pagas ${a.when}: ${a.amount} em ${a.count} transferência${a.count === 1 ? "" : "s"}.`,
    stale: (a) => `O saldo de ${a.name} não é atualizado há ${a.days} dias. Compare com o app real.`,
    empty: (a) => `Nenhum gasto registrado ${a.when}, então não há nada para analisar.`,
    spentNone: (a) => `Nenhum gasto ${a.when} ainda.`,
    spent: (a) => `Você gastou ${a.amount} ${a.when}.`,
    change: (a) => `Isso é ${a.pct}% ${a.more ? "a mais" : "a menos"} que nos mesmos dias antes (${a.prev}).`,
    topCategory: (a) => `A maior categoria é ${a.name}, com ${a.amount}.`,
  },
  ru: {
    period: { week: { this: "на этой неделе", last: "на прошлой неделе" }, month: { this: "в этом месяце", last: "в прошлом месяце" }, year: { this: "в этом году", last: "в прошлом году" } },
    budgetOver: (a) => `Бюджет «${a.name}» превышен на ${a.over} ${a.when} (${a.spent} из ${a.budget}, использовано ${a.used}%).`,
    budgetNear: (a) => `«${a.name}»: использовано ${a.used}% бюджета ${a.when} (${a.spent} из ${a.budget}). Осталось ${a.left}.`,
    trendUp: (a) => `«${a.name}» ${a.when}: ${a.amount}, рост на ${a.pct}% по сравнению с периодом ${a.last} (${a.prev}).`,
    trendDown: (a) => `«${a.name}» ${a.when}: ${a.amount}, снижение на ${a.pct}% по сравнению с периодом ${a.last} (${a.prev}).`,
    peak: (a) => `Самая крупная трата ${a.when}: ${a.amount}${wrap(a.what)}.`,
    fees: (a) => `Комиссии ${a.when}: ${a.amount}, переводов: ${a.count}.`,
    stale: (a) => `Баланс «${a.name}» не обновлялся ${a.days} дн. Сверьте его с настоящим приложением.`,
    empty: (a) => `Расходов ${a.when} пока нет, анализировать нечего.`,
    spentNone: (a) => `Расходов ${a.when} пока нет.`,
    spent: (a) => `Вы потратили ${a.amount} ${a.when}.`,
    change: (a) => `Это на ${a.pct}% ${a.more ? "больше" : "меньше"}, чем в те же дни раньше (${a.prev}).`,
    topCategory: (a) => `Самая крупная категория: ${a.name}, ${a.amount}.`,
  },
  zh: {
    period: { week: { this: "本周", last: "上周" }, month: { this: "本月", last: "上月" }, year: { this: "今年", last: "去年" } },
    budgetOver: (a) => `${a.name}预算${a.when}已超支${a.over}（${a.spent}/${a.budget}，已用${a.used}%）。`,
    budgetNear: (a) => `${a.name}${a.when}已用预算的${a.used}%（${a.spent}/${a.budget}），还剩${a.left}。`,
    trendUp: (a) => `${a.name}${a.when}：${a.amount}，比${a.last}增加${a.pct}%（${a.prev}）。`,
    trendDown: (a) => `${a.name}${a.when}：${a.amount}，比${a.last}减少${a.pct}%（${a.prev}）。`,
    peak: (a) => `${a.when}单笔最大支出：${a.amount}${a.what ? `（${a.what}）` : ""}。`,
    fees: (a) => `${a.when}共支付手续费${a.amount}，共${a.count}笔转账。`,
    stale: (a) => `${a.name}的余额已${a.days}天没有更新，请与真实应用核对。`,
    empty: (a) => `${a.when}还没有支出记录，暂无可分析的内容。`,
    spentNone: (a) => `${a.when}还没有支出。`,
    spent: (a) => `你${a.when}花了${a.amount}。`,
    change: (a) => `比之前同样天数${a.more ? "多" : "少"}${a.pct}%（${a.prev}）。`,
    topCategory: (a) => `最大的分类是${a.name}，${a.amount}。`,
  },
  de: {
    period: { week: { this: "diese Woche", last: "letzte Woche" }, month: { this: "diesen Monat", last: "letzten Monat" }, year: { this: "dieses Jahr", last: "letztes Jahr" } },
    budgetOver: (a) => `Dein Budget für ${a.name} ist ${a.when} um ${a.over} überschritten (${a.spent} von ${a.budget}, ${a.used}% verbraucht).`,
    budgetNear: (a) => `${a.name} hat ${a.when} ${a.used}% des Budgets erreicht (${a.spent} von ${a.budget}). Noch ${a.left} übrig.`,
    trendUp: (a) => `${a.name} ${a.when}: ${a.amount}, ${a.pct}% mehr als ${a.last} (${a.prev}).`,
    trendDown: (a) => `${a.name} ${a.when}: ${a.amount}, ${a.pct}% weniger als ${a.last} (${a.prev}).`,
    peak: (a) => `Größte Einzelausgabe ${a.when}: ${a.amount}${wrap(a.what)}.`,
    fees: (a) => `Gebühren ${a.when}: ${a.amount} bei ${a.count} Überweisung${a.count === 1 ? "" : "en"}.`,
    stale: (a) => `Der Kontostand von ${a.name} wurde seit ${a.days} Tagen nicht aktualisiert. Vergleiche ihn mit der echten App.`,
    empty: (a) => `${a.when} sind noch keine Ausgaben erfasst, es gibt also nichts zu analysieren.`,
    spentNone: (a) => `${a.when} noch nichts ausgegeben.`,
    spent: (a) => `Du hast ${a.when} ${a.amount} ausgegeben.`,
    change: (a) => `Das sind ${a.pct}% ${a.more ? "mehr" : "weniger"} als an denselben Tagen davor (${a.prev}).`,
    topCategory: (a) => `Die größte Kategorie ist ${a.name} mit ${a.amount}.`,
  },
};

/** The word set for a language. */
export const insightWords = (lang: LanguageCode = "en"): Words => WORDS[lang] ?? WORDS.en;
