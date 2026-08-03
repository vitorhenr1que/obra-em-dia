"use client";

import {
  ArrowUpRight,
  Banknote,
  Check,
  ChevronRight,
  CircleDollarSign,
  Copy,
  Hammer,
  Link2,
  LogOut,
  Menu,
  Plus,
  ReceiptText,
  Share2,
  ShieldCheck,
  ShoppingCart,
  WalletCards,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { demoProject } from "@/lib/demo-data";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import type { Payment, Project } from "@/lib/types";

function formatMoney(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
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

function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const { data, error } = creatingAccount
      ? await getSupabase().auth.signUp({ email, password })
      : await getSupabase().auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setMessage(
        creatingAccount
          ? "Não foi possível criar seu acesso. Use uma senha com pelo menos 6 caracteres."
          : "Não foi possível entrar. Confira seus dados.",
      );
      return;
    }
    if (creatingAccount && !data.session) {
      setMessage("Acesso criado. Confira seu e-mail para confirmar o cadastro.");
    }
  }

  return (
    <main className="center-shell">
      <section className="form-card">
        <div className="brand-mark"><Hammer size={22} /></div>
        <p className="eyebrow">{creatingAccount ? "Criar acesso administrativo" : "Painel administrativo"}</p>
        <h1>{creatingAccount ? "Comece sua obra" : "Obra em Dia"}</h1>
        <p className="form-card-copy">
          {creatingAccount
            ? "Cadastre seu e-mail para administrar pagamentos e comprovantes."
            : "Entre para registrar pagamentos e acompanhar sua empreitada."}
        </p>
        <form onSubmit={handleLogin} className="stack-form">
          <label>
            Seu e-mail
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="voce@exemplo.com"
              required
            />
          </label>
          <label>
            Sua senha
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              required
            />
          </label>
          {message && <p className="form-error">{message}</p>}
          <button className="button primary wide" disabled={loading}>
            {loading
              ? creatingAccount ? "Criando acesso..." : "Entrando..."
              : creatingAccount ? "Criar meu acesso" : "Entrar no painel"}
          </button>
          <button
            type="button"
            className="switch-auth"
            onClick={() => {
              setCreatingAccount(!creatingAccount);
              setMessage("");
            }}
          >
            {creatingAccount ? "Já tenho acesso" : "É seu primeiro acesso? Criar conta"}
          </button>
        </form>
      </section>
    </main>
  );
}

function EmptyProject({ onCreated }: { onCreated: (project: Project) => void }) {
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    const { data: userData } = await getSupabase().auth.getUser();
    const { data, error } = await getSupabase()
      .from("projects")
      .insert({
        owner_id: userData.user?.id,
        title: String(form.get("title")),
        contractor_name: String(form.get("contractor")),
        worker_name: String(form.get("worker")),
        total_amount_cents: centsFromInput(String(form.get("total"))),
        started_on: String(form.get("startedOn")),
        address: String(form.get("address") || ""),
      })
      .select()
      .single();
    setSaving(false);
    if (!error && data) onCreated({ ...data, payments: [], expenses: [] } as Project);
  }

  return (
    <main className="center-shell">
      <section className="form-card large">
        <div className="brand-mark"><Hammer size={22} /></div>
        <p className="eyebrow">Primeiro passo</p>
        <h1>Cadastre sua empreitada</h1>
        <p className="form-card-copy">Leva menos de um minuto. Você poderá ajustar os dados depois.</p>
        <form onSubmit={handleSubmit} className="stack-form">
          <label>Nome da obra<input name="title" placeholder="Ex.: Reforma da casa" required /></label>
          <div className="form-grid">
            <label>Seu nome<input name="contractor" placeholder="Contratante" required /></label>
            <label>Nome do pedreiro<input name="worker" placeholder="Pedreiro" required /></label>
          </div>
          <div className="form-grid">
            <label>Valor combinado<input name="total" inputMode="decimal" placeholder="25.000,00" required /></label>
            <label>Data de início<input name="startedOn" type="date" required /></label>
          </div>
          <label>Local da obra <span>(opcional)</span><input name="address" placeholder="Rua, bairro ou cidade" /></label>
          <button className="button primary wide" disabled={saving}>{saving ? "Criando..." : "Criar empreitada"}</button>
        </form>
      </section>
    </main>
  );
}

