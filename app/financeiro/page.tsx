"use client";

import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Check,
  CircleDollarSign,
  CreditCard as CreditCardIcon,
  Hammer,
  Landmark,
  Link2,
  LogOut,
  Menu,
  MoreHorizontal,
  Pencil,
  PiggyBank,
  Plus,
  ReceiptText,
  RefreshCw,
  Send,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { demoCards, demoProject, demoPurchases, demoRecurringExpenses } from "@/lib/demo-data";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import type { CardPurchase, CreditCard, Expense, RecurringExpense } from "@/lib/types";
import "./financeiro.css";

type FormKind = "card" | "purchase" | "recurring";
type Modal = FormKind | "api-purchase" | "invoice" | "delete-card" | "delete-purchase" | "delete-recurring" | null;
type View = "overview" | "recurring" | "report";

const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date());

function formatMoney(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function centsFromInput(value: string) {
  return Math.round(Number(value.replace(/\./g, "").replace(",", ".")) * 100);
}

function installmentValue(purchase: CardPurchase) {
  return Math.round(purchase.total_amount_cents / purchase.installments_count);
}

function remainingValue(purchase: CardPurchase) {
  return installmentValue(purchase) * (purchase.installments_count - purchase.installments_paid);
}

function expenseInstallmentValue(expense: Expense) {
  return Math.round(expense.amount_cents / expense.card_installments_count);
}

function expenseRemainingValue(expense: Expense) {
  return expenseInstallmentValue(expense) * (expense.card_installments_count - expense.card_installments_paid);
}

function ModalFrame({ title, eyebrow, onClose, children }: { title: string; eyebrow: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="finance-modal-backdrop" onMouseDown={onClose}>
      <section className="finance-modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <div className="finance-modal-heading"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={20} /></button></div>
        {children}
      </section>
    </div>
  );
}

function FinancialForm({ kind, cards, selectedCardId, editingCard, editingPurchase, editingRecurring, onClose, onSave }: {
  kind: FormKind;
  cards: CreditCard[];
  selectedCardId: string;
  editingCard?: CreditCard | null;
  editingPurchase?: CardPurchase | null;
  editingRecurring?: RecurringExpense | null;
  onClose: () => void;
  onSave: (kind: FormKind, form: FormData) => Promise<boolean>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const labels = {
    card: [editingCard ? "Editar cartão" : "Novo cartão", editingCard ? "Atualize os dados e o limite" : "Cadastre o cartão e o limite"],
    purchase: [editingPurchase ? "Editar compra" : "Nova compra", editingPurchase ? "Ajuste os dados do parcelamento" : "Acompanhe cada parcela"],
    recurring: [editingRecurring ? "Editar recorrente" : "Novo recorrente", editingRecurring ? "Atualize os dados do compromisso" : "Organize seus compromissos mensais"],
  } as const;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const saved = await onSave(kind, new FormData(event.currentTarget));
    if (!saved) setError("Não foi possível salvar. Confira os dados e tente novamente.");
    setSaving(false);
  }

  return (
    <ModalFrame title={labels[kind][0]} eyebrow={labels[kind][1]} onClose={onClose}>
      <form className="finance-form" onSubmit={submit}>
        {kind === "card" && <>
          <label>Nome do cartão<input name="name" placeholder="Ex.: Nubank Ultravioleta" defaultValue={editingCard?.name ?? ""} autoFocus required /></label>
          <div className="form-grid"><label>Bandeira<select name="brand" defaultValue={editingCard?.brand ?? "Mastercard"}><option>Mastercard</option><option>Visa</option><option>Elo</option><option>Amex</option><option>Outro</option></select></label><label>Últimos 4 dígitos<input name="lastFour" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} placeholder="0000" defaultValue={editingCard?.last_four ?? ""} required /></label></div>
          <label>Limite total<div className="money-input"><span>R$</span><input name="limit" inputMode="decimal" placeholder="0,00" defaultValue={editingCard ? (editingCard.credit_limit_cents / 100).toFixed(2).replace(".", ",") : ""} required /></div></label>
          <div className="form-grid"><label>Dia do fechamento<input name="closingDay" type="number" min="1" max="28" defaultValue={editingCard?.closing_day ?? 3} required /></label><label>Dia do vencimento<input name="dueDay" type="number" min="1" max="28" defaultValue={editingCard?.due_day ?? 10} required /></label></div>
          <label>Cor do cartão<select name="color" defaultValue={editingCard?.color ?? "violet"}><option value="violet">Violeta</option><option value="navy">Azul-marinho</option><option value="green">Verde</option><option value="graphite">Grafite</option></select></label>
        </>}
        {kind === "purchase" && <>
          <label>Descrição da compra<input name="description" placeholder="Ex.: Notebook para trabalho" defaultValue={editingPurchase?.description ?? ""} autoFocus required /></label>
          <div className="form-grid"><label>Cartão<select name="cardId" defaultValue={editingPurchase?.card_id ?? selectedCardId}>{cards.map((card) => <option value={card.id} key={card.id}>{card.name} •••• {card.last_four}</option>)}</select></label><label>Categoria<select name="category" defaultValue={editingPurchase?.category ?? "Casa"}><option>Casa</option><option>Eletrônicos</option><option>Educação</option><option>Saúde</option><option>Viagem</option><option>Outros</option></select></label></div>
          <label>Valor total<div className="money-input"><span>R$</span><input name="amount" inputMode="decimal" placeholder="0,00" defaultValue={editingPurchase ? (editingPurchase.total_amount_cents / 100).toFixed(2).replace(".", ",") : ""} required /></div></label>
          <div className="form-grid"><label>Número de parcelas<input name="installments" type="number" min={Math.max(editingPurchase?.installments_paid ?? 0, 1)} max="48" defaultValue={editingPurchase?.installments_count ?? 1} required /><span>{editingPurchase ? `${editingPurchase.installments_paid} já foram pagas` : "De 1 a 48 parcelas"}</span></label><label>Primeiro vencimento<input name="firstInstallment" type="date" defaultValue={editingPurchase?.first_installment_on ?? new Date().toISOString().slice(0, 10)} required /></label></div>
        </>}
        {kind === "recurring" && <>
          <label>Nome do compromisso<input name="name" placeholder="Ex.: Academia" defaultValue={editingRecurring?.name ?? ""} autoFocus required /></label>
          <div className="form-grid"><label>Tipo<select name="category" defaultValue={editingRecurring?.category ?? "Assinatura"}><option>Assinatura</option><option>Investimento</option><option>Essencial</option><option>Outro</option></select></label><label>Dia da cobrança<input name="billingDay" type="number" min="1" max="28" defaultValue={editingRecurring?.billing_day ?? 10} required /></label></div>
          <label>Valor mensal<div className="money-input"><span>R$</span><input name="amount" inputMode="decimal" placeholder="0,00" defaultValue={editingRecurring ? (editingRecurring.amount_cents / 100).toFixed(2).replace(".", ",") : ""} required /></div></label>
          <label>Cartão <span>(opcional)</span><select name="cardId" defaultValue={editingRecurring?.card_id ?? ""}><option value="">Sem cartão vinculado</option>{cards.map((card) => <option value={card.id} key={card.id}>{card.name} •••• {card.last_four}</option>)}</select></label>
        </>}
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions"><button type="button" className="button ghost" onClick={onClose}>Cancelar</button><button className="button finance-primary" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</button></div>
      </form>
    </ModalFrame>
  );
}

