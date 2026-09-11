export type PaymentStatus = "confirmed" | "cancelled";
export type PaymentMethod = "PIX" | "Dinheiro" | "Transferência" | "Outro";
export type ExpenseStatus = "active" | "cancelled";
export type ExpenseCategory =
  | "Material"
  | "Mão de obra extra"
  | "Frete"
  | "Equipamento"
  | "Taxas"
  | "Outros";

export type Payment = {
  id: string;
  project_id: string;
  receipt_code: string;
  amount_cents: number;
  paid_on: string;
  method: PaymentMethod;
  note: string | null;
  status: PaymentStatus;
  created_at: string;
};

export type Expense = {
  id: string;
  project_id: string;
  amount_cents: number;
  spent_on: string;
  category: ExpenseCategory;
  item_name: string;
  quantity: number;
  unit: string;
  description: string;
  supplier: string;
  card_id: string | null;
  card_installments_count: number;
  card_installments_paid: number;
  card_paid_on: string | null;
  note: string | null;
  status: ExpenseStatus;
  created_at: string;
};

export type Project = {
  id: string;
  owner_id: string;
  title: string;
  contractor_name: string;
  worker_name: string;
  total_amount_cents: number;
  started_on: string;
  address: string | null;
  status: "active" | "completed" | "cancelled";
  public_token: string;
  public_link_active: boolean;
  created_at: string;
  payments: Payment[];
  expenses: Expense[];
};

export type CreditCard = {
  id: string;
  user_id: string;
  name: string;
  brand: "Visa" | "Mastercard" | "Elo" | "Amex" | "Outro";
  last_four: string;
  credit_limit_cents: number;
  closing_day: number;
  due_day: number;
  color: string;
  status: "active" | "archived";
  created_at: string;
};

export type CardPurchase = {
  id: string;
  user_id: string;
  card_id: string;
  description: string;
  category: string;
  total_amount_cents: number;
  installments_count: number;
  installments_paid: number;
  first_installment_on: string;
  status: "active" | "cancelled";
  created_at: string;
};

export type RecurringExpense = {
  id: string;
  user_id: string;
  card_id: string | null;
  name: string;
  category: "Assinatura" | "Investimento" | "Essencial" | "Outro";
  amount_cents: number;
  billing_day: number;
  status: "active" | "paused";
  created_at: string;
};