function ReceiptModal({ project, payment, onClose }: { project: Project; payment: Payment; onClose: () => void }) {
  const paidUntilReceipt = project.payments
    .filter((item) => item.status === "confirmed" && item.paid_on <= payment.paid_on)
    .reduce((total, item) => total + item.amount_cents, 0);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="receipt-modal" role="dialog" aria-modal="true" aria-label="Comprovante de pagamento" onMouseDown={(event) => event.stopPropagation()}>
        <button className="icon-button close-button no-print" onClick={onClose} aria-label="Fechar"><X size={20} /></button>
        <div className="receipt-brand">
          <div className="brand-mark small"><Hammer size={18} /></div>
          <div><strong>Obra em Dia</strong><span>Comprovante de pagamento</span></div>
        </div>
        <div className="receipt-status"><Check size={18} /> Pagamento registrado</div>
        <h2>{formatMoney(payment.amount_cents)}</h2>
        <p className="receipt-date">Pago em {formatDate(payment.paid_on)}</p>
        <dl className="receipt-details">
          <div><dt>Empreitada</dt><dd>{project.title}</dd></div>
          <div><dt>Pedreiro</dt><dd>{project.worker_name}</dd></div>
          <div><dt>Contratante</dt><dd>{project.contractor_name}</dd></div>
          <div><dt>Forma de pagamento</dt><dd>{payment.method}</dd></div>
          <div><dt>Total pago até aqui</dt><dd>{formatMoney(paidUntilReceipt)}</dd></div>
          <div><dt>Saldo após o pagamento</dt><dd>{formatMoney(project.total_amount_cents - paidUntilReceipt)}</dd></div>
        </dl>
        {payment.note && <p className="receipt-note">{payment.note}</p>}
        <div className="receipt-code"><span>Número do comprovante</span><strong>{payment.receipt_code}</strong></div>
        <p className="receipt-footnote">Este comprovante registra um pagamento da empreitada descrita acima.</p>
        <button className="button dark wide no-print" onClick={() => window.print()}>
          <ReceiptText size={18} /> Imprimir ou salvar em PDF
        </button>
      </section>
    </div>
  );
}

