export type PaymentStatus = "confirmed" | "cancelled";
export type PaymentMethod = "PIX" | "Dinheiro" | "Transferência" | "Outro";

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
};