function ApiPurchaseForm({ cards, selectedCardId, onClose, onSent }: { cards: CreditCard[]; selectedCardId: string; onClose: () => void; onSent: () => void }) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const apiUrl = process.env.NEXT_PUBLIC_PURCHASE_API_URL;
  const today = new Date();
  const defaultDate = today.toISOString().slice(0, 10);
  const defaultTime = today.toTimeString().slice(0, 5);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const payload = {
      banco: String(form.get("bank")).trim(),
      valor: Number(String(form.get("amount")).replace(/\./g, "").replace(",", ".")),
      cartao: String(form.get("card")).trim(),
      data: String(form.get("date")),
      hora: String(form.get("time")),
    };

    if (!apiUrl) {
      setError("Configure NEXT_PUBLIC_PURCHASE_API_URL para habilitar o envio.");
      setSending(false);
      return;
    }
    if (!payload.banco || !payload.cartao || !Number.isFinite(payload.valor) || payload.valor <= 0) {
      setError("Preencha banco, cartão e um valor válido.");
      setSending(false);
      return;
    }

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      onSent();
    } catch {
      setError("Não foi possível enviar a requisição. Verifique a URL e tente novamente.");
    } finally {
      setSending(false);
    }
  }

  return (
    <ModalFrame title="Enviar compra via API" eyebrow="Nova requisição POST" onClose={onClose}>
      <form className="finance-form" onSubmit={submit}>
        <p className="api-form-intro">Envie uma compra para o serviço conectado. O payload será enviado em JSON com os campos abaixo.</p>
        <label>Banco<input name="bank" placeholder="Ex.: Itaú" autoFocus required /></label>
        <div className="form-grid">
          <label>Valor<div className="money-input"><span>R$</span><input name="amount" inputMode="decimal" placeholder="0,00" required /></div></label>
          <label>Cartão{cards.length > 0 ? <select name="card" defaultValue={cards.find((card) => card.id === selectedCardId)?.name ?? cards[0]?.name ?? ""} required><option value="" disabled>Selecione</option>{cards.map((card) => <option value={card.name} key={card.id}>{card.name} •••• {card.last_four}</option>)}</select> : <input name="card" placeholder="Ex.: Visa final 1234" required />}</label>
        </div>
        <div className="form-grid"><label>Data<input name="date" type="date" defaultValue={defaultDate} required /></label><label>Hora<input name="time" type="time" defaultValue={defaultTime} required /></label></div>
        <p className="api-endpoint-note">Destino: {apiUrl || "URL não configurada"}</p>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions"><button type="button" className="button ghost" onClick={onClose}>Cancelar</button><button className="button finance-primary" disabled={sending}><Send size={16} /> {sending ? "Enviando..." : "Enviar requisição"}</button></div>
      </form>
    </ModalFrame>
  );
}