function PaymentModal({ balance, onClose, onSave }: {
  balance: number;
  onClose: () => void;
  onSave: (input: Pick<Payment, "amount_cents" | "paid_on" | "method" | "note">) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amount = centsFromInput(String(form.get("amount")));
    if (!amount || amount <= 0 || amount > balance) {
      setError("Informe um valor válido, menor ou igual ao saldo.");
      return;
    }
    setSaving(true);
    await onSave({
      amount_cents: amount,
      paid_on: String(form.get("paidOn")),
      method: String(form.get("method")) as Payment["method"],
      note: String(form.get("note") || ""),
    });
    setSaving(false);
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="payment-modal" role="dialog" aria-modal="true" aria-label="Registrar pagamento" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-heading">
          <div><p className="eyebrow">Novo lançamento</p><h2>Registrar pagamento</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={20} /></button>
        </div>
        <p className="available-balance">Saldo atual: <strong>{formatMoney(balance)}</strong></p>
        <form onSubmit={handleSubmit} className="stack-form">
          <label>
            Valor pago
            <div className="money-input"><span>R$</span><input name="amount" inputMode="decimal" placeholder="0,00" autoFocus required /></div>
          </label>
          <div className="form-grid">
            <label>Data do pagamento<input name="paidOn" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></label>
            <label>Forma de pagamento<select name="method" defaultValue="PIX"><option>PIX</option><option>Dinheiro</option><option>Transferência</option><option>Outro</option></select></label>
          </div>
          <label>Observação <span>(opcional)</span><textarea name="note" rows={3} placeholder="Ex.: Segunda parcela da empreitada" /></label>
          {error && <p className="form-error">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="button ghost" onClick={onClose}>Cancelar</button>
            <button className="button primary" disabled={saving}>{saving ? "Registrando..." : "Confirmar pagamento"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default function Home() {
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [authenticated, setAuthenticated] = useState(!isSupabaseConfigured);
  const [project, setProject] = useState<Project | null>(isSupabaseConfigured ? null : demoProject);
  const [loadingProject, setLoadingProject] = useState(isSupabaseConfigured);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [toast, setToast] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

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
      .select("*, payments(*)")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setProject(data as Project | null);
        setLoadingProject(false);
      });
  }, [authenticated]);

  const paid = useMemo(
    () => project?.payments.filter((payment) => payment.status === "confirmed").reduce((total, payment) => total + payment.amount_cents, 0) ?? 0,
    [project],
  );
  const balance = Math.max((project?.total_amount_cents ?? 0) - paid, 0);
  const progress = project ? Math.min(Math.round((paid / project.total_amount_cents) * 100), 100) : 0;
  const sortedPayments = useMemo(() => [...(project?.payments ?? [])].sort((a, b) => b.paid_on.localeCompare(a.paid_on)), [project]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  }

  function publicPath() {
    if (!project) return "";
    return `/acompanhar/${isSupabaseConfigured ? project.public_token : "demonstracao"}`;
  }

  function publicUrl() {
    return `${window.location.origin}${publicPath()}`;
  }

  async function copyPublicLink() {
    await navigator.clipboard.writeText(publicUrl());
    showToast("Link copiado. Agora é só enviar ao pedreiro.");
  }

  function shareOnWhatsApp() {
    const text = encodeURIComponent(`Olá, ${project?.worker_name}! Acompanhe os pagamentos e o saldo da empreitada por este link: ${publicUrl()}`);
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  }

  async function savePayment(input: Pick<Payment, "amount_cents" | "paid_on" | "method" | "note">) {
    if (!project) return;
    let payment: Payment;
    if (isSupabaseConfigured) {
      const { data, error } = await getSupabase().from("payments").insert({ ...input, project_id: project.id }).select().single();
      if (error || !data) {
        showToast("Não foi possível registrar o pagamento.");
        return;
      }
      payment = data as Payment;
    } else {
      payment = {
        ...input,
        id: crypto.randomUUID(),
        project_id: project.id,
        receipt_code: `REC-${String(project.payments.length + 1).padStart(4, "0")}`,
        status: "confirmed",
        created_at: new Date().toISOString(),
      };
    }
    setProject({ ...project, payments: [...project.payments, payment] });
    setPaymentOpen(false);
    setSelectedPayment(payment);
    showToast("Pagamento registrado e saldo atualizado.");
  }

  if (!authReady) return <main className="loading-screen">Preparando seu painel...</main>;
  if (!authenticated) return <LoginScreen />;
  if (loadingProject) return <main className="loading-screen">Carregando sua empreitada...</main>;
  if (!project) return <EmptyProject onCreated={setProject} />;

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <div className="brand-mark"><Hammer size={22} /></div>
          <div><strong>Obra em Dia</strong><span>Gestão de pagamentos</span></div>
        </div>
        <nav>
          <a className="active" href="#resumo"><CircleDollarSign size={19} /> Visão geral</a>
          <a href="#pagamentos"><ReceiptText size={19} /> Pagamentos</a>
          <a href="/gastos"><ShoppingCart size={19} /> Gastos da obra</a>
          <a href="#link"><Link2 size={19} /> Link do pedreiro</a>
        </nav>
        <div className="sidebar-security">
          <ShieldCheck size={19} />
          <div><strong>Dados protegidos</strong><span>Somente você pode editar.</span></div>
        </div>
        {isSupabaseConfigured && (
          <button className="sidebar-logout" onClick={() => getSupabase().auth.signOut()}><LogOut size={18} /> Sair</button>
        )}
      </aside>

      <main className="dashboard">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menu">{menuOpen ? <X size={22} /> : <Menu size={22} />}</button>
          <div><p className="eyebrow">Empreitada atual</p><h1>{project.title}</h1></div>
          <div className="top-actions">
            <a className="button ghost" href="/gastos"><ShoppingCart size={17} /> Ver gastos</a>
            <button className="button primary top-action" onClick={() => setPaymentOpen(true)}><Plus size={18} /> Registrar pagamento</button>
          </div>
        </header>

        <section id="resumo" className="summary-grid">
          <article className="summary-card total"><span className="card-icon"><WalletCards size={21} /></span><div><p>Valor combinado</p><strong>{formatMoney(project.total_amount_cents)}</strong></div></article>
          <article className="summary-card paid"><span className="card-icon"><Check size={21} /></span><div><p>Já foi pago</p><strong>{formatMoney(paid)}</strong></div></article>
          <article className="summary-card balance"><span className="card-icon"><Banknote size={21} /></span><div><p>Falta pagar</p><strong>{formatMoney(balance)}</strong></div></article>
        </section>

        <section className="progress-card">
          <div className="progress-heading"><div><span>Andamento dos pagamentos</span><strong>{progress}% concluído</strong></div><p>{formatMoney(paid)} de {formatMoney(project.total_amount_cents)}</p></div>
          <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
          <div className="project-meta">
            <span><strong>Pedreiro</strong>{project.worker_name}</span>
            <span><strong>Início</strong>{formatDate(project.started_on)}</span>
            <span><strong>Local</strong>{project.address || "Não informado"}</span>
          </div>
        </section>

        <div className="content-grid">
          <section id="pagamentos" className="panel">
            <div className="panel-heading"><div><p className="eyebrow">Histórico</p><h2>Pagamentos</h2></div><span className="count-badge">{sortedPayments.length} lançamentos</span></div>
            <div className="payment-list">
              {sortedPayments.map((payment) => (
                <button className={`payment-row ${payment.status === "cancelled" ? "cancelled" : ""}`} key={payment.id} onClick={() => setSelectedPayment(payment)}>
                  <span className="payment-icon"><ReceiptText size={19} /></span>
                  <span className="payment-main"><strong>{formatMoney(payment.amount_cents)}</strong><small>{formatDate(payment.paid_on)} · {payment.method}</small></span>
                  <span className="receipt-number">{payment.receipt_code}</span>
                  <ChevronRight size={18} />
                </button>
              ))}
            </div>
          </section>

          <aside id="link" className="worker-card">
            <div className="worker-card-art"><span className="mini-phone"><span /><span /><span /></span></div>
            <p className="eyebrow light">Acesso do pedreiro</p>
            <h2>Um link. Sem senha.</h2>
            <p>Envie uma única vez. O saldo e os comprovantes sempre estarão atualizados.</p>
            <button className="button white wide" onClick={shareOnWhatsApp}><Share2 size={18} /> Enviar pelo WhatsApp</button>
            <button className="text-button" onClick={copyPublicLink}><Copy size={16} /> Copiar link</button>
            <a className="preview-link" href={publicPath()} target="_blank">Ver como o pedreiro <ArrowUpRight size={15} /></a>
          </aside>
        </div>

        {!isSupabaseConfigured && <div className="demo-notice"><span>Demonstração</span>Estes dados são de exemplo. A conexão Supabase está pronta para receber as credenciais do novo projeto.</div>}
      </main>

      {paymentOpen && <PaymentModal balance={balance} onClose={() => setPaymentOpen(false)} onSave={savePayment} />}
      {selectedPayment && <ReceiptModal project={project} payment={selectedPayment} onClose={() => setSelectedPayment(null)} />}
      {toast && <div className="toast"><Check size={18} />{toast}</div>}
    </div>
  );
}
