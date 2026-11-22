import type { LanguageCode } from "./constants";

/**
 * The default categories are stored in English (a person can rename them). This is how they are written in each
 * language, for showing in the app. A category the person made or renamed is not in this list, so it shows as typed.
 * Order of the languages in each row: id, de, fr, es, pt, ru, zh.
 */
const ROWS: Record<string, [string, string, string, string, string, string, string]> = {
  // Expenses
  "Food & Drinks": ["Makanan & Minuman", "Essen & Trinken", "Nourriture & Boissons", "Comida y Bebida", "Comida e Bebida", "Еда и напитки", "餐饮"],
  Transportation: ["Transportasi", "Transport", "Transports", "Transporte", "Transporte", "Транспорт", "交通"],
  Shopping: ["Belanja", "Einkaufen", "Shopping", "Compras", "Compras", "Покупки", "购物"],
  "Bills & Utilities": ["Tagihan & Utilitas", "Rechnungen & Nebenkosten", "Factures & Services", "Facturas y Servicios", "Contas e Serviços", "Счета и коммунальные услуги", "账单与水电"],
  Housing: ["Tempat Tinggal", "Wohnen", "Logement", "Vivienda", "Moradia", "Жильё", "住房"],
  Entertainment: ["Hiburan", "Unterhaltung", "Divertissement", "Entretenimiento", "Entretenimento", "Развлечения", "娱乐"],
  Health: ["Kesehatan", "Gesundheit", "Santé", "Salud", "Saúde", "Здоровье", "健康"],
  "Personal Care": ["Perawatan Diri", "Körperpflege", "Soins personnels", "Cuidado personal", "Cuidados pessoais", "Личный уход", "个人护理"],
  Education: ["Pendidikan", "Bildung", "Éducation", "Educación", "Educação", "Образование", "教育"],
  "Family & Kids": ["Keluarga & Anak", "Familie & Kinder", "Famille & Enfants", "Familia y Niños", "Família e Crianças", "Семья и дети", "家庭与孩子"],
  Travel: ["Perjalanan", "Reisen", "Voyages", "Viajes", "Viagens", "Путешествия", "旅行"],
  "Financial & Fees": ["Keuangan & Biaya", "Finanzen & Gebühren", "Finance & Frais", "Finanzas y Comisiones", "Finanças e Taxas", "Финансы и комиссии", "金融与手续费"],
  Insurance: ["Asuransi", "Versicherung", "Assurance", "Seguros", "Seguros", "Страхование", "保险"],
  Charity: ["Amal", "Spenden", "Dons", "Donaciones", "Doações", "Благотворительность", "慈善"],
  Subscriptions: ["Langganan", "Abos", "Abonnements", "Suscripciones", "Assinaturas", "Подписки", "订阅"],
  // Income
  Salary: ["Gaji", "Gehalt", "Salaire", "Salario", "Salário", "Зарплата", "工资"],
  Bonus: ["Bonus", "Bonus", "Prime", "Bonificación", "Bônus", "Премия", "奖金"],
  Freelance: ["Freelance", "Freiberuflich", "Freelance", "Freelance", "Freelance", "Фриланс", "自由职业"],
  "Business Income": ["Pendapatan Usaha", "Geschäftseinnahmen", "Revenus d'entreprise", "Ingresos del negocio", "Receita do negócio", "Доход от бизнеса", "经营收入"],
  "Investment Income": ["Hasil Investasi", "Kapitalerträge", "Revenus d'investissement", "Ingresos por inversiones", "Rendimentos de investimentos", "Инвестиционный доход", "投资收益"],
  Interest: ["Bunga", "Zinsen", "Intérêts", "Intereses", "Juros", "Проценты", "利息"],
  Gifts: ["Hadiah", "Geschenke", "Cadeaux", "Regalos", "Presentes", "Подарки", "礼金"],
  "Cashback & Rewards": ["Cashback & Reward", "Cashback & Prämien", "Cashback & Récompenses", "Cashback y Recompensas", "Cashback e Recompensas", "Кешбэк и бонусы", "返现与奖励"],
  "Rental Income": ["Pendapatan Sewa", "Mieteinnahmen", "Revenus locatifs", "Ingresos por alquiler", "Receita de aluguel", "Доход от аренды", "租金收入"],
  Allowance: ["Uang Saku", "Taschengeld", "Argent de poche", "Mesada", "Mesada", "Карманные деньги", "零用钱"],
  Refund: ["Pengembalian Dana", "Erstattung", "Remboursement", "Reembolso", "Reembolso", "Возврат средств", "退款"],
  "Other Income": ["Pendapatan Lain", "Sonstige Einnahmen", "Autres revenus", "Otros ingresos", "Outras receitas", "Прочие доходы", "其他收入"],
  // Names the first versions of the app used, kept so older accounts read well too
  Transport: ["Transportasi", "Transport", "Transports", "Transporte", "Transporte", "Транспорт", "交通"],
  Home: ["Rumah", "Zuhause", "Maison", "Hogar", "Casa", "Дом", "家居"],
  Family: ["Keluarga", "Familie", "Famille", "Familia", "Família", "Семья", "家庭"],
  "Phone & Internet": ["Pulsa & Internet", "Telefon & Internet", "Téléphone & Internet", "Teléfono e Internet", "Telefone e Internet", "Связь и интернет", "话费与网络"],
  "Admin Fee": ["Biaya Admin", "Verwaltungsgebühr", "Frais de gestion", "Comisión", "Taxa administrativa", "Комиссия", "手续费"],
  "Charity & Zakat": ["Amal", "Spenden", "Dons", "Donaciones", "Doações", "Благотворительность", "慈善"],
  Cashback: ["Cashback", "Cashback", "Cashback", "Cashback", "Cashback", "Кешбэк", "返现"],
  Uncategorized: ["Tanpa kategori", "Ohne Kategorie", "Sans catégorie", "Sin categoría", "Sem categoria", "Без категории", "未分类"],
};
const INDEX: Record<Exclude<LanguageCode, "en">, number> = { id: 0, de: 1, fr: 2, es: 3, pt: 4, ru: 5, zh: 6 };

/** A default category's name in the given language. Anything else (a category the person made or renamed) comes back unchanged. */
export function localCategoryName(name: string, language: LanguageCode): string {
  if (language === "en") return name;
  const row = Object.hasOwn(ROWS, name) ? ROWS[name] : undefined;
  return row ? row[INDEX[language]] : name;
}

/** Every English default name that has a translation. Used by tests. */
export const TRANSLATED_CATEGORY_NAMES = Object.keys(ROWS);