export default function FinancialPage() {
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [authenticated, setAuthenticated] = useState(!isSupabaseConfigured);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [cards, setCards] = useState<CreditCard[]>(isSupabaseConfigured ? [] : demoCards);
  const [purchases, setPurchases] = useState<CardPurchase[]>(isSupabaseConfigured ? [] : demoPurchases);
  const [recurring, setRecurring] = useState<RecurringExpense[]>(isSupabaseConfigured ? [] : demoRecurringExpenses);
  const [cardExpenses, setCardExpenses] = useState<Expense[]>(isSupabaseConfigured ? [] : demoProject.expenses);
  const [selectedCardId, setSelectedCardId] = useState(isSupabaseConfigured ? "" : demoCards[0]?.id ?? "");
  const [view, setView] = useState<View>("overview");
  const [modal, setModal] = useState<Modal>(null);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [editingPurchase, setEditingPurchase] = useState<CardPurchase | null>(null);
  const [editingRecurring, setEditingRecurring] = useState<RecurringExpense | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => { setAuthenticated(Boolean(data.session)); setAuthReady(true); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { setAuthenticated(Boolean(session)); setAuthReady(true); });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !authenticated) return;
    Promise.all([
      getSupabase().from("credit_cards").select("*").eq("status", "active").order("created_at"),
      getSupabase().from("card_purchases").select("*").eq("status", "active").order("created_at", { ascending: false }),
      getSupabase().from("recurring_expenses").select("*").order("created_at", { ascending: false }),
      getSupabase().from("expenses").select("*").not("card_id", "is", null).order("spent_on", { ascending: false }),
    ]).then(([cardResult, purchaseResult, recurringResult, expenseResult]) => {
      const nextCards = (cardResult.data ?? []) as CreditCard[];
      setCards(nextCards);
      setPurchases((purchaseResult.data ?? []) as CardPurchase[]);
      setRecurring((recurringResult.data ?? []) as RecurringExpense[]);
      setCardExpenses((expenseResult.data ?? []) as Expense[]);
      setSelectedCardId(nextCards[0]?.id ?? "");
      setLoading(false);
    });
  }, [authenticated]);

  const selectedCard = cards.find((card) => card.id === selectedCardId) ?? cards[0];
  const selectedPurchases = useMemo(() => purchases.filter((purchase) => purchase.card_id === selectedCard?.id && purchase.status === "active"), [purchases, selectedCard]);
  const unpaidCardExpenses = useMemo(() => cardExpenses.filter((expense) => expense.status === "active" && expense.card_id && expense.card_installments_paid < expense.card_installments_count), [cardExpenses]);
  const selectedCardExpenses = useMemo(() => unpaidCardExpenses.filter((expense) => expense.card_id === selectedCard?.id), [unpaidCardExpenses, selectedCard]);
  const totalLimit = cards.reduce((sum, card) => sum + card.credit_limit_cents, 0);
  const totalOutstanding = purchases.filter((purchase) => purchase.status === "active").reduce((sum, purchase) => sum + remainingValue(purchase), 0)
    + unpaidCardExpenses.reduce((sum, expense) => sum + expenseRemainingValue(expense), 0);
  const recurringTotal = recurring.filter((item) => item.status === "active").reduce((sum, item) => sum + item.amount_cents, 0);
  const selectedOutstanding = selectedPurchases.reduce((sum, purchase) => sum + remainingValue(purchase), 0)
    + selectedCardExpenses.reduce((sum, expense) => sum + expenseRemainingValue(expense), 0);
  const selectedInvoice = selectedPurchases.reduce((sum, purchase) => sum + (purchase.installments_paid < purchase.installments_count ? installmentValue(purchase) : 0), 0)
    + selectedCardExpenses.reduce((sum, expense) => sum + expenseInstallmentValue(expense), 0);
  const availableLimit = Math.max((selectedCard?.credit_limit_cents ?? 0) - selectedOutstanding, 0);
  const utilization = selectedCard ? Math.min(Math.round((selectedOutstanding / selectedCard.credit_limit_cents) * 100), 100) : 0;

  const categories = useMemo(() => {
    const values = new Map<string, number>();
    purchases.filter((item) => item.status === "active").forEach((item) => values.set(item.category, (values.get(item.category) ?? 0) + remainingValue(item)));
    unpaidCardExpenses.forEach((item) => values.set(item.category, (values.get(item.category) ?? 0) + expenseRemainingValue(item)));
    return [...values.entries()].sort((a, b) => b[1] - a[1]);
  }, [purchases, unpaidCardExpenses]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3000);
  }

  function closeModal() {
    setModal(null);
    setEditingCard(null);
    setEditingPurchase(null);
    setEditingRecurring(null);
  }

  function openCardEditor(card: CreditCard) {
    setEditingCard(card);
    setModal("card");
  }

  function openPurchaseEditor(purchase: CardPurchase) {
    setEditingPurchase(purchase);
    setModal("purchase");
  }

  function openRecurringEditor(item: RecurringExpense) {
    setEditingRecurring(item);
    setModal("recurring");
  }

  async function save(kind: FormKind, form: FormData) {
    const userId = isSupabaseConfigured ? (await getSupabase().auth.getUser()).data.user?.id : "demo-owner";
    if (!userId) return false;
    if (kind === "card") {
      const input = { user_id: userId, name: String(form.get("name")).trim(), brand: String(form.get("brand")) as CreditCard["brand"], last_four: String(form.get("lastFour")), credit_limit_cents: centsFromInput(String(form.get("limit"))), closing_day: Number(form.get("closingDay")), due_day: Number(form.get("dueDay")), color: String(form.get("color")), status: "active" as const };
      const result = isSupabaseConfigured
        ? editingCard
          ? await getSupabase().from("credit_cards").update(input).eq("id", editingCard.id).select().single()
          : await getSupabase().from("credit_cards").insert(input).select().single()
        : { data: editingCard ? { ...editingCard, ...input } : { ...input, id: crypto.randomUUID(), created_at: new Date().toISOString() }, error: null };
      if (result.error || !result.data) return false;
      setCards((current) => editingCard ? current.map((card) => card.id === editingCard.id ? result.data as CreditCard : card) : [...current, result.data as CreditCard]);
      setSelectedCardId(result.data.id);
      showToast(editingCard ? "Cartão atualizado." : "Cartão adicionado ao seu controle.");
    }
    if (kind === "purchase") {
      const installmentsCount = Number(form.get("installments"));
      if (editingPurchase && installmentsCount < editingPurchase.installments_paid) return false;
      const input = { user_id: userId, card_id: String(form.get("cardId")), description: String(form.get("description")).trim(), category: String(form.get("category")), total_amount_cents: centsFromInput(String(form.get("amount"))), installments_count: installmentsCount, installments_paid: editingPurchase?.installments_paid ?? 0, first_installment_on: String(form.get("firstInstallment")), status: "active" as const };
      const result = isSupabaseConfigured
        ? editingPurchase
          ? await getSupabase().from("card_purchases").update(input).eq("id", editingPurchase.id).select().single()
          : await getSupabase().from("card_purchases").insert(input).select().single()
        : { data: editingPurchase ? { ...editingPurchase, ...input } : { ...input, id: crypto.randomUUID(), created_at: new Date().toISOString() }, error: null };
      if (result.error || !result.data) return false;
      setPurchases((current) => editingPurchase ? current.map((purchase) => purchase.id === editingPurchase.id ? result.data as CardPurchase : purchase) : [result.data as CardPurchase, ...current]);
      setSelectedCardId(input.card_id);
      showToast(editingPurchase ? "Compra atualizada." : "Compra parcelada registrada.");
    }
    if (kind === "recurring") {
      const input = { user_id: userId, card_id: String(form.get("cardId")) || null, name: String(form.get("name")).trim(), category: String(form.get("category")) as RecurringExpense["category"], amount_cents: centsFromInput(String(form.get("amount"))), billing_day: Number(form.get("billingDay")), status: editingRecurring?.status ?? "active" as const };
      const result = isSupabaseConfigured
        ? editingRecurring
          ? await getSupabase().from("recurring_expenses").update(input).eq("id", editingRecurring.id).select().single()
          : await getSupabase().from("recurring_expenses").insert(input).select().single()
        : { data: editingRecurring ? { ...editingRecurring, ...input } : { ...input, id: crypto.randomUUID(), created_at: new Date().toISOString() }, error: null };
      if (result.error || !result.data) return false;
      setRecurring((current) => editingRecurring ? current.map((item) => item.id === editingRecurring.id ? result.data as RecurringExpense : item) : [result.data as RecurringExpense, ...current]);
      showToast(editingRecurring ? "Compromisso atualizado." : "Compromisso mensal adicionado.");
    }
    closeModal();
    return true;
  }

  async function deletePurchase() {
    if (!editingPurchase) return;
    setDeleting(true);
    if (isSupabaseConfigured) {
      const { error } = await getSupabase().from("card_purchases").delete().eq("id", editingPurchase.id);
      if (error) { setDeleting(false); showToast("Não foi possível excluir a compra."); return; }
    }
    setPurchases((current) => current.filter((purchase) => purchase.id !== editingPurchase.id));
    setDeleting(false);
    closeModal();
    showToast("Compra excluída.");
  }

  async function deleteRecurring() {
    if (!editingRecurring) return;
    setDeleting(true);
    if (isSupabaseConfigured) {
      const { error } = await getSupabase().from("recurring_expenses").delete().eq("id", editingRecurring.id);
      if (error) { setDeleting(false); showToast("Não foi possível excluir este compromisso."); return; }
    }
    setRecurring((current) => current.filter((item) => item.id !== editingRecurring.id));
    setDeleting(false);
    closeModal();
    showToast("Compromisso excluído.");
  }

  async function deleteCard() {
    if (!editingCard) return;
    setDeleting(true);
    if (isSupabaseConfigured) {
      const { error } = await getSupabase().from("credit_cards").delete().eq("id", editingCard.id);
      if (error) { setDeleting(false); showToast("Não foi possível excluir o cartão."); return; }
    }
    const remainingCards = cards.filter((card) => card.id !== editingCard.id);
    setCards(remainingCards);
    setPurchases((current) => current.filter((purchase) => purchase.card_id !== editingCard.id));
    setRecurring((current) => current.map((item) => item.card_id === editingCard.id ? { ...item, card_id: null } : item));
    setCardExpenses((current) => current.map((expense) => expense.card_id === editingCard.id ? { ...expense, card_id: null, card_installments_count: 1, card_installments_paid: 0, card_paid_on: null } : expense));
    setSelectedCardId(remainingCards[0]?.id ?? "");
    setDeleting(false);
    closeModal();
    showToast("Cartão e compras vinculadas foram excluídos.");
  }

  async function payInvoice() {
    if (!selectedCard) return;
    const payable = selectedPurchases.filter((purchase) => purchase.installments_paid < purchase.installments_count);
    const paidOn = new Date().toISOString().slice(0, 10);
    if (isSupabaseConfigured) {
      const results = await Promise.all([
        ...payable.map((purchase) => getSupabase().from("card_purchases").update({ installments_paid: purchase.installments_paid + 1 }).eq("id", purchase.id)),
        ...selectedCardExpenses.map((expense) => {
          const nextPaid = Math.min(expense.card_installments_paid + 1, expense.card_installments_count);
          return getSupabase().from("expenses").update({ card_installments_paid: nextPaid, card_paid_on: nextPaid === expense.card_installments_count ? paidOn : null }).eq("id", expense.id);
        }),
      ]);
      if (results.some((result) => result.error)) { showToast("Não foi possível concluir o pagamento."); return; }
    }
    setPurchases((current) => current.map((purchase) => purchase.card_id === selectedCard.id && purchase.installments_paid < purchase.installments_count ? { ...purchase, installments_paid: purchase.installments_paid + 1 } : purchase));
    setCardExpenses((current) => current.map((expense) => {
      if (expense.card_id !== selectedCard.id || expense.card_installments_paid >= expense.card_installments_count) return expense;
      const nextPaid = expense.card_installments_paid + 1;
      return { ...expense, card_installments_paid: nextPaid, card_paid_on: nextPaid === expense.card_installments_count ? paidOn : null };
    }));
    setModal(null);
    showToast(`Fatura paga. ${formatMoney(selectedInvoice)} liberados no limite.`);
  }

  async function toggleRecurring(item: RecurringExpense) {
    const status = item.status === "active" ? "paused" : "active";
    if (isSupabaseConfigured) {
      const { error } = await getSupabase().from("recurring_expenses").update({ status }).eq("id", item.id);
      if (error) { showToast("Não foi possível atualizar este compromisso."); return; }
    }
    setRecurring((current) => current.map((value) => value.id === item.id ? { ...value, status } : value));
  }

  if (!authReady || loading) return <main className="loading-screen">Preparando seu controle financeiro...</main>;
  if (!authenticated) return <main className="public-state"><div className="brand-mark"><Hammer size={22} /></div><h1>Acesso administrativo</h1><p>Entre no painel para consultar seus cartões e compromissos.</p><Link className="button primary" href="/">Ir para o login</Link></main>;

  return (
    <div className="app-shell finance-page">
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div className="sidebar-brand"><div className="brand-mark"><Hammer size={22} /></div><div><strong>Obra em Dia</strong><span>Organização financeira</span></div></div>
        <nav>
          <Link href="/#resumo"><CircleDollarSign size={19} /> Visão geral</Link>
          <Link href="/#pagamentos"><ReceiptText size={19} /> Pagamentos</Link>
          <Link href="/gastos"><ShoppingCart size={19} /> Gastos da obra</Link>
          <Link className="active" href="/financeiro"><WalletCards size={19} /> Cartões e parcelas</Link>
          <Link href="/#link"><Link2 size={19} /> Link do pedreiro</Link>
        </nav>
        <div className="sidebar-security"><ShieldCheck size={19} /><div><strong>Área somente sua</strong><span>Cartões e compromissos não são compartilhados.</span></div></div>
        {isSupabaseConfigured && <button className="sidebar-logout" onClick={() => getSupabase().auth.signOut()}><LogOut size={18} /> Sair</button>}
      </aside>

      <main className="dashboard finance-dashboard">
        <header className="finance-topbar">
          <div className="finance-title-row"><button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menu">{menuOpen ? <X size={22} /> : <Menu size={22} />}</button><div><Link className="back-link" href="/"><ArrowLeft size={15} /> Painel</Link><p className="eyebrow">Organização financeira</p><h1>Cartões e parcelas</h1></div></div>
          <div className="finance-actions"><button className="button soft-button" onClick={() => setModal("recurring")}><RefreshCw size={17} /> Novo recorrente</button><button className="button api-button" onClick={() => setModal("api-purchase")}><Send size={17} /> Enviar via API</button><button className="button finance-primary" onClick={() => setModal(cards.length ? "purchase" : "card")}><Plus size={18} /> {cards.length ? "Nova compra" : "Adicionar cartão"}</button></div>
        </header>

        <div className="finance-tabs" role="tablist" aria-label="Seções financeiras"><button className={view === "overview" ? "active" : ""} onClick={() => setView("overview")}>Visão geral</button><button className={view === "recurring" ? "active" : ""} onClick={() => setView("recurring")}>Recorrentes</button><button className={view === "report" ? "active" : ""} onClick={() => setView("report")}>Relatório</button><span><CalendarDays size={15} /> {monthLabel}</span></div>

        {view === "overview" && <>
          <section className="finance-summary">
            <article><span className="summary-symbol purple"><ReceiptText size={20} /></span><div><p>Comprometido nos cartões</p><strong>{formatMoney(totalOutstanding)}</strong><small>Saldo de todas as parcelas</small></div></article>
            <article><span className="summary-symbol blue"><RefreshCw size={20} /></span><div><p>Recorrente por mês</p><strong>{formatMoney(recurringTotal)}</strong><small>Fixos, assinaturas e investimentos</small></div></article>
            <article><span className="summary-symbol green"><PiggyBank size={20} /></span><div><p>Limite disponível</p><strong>{formatMoney(Math.max(totalLimit - totalOutstanding, 0))}</strong><small>de {formatMoney(totalLimit)} no total</small></div></article>
          </section>

          <section className="cards-section">
            <div className="section-heading"><div><p className="eyebrow">Meus cartões</p><h2>Escolha um cartão para ver os detalhes</h2></div><button className="text-add" onClick={() => setModal("card")}><Plus size={16} /> Adicionar cartão</button></div>
            {cards.length === 0 ? <div className="finance-empty"><CreditCardIcon size={28} /><strong>Comece cadastrando seu primeiro cartão</strong><p>Informe o limite e o vencimento para acompanhar as compras.</p><button className="button finance-primary" onClick={() => setModal("card")}>Adicionar cartão</button></div> : <div className="credit-card-strip">{cards.map((card) => {
              const committed = purchases.filter((purchase) => purchase.card_id === card.id && purchase.status === "active").reduce((sum, purchase) => sum + remainingValue(purchase), 0)
                + unpaidCardExpenses.filter((expense) => expense.card_id === card.id).reduce((sum, expense) => sum + expenseRemainingValue(expense), 0);
              const available = Math.max(card.credit_limit_cents - committed, 0);
              return <button className={`credit-card-tile ${card.color} ${card.id === selectedCard?.id ? "selected" : ""}`} key={card.id} onClick={() => setSelectedCardId(card.id)}><span className="card-glow" /><span className="card-top"><CreditCardIcon size={22} /><MoreHorizontal size={20} /></span><span className="card-name">{card.name}</span><span className="card-number">•••• •••• •••• {card.last_four}</span><span className="card-bottom"><span><small>Disponível</small><strong>{formatMoney(available)}</strong></span><em>{card.brand}</em></span></button>;
            })}</div>}
          </section>

          {selectedCard && <section className="card-detail-grid">
            <article className="invoice-card">
              <div className="invoice-heading"><span className={`summary-symbol ${selectedCard.color === "violet" ? "purple" : "blue"}`}><ReceiptText size={20} /></span><span><small>Fatura estimada</small><strong>{formatMoney(selectedInvoice)}</strong></span><em>Vence dia {selectedCard.due_day}</em></div>
              <div className="selected-card-actions"><button onClick={() => openCardEditor(selectedCard)}><Pencil size={15} /> Editar cartão</button><button className="danger-link" onClick={() => { setEditingCard(selectedCard); setModal("delete-card"); }}><Trash2 size={15} /> Excluir</button></div>
              <div className="limit-copy"><span><strong>{formatMoney(availableLimit)}</strong> disponíveis</span><span>{utilization}% utilizado</span></div><div className="limit-bar"><span style={{ width: `${utilization}%` }} /></div>
              <div className="limit-legend"><span>Limite total {formatMoney(selectedCard.credit_limit_cents)}</span><span>Fecha dia {selectedCard.closing_day}</span></div>
              <button className="button pay-invoice" onClick={() => setModal("invoice")} disabled={selectedInvoice === 0}><Check size={17} /> Marcar fatura como paga</button>
            </article>
            <article className="release-card"><div><span className="summary-symbol green"><TrendingUp size={20} /></span><p className="eyebrow">Próxima liberação</p></div><strong>{formatMoney(selectedInvoice)}</strong><p>Ao pagar a fatura do dia {selectedCard.due_day}, este valor volta para o limite disponível.</p><div className="release-date"><CalendarDays size={17} /><span><small>Pagamento previsto</small><strong>dia {selectedCard.due_day} deste mês</strong></span></div></article>
          </section>}

          <section className="installments-panel">
            <div className="section-heading"><div><p className="eyebrow">Compras parceladas</p><h2>O que ainda falta pagar</h2></div><span className="purchase-count">{selectedPurchases.length} compras</span></div>
            <div className="installment-list">{selectedPurchases.length === 0 ? <div className="finance-empty compact"><Sparkles size={24} /><strong>Nenhuma parcela neste cartão</strong><p>Quando você cadastrar uma compra, o andamento aparece aqui.</p></div> : selectedPurchases.map((purchase) => {
              const left = purchase.installments_count - purchase.installments_paid;
              const progress = Math.round((purchase.installments_paid / purchase.installments_count) * 100);
              return <article className="installment-row" key={purchase.id}><span className="purchase-icon">{purchase.category === "Educação" ? <Landmark size={19} /> : <ShoppingCart size={19} />}</span><div className="purchase-info"><div><span><strong>{purchase.description}</strong><small>{purchase.category}</small></span><span className="purchase-values"><strong>{formatMoney(installmentValue(purchase))}<small>/mês</small></strong><em>{formatMoney(remainingValue(purchase))} restantes</em></span></div><div className="installment-progress"><span><i style={{ width: `${progress}%` }} /></span><small><b>{purchase.installments_paid} de {purchase.installments_count}</b> pagas · faltam {left} {left === 1 ? "parcela" : "parcelas"}</small></div></div><div className="purchase-actions"><button onClick={() => openPurchaseEditor(purchase)} aria-label={`Editar ${purchase.description}`}><Pencil size={15} /></button><button className="danger-link" onClick={() => { setEditingPurchase(purchase); setModal("delete-purchase"); }} aria-label={`Excluir ${purchase.description}`}><Trash2 size={15} /></button></div></article>;
            })}</div>
            {selectedCardExpenses.length > 0 && <div className="card-expenses-block"><div className="card-expenses-heading"><div><p className="eyebrow">Gastos da obra no cartão</p><h3>Lançamentos desta fatura</h3></div><span>{selectedCardExpenses.length} {selectedCardExpenses.length === 1 ? "gasto" : "gastos"}</span></div>{selectedCardExpenses.map((expense) => <article className="card-expense-row" key={expense.id}><span className="purchase-icon"><Hammer size={18} /></span><span><strong>{expense.description}</strong><small>{expense.item_name} · {expense.supplier} · {expense.card_installments_paid} de {expense.card_installments_count} pagas</small></span><span className="card-expense-values"><strong>{formatMoney(expenseInstallmentValue(expense))}<small>/mês</small></strong><em>{formatMoney(expenseRemainingValue(expense))} restantes</em></span></article>)}</div>}
          </section>
        </>}

        {view === "recurring" && <section className="recurring-layout">
          <div className="recurring-hero"><div><span className="summary-symbol blue"><RefreshCw size={21} /></span><div><p className="eyebrow">Previsibilidade mensal</p><h2>{formatMoney(recurringTotal)} comprometidos todo mês</h2><p>Reúna assinaturas, gastos essenciais e aportes para saber quanto do orçamento já tem destino.</p></div></div><button className="button finance-primary" onClick={() => setModal("recurring")}><Plus size={17} /> Adicionar recorrente</button></div>
          <div className="recurring-list">{recurring.map((item) => <article className={item.status === "paused" ? "paused" : ""} key={item.id}><span className={`recurring-icon ${item.category.toLowerCase()}`}>{item.category === "Investimento" ? <TrendingUp size={19} /> : item.category === "Assinatura" ? <Sparkles size={19} /> : <Landmark size={19} />}</span><div><strong>{item.name}</strong><small>{item.category} · todo dia {item.billing_day}{item.card_id ? ` · ${cards.find((card) => card.id === item.card_id)?.name ?? "Cartão"}` : ""}</small></div><span className="recurring-value"><strong>{formatMoney(item.amount_cents)}</strong><small>por mês</small></span><div className="recurring-actions"><button className="pause-button" onClick={() => toggleRecurring(item)}>{item.status === "active" ? "Pausar" : "Reativar"}</button><button onClick={() => openRecurringEditor(item)} aria-label={`Editar ${item.name}`}><Pencil size={15} /></button><button className="danger-link" onClick={() => { setEditingRecurring(item); setModal("delete-recurring"); }} aria-label={`Excluir ${item.name}`}><Trash2 size={15} /></button></div></article>)}</div>
        </section>}

        {view === "report" && <section className="report-grid">
          <article className="report-main"><div className="section-heading"><div><p className="eyebrow">Projeção</p><h2>Parcelas dos próximos 6 meses</h2></div><span className="report-pill">{formatMoney(totalOutstanding)} a pagar</span></div><div className="bar-chart">{[100, 82, 72, 58, 42, 28].map((height, index) => <div key={height}><span><i style={{ height: `${height}%` }} /></span><small>{["Set", "Out", "Nov", "Dez", "Jan", "Fev"][index]}</small></div>)}</div><p className="report-note">A projeção diminui conforme suas parcelas terminam. Gastos recorrentes não estão incluídos nas barras.</p></article>
          <article className="category-report"><p className="eyebrow">Por categoria</p><h2>Onde está o saldo parcelado</h2><div>{categories.map(([name, value], index) => <div className="category-row" key={name}><span className={`category-dot c${index}`} /><span><strong>{name}</strong><small>{Math.round((value / Math.max(totalOutstanding, 1)) * 100)}% do saldo</small></span><strong>{formatMoney(value)}</strong></div>)}</div></article>
          <article className="report-highlight"><span><PiggyBank size={24} /></span><div><p className="eyebrow">Leitura rápida</p><h2>Seu limite será liberado gradualmente</h2><p>A cada fatura paga, uma parcela de cada compra é concluída e o mesmo valor volta a ficar disponível no cartão.</p></div></article>
        </section>}

        {!isSupabaseConfigured && <div className="demo-notice"><span>Demonstração</span>Você pode testar cadastros e o pagamento da fatura. Configure o Supabase para salvar os dados.</div>}
      </main>

      {modal === "api-purchase" && <ApiPurchaseForm cards={cards} selectedCardId={selectedCard?.id ?? ""} onClose={closeModal} onSent={() => { closeModal(); showToast("Requisição enviada com sucesso."); }} />}
      {(modal === "card" || modal === "purchase" || modal === "recurring") && <FinancialForm kind={modal} cards={cards} selectedCardId={selectedCard?.id ?? ""} editingCard={editingCard} editingPurchase={editingPurchase} editingRecurring={editingRecurring} onClose={closeModal} onSave={save} />}
      {modal === "invoice" && selectedCard && <ModalFrame title="Confirmar pagamento da fatura" eyebrow={selectedCard.name} onClose={() => setModal(null)}><div className="invoice-confirm"><span className="confirm-icon"><Check size={24} /></span><p>Ao confirmar, a parcela deste mês será marcada como paga em <strong>{selectedPurchases.filter((item) => item.installments_paid < item.installments_count).length} compras</strong>{selectedCardExpenses.length === 1 ? " e em 1 gasto da obra" : selectedCardExpenses.length > 1 ? ` e em ${selectedCardExpenses.length} gastos da obra` : ""}.</p><dl><div><dt>Valor da fatura</dt><dd>{formatMoney(selectedInvoice)}</dd></div><div><dt>Limite após pagamento</dt><dd>{formatMoney(Math.min(availableLimit + selectedInvoice, selectedCard.credit_limit_cents))}</dd></div></dl><div className="modal-actions"><button className="button ghost" onClick={() => setModal(null)}>Voltar</button><button className="button finance-primary" onClick={payInvoice}>Confirmar pagamento</button></div></div></ModalFrame>}
      {modal === "delete-purchase" && editingPurchase && <ModalFrame title="Excluir compra?" eyebrow="Esta ação não pode ser desfeita" onClose={closeModal}><div className="delete-finance-confirm"><span><AlertTriangle size={24} /></span><p>A compra <strong>{editingPurchase.description}</strong> e todo o seu histórico de parcelas serão removidos.</p><div className="modal-actions"><button className="button ghost" onClick={closeModal}>Cancelar</button><button className="button destructive-finance" disabled={deleting} onClick={deletePurchase}><Trash2 size={16} /> {deleting ? "Excluindo..." : "Excluir compra"}</button></div></div></ModalFrame>}
      {modal === "delete-recurring" && editingRecurring && <ModalFrame title="Excluir compromisso?" eyebrow="Esta ação não pode ser desfeita" onClose={closeModal}><div className="delete-finance-confirm"><span><AlertTriangle size={24} /></span><p>O compromisso recorrente <strong>{editingRecurring.name}</strong> será removido do seu controle financeiro.</p><div className="modal-actions"><button className="button ghost" onClick={closeModal}>Cancelar</button><button className="button destructive-finance" disabled={deleting} onClick={deleteRecurring}><Trash2 size={16} /> {deleting ? "Excluindo..." : "Excluir compromisso"}</button></div></div></ModalFrame>}
      {modal === "delete-card" && editingCard && <ModalFrame title="Excluir cartão?" eyebrow="Revise antes de continuar" onClose={closeModal}><div className="delete-finance-confirm"><span><AlertTriangle size={24} /></span><p>O cartão <strong>{editingCard.name} •••• {editingCard.last_four}</strong> e suas <strong>{purchases.filter((purchase) => purchase.card_id === editingCard.id).length} compras</strong> serão removidos. Gastos da obra e recorrências serão mantidos sem cartão associado.</p><div className="modal-actions"><button className="button ghost" onClick={closeModal}>Cancelar</button><button className="button destructive-finance" disabled={deleting} onClick={deleteCard}><Trash2 size={16} /> {deleting ? "Excluindo..." : "Excluir cartão"}</button></div></div></ModalFrame>}
      {toast && <div className="toast"><Check size={18} />{toast}</div>}
    </div>
  );
}
