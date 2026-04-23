export type Category =
  | "Alimentação"
  | "Transporte"
  | "Saúde"
  | "Educação"
  | "Entretenimento"
  | "Outros";

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  category: Category;
  date: string;
  type: "expense" | "income";
}

export interface MonthSummary {
  totalExpenses: number;
  totalIncome: number;
  balance: number;
  savingsPercent: number;
}

export const categoryColors: Record<Category, string> = {
  Alimentação: "#111111",
  Transporte: "#333333",
  Saúde: "#555555",
  Educação: "#777777",
  Entretenimento: "#999999",
  Outros: "#BBBBBB",
};

export const categoryIcons: Record<Category, string> = {
  Alimentação: "🍽️",
  Transporte: "🚌",
  Saúde: "🏥",
  Educação: "📚",
  Entretenimento: "🎬",
  Outros: "📦",
};

export const mockTransactions: Transaction[] = [
  { id: "1", description: "Supermercado Extra", amount: 189.5, category: "Alimentação", date: "2025-04-16", type: "expense" },
  { id: "2", description: "Uber", amount: 32.0, category: "Transporte", date: "2025-04-15", type: "expense" },
  { id: "3", description: "Plano de Saúde", amount: 320.0, category: "Saúde", date: "2025-04-14", type: "expense" },
  { id: "4", description: "Spotify", amount: 21.9, category: "Entretenimento", date: "2025-04-14", type: "expense" },
  { id: "5", description: "Curso Online", amount: 89.9, category: "Educação", date: "2025-04-13", type: "expense" },
  { id: "6", description: "Restaurante Sushi", amount: 95.0, category: "Alimentação", date: "2025-04-12", type: "expense" },
  { id: "7", description: "Metro mensal", amount: 120.0, category: "Transporte", date: "2025-04-11", type: "expense" },
  { id: "8", description: "Netflix", amount: 39.9, category: "Entretenimento", date: "2025-04-10", type: "expense" },
  { id: "9", description: "Farmácia", amount: 55.0, category: "Saúde", date: "2025-04-09", type: "expense" },
  { id: "10", description: "Padaria", amount: 25.0, category: "Alimentação", date: "2025-04-08", type: "expense" },
  { id: "11", description: "Conta de luz", amount: 110.0, category: "Outros", date: "2025-04-07", type: "expense" },
  { id: "12", description: "Salário", amount: 5800.0, category: "Outros", date: "2025-04-05", type: "income" },
  { id: "13", description: "Freelance design", amount: 1200.0, category: "Outros", date: "2025-04-03", type: "income" },
  { id: "14", description: "Aluguel recebido", amount: 800.0, category: "Outros", date: "2025-04-01", type: "income" },
];

export const mockSummary: MonthSummary = {
  totalExpenses: 1098.2,
  totalIncome: 7800.0,
  balance: 6701.8,
  savingsPercent: 85.9,
};

export const mockCategoryData = [
  { name: "Alimentação", value: 309.5, percent: 28.2 },
  { name: "Transporte", value: 152.0, percent: 13.8 },
  { name: "Saúde", value: 375.0, percent: 34.1 },
  { name: "Educação", value: 89.9, percent: 8.2 },
  { name: "Entretenimento", value: 61.8, percent: 5.6 },
  { name: "Outros", value: 110.0, percent: 10.0 },
];

export const mockMonthlyData = [
  { month: "Out", expenses: 1450, income: 7200 },
  { month: "Nov", expenses: 1320, income: 7400 },
  { month: "Dez", expenses: 1980, income: 7600 },
  { month: "Jan", expenses: 1150, income: 7600 },
  { month: "Fev", expenses: 890, income: 7800 },
  { month: "Mar", expenses: 1240, income: 7800 },
  { month: "Abr", expenses: 1098, income: 7800 },
];

export const mockInvestments = [
  {
    id: "1",
    ticker: "BRFS3",
    company: "BRF S.A.",
    sector: "Alimentação",
    spendingContext: "Você gasta em média R$ 309/mês com alimentação",
    reason: "A BRF é líder no setor de alimentos processados no Brasil. Seus hábitos de consumo indicam potencial de retorno neste setor.",
    returnExpected: "8% ao ano",
    risk: "Médio",
    price: 14.20,
  },
  {
    id: "2",
    ticker: "EMBR3",
    company: "Embraer S.A.",
    sector: "Transporte",
    spendingContext: "Você gasta R$ 152/mês em transporte",
    reason: "A Embraer é referência global em aeronáutica. Com a retomada do setor de aviação, as perspectivas são positivas.",
    returnExpected: "12% ao ano",
    risk: "Alto",
    price: 52.80,
  },
  {
    id: "3",
    ticker: "HAPV3",
    company: "Hapvida S.A.",
    sector: "Saúde",
    spendingContext: "Saúde é sua maior categoria: R$ 375/mês",
    reason: "Hapvida é uma das maiores operadoras de saúde do Brasil. Setor resiliente e com crescimento contínuo.",
    returnExpected: "10% ao ano",
    risk: "Médio",
    price: 3.90,
  },
  {
    id: "4",
    ticker: "COGN3",
    company: "Cogna Educação",
    sector: "Educação",
    spendingContext: "Você investe R$ 90/mês em educação",
    reason: "Cogna é o maior grupo educacional do Brasil. Alinhado com seu perfil de investimento em conhecimento.",
    returnExpected: "7% ao ano",
    risk: "Médio",
    price: 2.15,
  },
];

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Hoje";
  if (date.toDateString() === yesterday.toDateString()) return "Ontem";

  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
