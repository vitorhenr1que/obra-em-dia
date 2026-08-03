"use client";

import {
  ArrowLeft,
  Ban,
  Boxes,
  Check,
  ChevronRight,
  CircleDollarSign,
  Hammer,
  Link2,
  LogOut,
  Menu,
  Pencil,
  Plus,
  ReceiptText,
  ShieldCheck,
  ShoppingCart,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { demoProject } from "@/lib/demo-data";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import type { Expense, Project } from "@/lib/types";

function formatMoney(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

function centsFromInput(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  return Math.round(Number(normalized) * 100);
}

function numberFromInput(value: string) {
  return Number(value.replace(/\./g, "").replace(",", "."));
}

function ExpenseModal({ expense, onClose, onSave }: {
  expense?: Expense | null;
  onClose: () => void;
  onSave: (input: Pick<Expense, "amount_cents" | "spent_on" | "category" | "item_name" | "quantity" | "unit" | "description" | "supplier" | "note">) => Promise<boolean>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amount = centsFromInput(String(form.get("amount")));
    const quantity = numberFromInput(String(form.get("quantity")));
    if (!amount || amount <= 0 || !quantity || quantity <= 0) {
      setError("Informe um valor e uma quantidade maiores que zero.");
      return;
    }
    setSaving(true);
    const saved = await onSave({
      amount_cents: amount,
      spent_on: String(form.get("spentOn")),
      category: String(form.get("category")) as Expense["category"],
      item_name: String(form.get("itemName")).trim(),
      quantity,
      unit: String(form.get("unit")).trim().toLocaleLowerCase("pt-BR"),
      description: String(form.get("description")).trim(),
      supplier: String(form.get("supplier")).trim(),
      note: String(form.get("note") || "").trim() || null,
    });
    if (!saved) setError("Não foi possível registrar o gasto. Tente novamente.");
    setSaving(false);
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="payment-modal" role="dialog" aria-modal="true" aria-label="Registrar gasto" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-heading">
          <div><p className="eyebrow">Controle privado</p><h2>{expense ? "Editar gasto" : "Registrar gasto"}</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={20} /></button>
        </div>
        <p className="private-notice"><ShieldCheck size={16} /> Somente o administrador da obra pode visualizar estes dados.</p>
        <form onSubmit={handleSubmit} className="stack-form">
          <label>Valor gasto<div className="money-input"><span>R$</span><input name="amount" inputMode="decimal" placeholder="0,00" defaultValue={expense ? (expense.amount_cents / 100).toFixed(2).replace(".", ",") : ""} autoFocus required /></div></label>
          <div className="form-grid">
            <label>Data do gasto<input name="spentOn" type="date" defaultValue={expense?.spent_on ?? new Date().toISOString().slice(0, 10)} required /></label>
            <label>Categoria<select name="category" defaultValue={expense?.category ?? "Material"}><option>Material</option><option>Mão de obra extra</option><option>Frete</option><option>Equipamento</option><option>Taxas</option><option>Outros</option></select></label>
          </div>
          <label>Item do gasto<input name="itemName" list="expense-items" maxLength={80} placeholder="Ex.: Cimento" defaultValue={expense?.item_name ?? ""} required /><datalist id="expense-items"><option value="Cimento" /><option value="Areia" /><option value="Ferragem" /><option value="Tijolos" /><option value="Tinta" /><option value="Madeira" /><option value="Elétrica" /><option value="Hidráulica" /><option value="Frete" /><option value="Equipamentos" /></datalist><span>Use sempre o mesmo nome para manter o total agrupado.</span></label>
          <div className="form-grid">
            <label>Quantidade<input name="quantity" inputMode="decimal" placeholder="Ex.: 20" defaultValue={expense?.quantity ?? ""} required /></label>
            <label>Unidade<input name="unit" list="expense-units" maxLength={30} placeholder="Ex.: saco" defaultValue={expense?.unit ?? ""} required /><datalist id="expense-units"><option value="saco" /><option value="kg" /><option value="m³" /><option value="metro" /><option value="unidade" /><option value="litro" /><option value="caixa" /><option value="serviço" /></datalist></label>
          </div>
          <label>Descrição<input name="description" maxLength={160} placeholder="Ex.: 20 sacos de cimento CP II" defaultValue={expense?.description ?? ""} required /></label>
          <label>Loja ou fornecedor<input name="supplier" maxLength={120} placeholder="Ex.: Depósito Central" defaultValue={expense?.supplier ?? ""} required /><span>Usaremos a loja e a quantidade para comparar os preços.</span></label>
          <label>Observação <span>(opcional)</span><textarea name="note" maxLength={500} rows={3} placeholder="Detalhes importantes sobre este gasto" defaultValue={expense?.note ?? ""} /></label>
          {error && <p className="form-error">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="button ghost" onClick={onClose}>Cancelar</button>
            <button className="button expense-button" disabled={saving}>{saving ? "Salvando..." : expense ? "Salvar alterações" : "Confirmar gasto"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function ExpenseDetailModal({ expense, onClose, onCancel, onEdit, onDelete }: {
  expense: Expense;
  onClose: () => void;
  onCancel: (expense: Expense) => Promise<void>;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => Promise<void>;
}) {
  const [cancelling, setCancelling] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="expense-detail-modal" role="dialog" aria-modal="true" aria-label="Detalhes do gasto" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-heading">
          <div><p className="eyebrow">{expense.category}</p><h2>{expense.description}</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={20} /></button>
        </div>
        <strong className="expense-detail-value">{formatMoney(expense.amount_cents)}</strong>
        <dl className="receipt-details">
          <div><dt>Data</dt><dd>{formatDate(expense.spent_on)}</dd></div>
          <div><dt>Categoria</dt><dd>{expense.category}</dd></div>
          <div><dt>Item do gasto</dt><dd>{expense.item_name}</dd></div>
          <div><dt>Quantidade</dt><dd>{expense.quantity} {expense.unit}</dd></div>
          <div><dt>Preço unitário</dt><dd>{formatMoney(Math.round(expense.amount_cents / expense.quantity))} / {expense.unit}</dd></div>
          <div><dt>Loja ou fornecedor</dt><dd>{expense.supplier}</dd></div>
          <div><dt>Status</dt><dd>{expense.status === "active" ? "Ativo" : "Cancelado"}</dd></div>
        </dl>
        {expense.note && <p className="receipt-note">{expense.note}</p>}
        {confirmingDelete ? (
          <div className="delete-confirmation"><p><strong>Excluir permanentemente?</strong><span>Este lançamento será removido e não poderá ser recuperado.</span></p><div><button className="button ghost" onClick={() => setConfirmingDelete(false)}>Voltar</button><button className="button destructive" disabled={deleting} onClick={async () => { setDeleting(true); await onDelete(expense); setDeleting(false); }}><Trash2 size={16} />{deleting ? "Excluindo..." : "Excluir"}</button></div></div>
        ) : (
          <div className="expense-detail-actions">
            <button className="button ghost" onClick={() => onEdit(expense)}><Pencil size={16} /> Editar</button>
            {expense.status === "active" && <button className="button ghost" disabled={cancelling} onClick={async () => { setCancelling(true); await onCancel(expense); setCancelling(false); }}><Ban size={16} /> {cancelling ? "Cancelando..." : "Cancelar"}</button>}
            <button className="button delete-button" onClick={() => setConfirmingDelete(true)}><Trash2 size={16} /> Excluir</button>
          </div>
        )}
      </section>
    </div>
  );
}

export default function ExpensesPage() {
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [authenticated, setAuthenticated] = useState(!isSupabaseConfigured);
  const [project, setProject] = useState<Project | null>(isSupabaseConfigured ? null : demoProject);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => {
      setAuthenticated(Boolean(data.session));
      setAuthReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(Boolean(session));
      setAuthReady(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !authenticated) return;
    getSupabase()
      .from("projects")
      .select("*, payments(*), expenses(*)")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setProject(data as Project | null);
        setLoading(false);
      });
  }, [authenticated]);

  const activeExpenses = useMemo(() => project?.expenses.filter((expense) => expense.status === "active") ?? [], [project]);
  const totalExpenses = useMemo(() => activeExpenses.reduce((total, expense) => total + expense.amount_cents, 0), [activeExpenses]);
  const paid = useMemo(() => project?.payments.filter((payment) => payment.status === "confirmed").reduce((total, payment) => total + payment.amount_cents, 0) ?? 0, [project]);
  const sortedExpenses = useMemo(() => [...(project?.expenses ?? [])].sort((a, b) => b.spent_on.localeCompare(a.spent_on)), [project]);
  const categoryCount = new Set(activeExpenses.map((expense) => expense.category)).size;
  const expenseTotalsByItem = useMemo(() => {
    const grouped = new Map<string, { name: string; total: number; count: number }>();
    for (const expense of activeExpenses) {
      const name = expense.item_name.trim();
      const key = name.toLocaleLowerCase("pt-BR");
      const current = grouped.get(key);
      grouped.set(key, {
        name: current?.name ?? name,
        total: (current?.total ?? 0) + expense.amount_cents,
        count: (current?.count ?? 0) + 1,
      });
    }
    return [...grouped.values()].sort((a, b) => b.total - a.total);
  }, [activeExpenses]);
  const largestItemTotal = expenseTotalsByItem[0]?.total ?? 0;
  const supplierComparisons = useMemo(() => {
    const itemGroups = new Map<string, { item: string; unit: string; purchases: Expense[] }>();
    for (const expense of activeExpenses) {
      if (expense.supplier.trim().toLocaleLowerCase("pt-BR") === "não informado") continue;
      const key = `${expense.item_name.trim().toLocaleLowerCase("pt-BR")}::${expense.unit.trim().toLocaleLowerCase("pt-BR")}`;
      const current = itemGroups.get(key);
      itemGroups.set(key, {
        item: current?.item ?? expense.item_name.trim(),
        unit: current?.unit ?? expense.unit.trim(),
        purchases: [...(current?.purchases ?? []), expense],
      });
    }

    return [...itemGroups.values()].flatMap((group) => {
      const stores = new Map<string, { name: string; total: number; quantity: number }>();
      for (const purchase of group.purchases) {
        const key = purchase.supplier.trim().toLocaleLowerCase("pt-BR");
        const current = stores.get(key);
        stores.set(key, {
          name: current?.name ?? purchase.supplier.trim(),
          total: (current?.total ?? 0) + purchase.amount_cents,
          quantity: (current?.quantity ?? 0) + Number(purchase.quantity),
        });
      }
      if (stores.size < 2) return [];
      const prices = [...stores.values()]
        .map((store) => ({ ...store, unitPrice: store.total / store.quantity }))
        .sort((a, b) => a.unitPrice - b.unitPrice);
      const cheapest = prices[0];
      const potentialSavings = Math.max(0, Math.round(group.purchases.reduce(
        (sum, purchase) => sum + purchase.amount_cents - (Number(purchase.quantity) * cheapest.unitPrice),
        0,
      )));
      return [{ ...group, stores: prices, cheapest, potentialSavings }];
    }).sort((a, b) => b.potentialSavings - a.potentialSavings);
  }, [activeExpenses]);
  const totalPotentialSavings = supplierComparisons.reduce((sum, comparison) => sum + comparison.potentialSavings, 0);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  }

  function openNewExpense() {
    setEditingExpense(null);
    setExpenseOpen(true);
  }

  async function saveExpense(input: Pick<Expense, "amount_cents" | "spent_on" | "category" | "item_name" | "quantity" | "unit" | "description" | "supplier" | "note">) {
    if (!project) return false;
    let expense: Expense;
    if (isSupabaseConfigured) {
      const query = editingExpense
        ? getSupabase().from("expenses").update(input).eq("id", editingExpense.id)
        : getSupabase().from("expenses").insert({ ...input, project_id: project.id });
      const { data, error } = await query.select().single();
      if (error || !data) return false;
      expense = data as Expense;
    } else if (editingExpense) {
      expense = { ...editingExpense, ...input };
    } else {
      expense = { ...input, id: crypto.randomUUID(), project_id: project.id, status: "active", created_at: new Date().toISOString() };
    }
    setProject({
      ...project,
      expenses: editingExpense
        ? project.expenses.map((item) => item.id === expense.id ? expense : item)
        : [...project.expenses, expense],
    });
    setExpenseOpen(false);
    setEditingExpense(null);
    showToast(editingExpense ? "Lançamento atualizado." : "Gasto registrado no controle privado.");
    return true;
  }

  async function cancelExpense(expense: Expense) {
    if (!project) return;
    if (isSupabaseConfigured) {
      const { error } = await getSupabase().from("expenses").update({ status: "cancelled" }).eq("id", expense.id);
      if (error) {
        showToast("Não foi possível cancelar o lançamento.");
        return;
      }
    }
    const updated = { ...expense, status: "cancelled" as const };
    setProject({ ...project, expenses: project.expenses.map((item) => item.id === expense.id ? updated : item) });
    setSelectedExpense(updated);
    showToast("Lançamento cancelado e totais atualizados.");
  }

  async function deleteExpense(expense: Expense) {
    if (!project) return;
    if (isSupabaseConfigured) {
      const { error } = await getSupabase().from("expenses").delete().eq("id", expense.id);
      if (error) {
        showToast("Não foi possível excluir o lançamento.");
        return;
      }
    }
    setProject({ ...project, expenses: project.expenses.filter((item) => item.id !== expense.id) });
    setSelectedExpense(null);
    showToast("Lançamento excluído permanentemente.");
  }

  if (!authReady || loading) return <main className="loading-screen">Carregando controle de gastos...</main>;
  if (!authenticated) return <main className="public-state"><div className="brand-mark"><Hammer size={22} /></div><h1>Acesso administrativo</h1><p>Entre no painel para consultar os gastos privados da obra.</p><Link className="button primary" href="/">Ir para o login</Link></main>;
  if (!project) return <main className="public-state"><div className="brand-mark"><Hammer size={22} /></div><h1>Nenhuma obra cadastrada</h1><p>Cadastre uma empreitada antes de lançar os gastos.</p><Link className="button primary" href="/">Voltar ao painel</Link></main>;

  return (
    <div className="app-shell expense-page">
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div className="sidebar-brand"><div className="brand-mark"><Hammer size={22} /></div><div><strong>Obra em Dia</strong><span>Gestão financeira</span></div></div>
        <nav>
          <Link href="/#resumo"><CircleDollarSign size={19} /> Visão geral</Link>
          <Link href="/#pagamentos"><ReceiptText size={19} /> Pagamentos</Link>
          <Link className="active" href="/gastos"><ShoppingCart size={19} /> Gastos da obra</Link>
          <Link href="/#link"><Link2 size={19} /> Link do pedreiro</Link>
        </nav>
        <div className="sidebar-security"><ShieldCheck size={19} /><div><strong>Controle privado</strong><span>Estes gastos não aparecem para o pedreiro.</span></div></div>
        {isSupabaseConfigured && <button className="sidebar-logout" onClick={() => getSupabase().auth.signOut()}><LogOut size={18} /> Sair</button>}
      </aside>

      <main className="dashboard">
        <header className="topbar expense-topbar">
          <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menu">{menuOpen ? <X size={22} /> : <Menu size={22} />}</button>
          <div><Link className="back-link" href="/"><ArrowLeft size={15} /> Painel</Link><p className="eyebrow">{project.title}</p><h1>Gastos da obra</h1></div>
          <button className="button expense-button top-action" onClick={openNewExpense}><Plus size={18} /> Registrar gasto</button>
        </header>

        <section className="expense-intro">
          <div><span className="expense-lock"><ShieldCheck size={23} /></span><div><p className="eyebrow">Área exclusiva</p><h2>Seu controle financeiro, em um só lugar.</h2><p>Acompanhe materiais, fretes e outros custos sem compartilhar essas informações no link do pedreiro.</p></div></div>
          <button className="button expense-button" onClick={openNewExpense}><Plus size={17} /> Adicionar gasto</button>
        </section>

        <section className="expense-summary-grid expense-page-summary">
          <article><span className="expense-icon"><ShoppingCart size={20} /></span><div><p>Outros gastos</p><strong>{formatMoney(totalExpenses)}</strong></div></article>
          <article><span className="expense-icon"><Tags size={20} /></span><div><p>Categorias utilizadas</p><strong>{categoryCount}</strong></div></article>
          <article className="project-cost"><span className="expense-icon"><Boxes size={20} /></span><div><p>Custo total até agora</p><strong>{formatMoney(paid + totalExpenses)}</strong><small>Pagamentos + outros gastos</small></div></article>
        </section>

        <section className="panel item-totals-panel">
          <div className="panel-heading"><div><p className="eyebrow">Acumulado por item</p><h2>Quanto foi gasto em cada coisa</h2></div><span className="count-badge">{expenseTotalsByItem.length} itens</span></div>
          {expenseTotalsByItem.length === 0 ? (
            <p className="empty-list">Adicione um gasto para começar a acompanhar os totais por item.</p>
          ) : (
            <div className="item-totals-list">
              {expenseTotalsByItem.map((item) => (
                <article key={item.name} className="item-total-row">
                  <div className="item-total-heading"><span><strong>{item.name}</strong><small>{item.count} {item.count === 1 ? "lançamento" : "lançamentos"}</small></span><strong>{formatMoney(item.total)}</strong></div>
                  <div className="item-total-track"><span style={{ width: `${largestItemTotal ? Math.max((item.total / largestItemTotal) * 100, 3) : 0}%` }} /></div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="supplier-comparison-section">
          <div className="supplier-comparison-heading">
            <div><p className="eyebrow">Comparação de preços</p><h2>Onde o material saiu mais barato</h2><p>Comparamos o preço médio por unidade de cada item nas lojas cadastradas.</p></div>
            <div className="savings-total"><small>Economia potencial</small><strong>{formatMoney(totalPotentialSavings)}</strong></div>
          </div>
          {supplierComparisons.length === 0 ? (
            <div className="comparison-empty"><Tags size={20} /><p><strong>A comparação começa com duas lojas</strong><span>Cadastre o mesmo item e a mesma unidade em fornecedores diferentes para descobrir o menor preço.</span></p></div>
          ) : (
            <div className="supplier-comparison-grid">
              {supplierComparisons.map((comparison) => (
                <article className="supplier-comparison-card" key={`${comparison.item}-${comparison.unit}`}>
                  <div className="comparison-card-heading"><div><span>{comparison.item}</span><small>Preço por {comparison.unit}</small></div><strong>Economia de {formatMoney(comparison.potentialSavings)}</strong></div>
                  <div className="store-price-list">
                    {comparison.stores.map((store, index) => (
                      <div className={index === 0 ? "cheapest-store" : ""} key={store.name}>
                        <span><strong>{store.name}</strong><small>{store.quantity.toLocaleString("pt-BR")} {comparison.unit} comprados</small></span>
                        <span><strong>{formatMoney(Math.round(store.unitPrice))}</strong><small>por {comparison.unit}</small></span>
                        {index === 0 && <em>Menor preço</em>}
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
          <p className="comparison-disclaimer">Economia estimada usando o menor preço unitário já registrado para todas as compras do mesmo item e unidade. Preços podem variar com data, marca e condições comerciais.</p>
        </section>

        <section className="panel expense-panel expense-page-panel">
          <div className="panel-heading"><div><p className="eyebrow">Histórico privado</p><h2>Gastos lançados</h2></div><span className="count-badge">{sortedExpenses.length} lançamentos</span></div>
          <div className="payment-list">
            {sortedExpenses.length === 0 && <p className="empty-list">Nenhum gasto registrado nesta obra.</p>}
            {sortedExpenses.map((expense) => (
              <button className={`payment-row expense-row ${expense.status === "cancelled" ? "cancelled" : ""}`} key={expense.id} onClick={() => setSelectedExpense(expense)}>
                <span className="payment-icon"><ShoppingCart size={18} /></span>
                <span className="payment-main"><strong>{expense.description}</strong><small>{formatDate(expense.spent_on)} · {expense.quantity} {expense.unit} · {expense.item_name} · {expense.supplier}</small></span>
                <span className="expense-amount">{expense.status === "cancelled" ? "Cancelado" : formatMoney(expense.amount_cents)}</span>
                <ChevronRight size={18} />
              </button>
            ))}
          </div>
        </section>

        {!isSupabaseConfigured && <div className="demo-notice"><span>Demonstração</span>Os gastos exibidos são dados de exemplo.</div>}
      </main>

      {expenseOpen && <ExpenseModal expense={editingExpense} onClose={() => { setExpenseOpen(false); setEditingExpense(null); }} onSave={saveExpense} />}
      {selectedExpense && <ExpenseDetailModal expense={selectedExpense} onClose={() => setSelectedExpense(null)} onCancel={cancelExpense} onEdit={(expense) => { setSelectedExpense(null); setEditingExpense(expense); setExpenseOpen(true); }} onDelete={deleteExpense} />}
      {toast && <div className="toast"><Check size={18} />{toast}</div>}
    </div>
  );
}
