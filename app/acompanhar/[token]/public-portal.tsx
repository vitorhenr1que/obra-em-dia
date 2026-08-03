"use client";

import {
  Check,
  ChevronRight,
  Hammer,
  ReceiptText,
  Share2,
  ShieldCheck,
  WalletCards,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { demoProject } from "@/lib/demo-data";
import { getPublicSupabase, isSupabaseConfigured } from "@/lib/supabase";
import type { Payment, Project } from "@/lib/types";

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function date(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

function PublicReceipt({ project, payment, onClose }: { project: Project; payment: Payment; onClose: () => void }) {
  const total = project.payments
    .filter((item) => item.status === "confirmed" && item.paid_on <= payment.paid_on)
    .reduce((sum, item) => sum + item.amount_cents, 0);

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="receipt-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <button className="icon-button close-button no-print" onClick={onClose} aria-label="Fechar"><X size={20} /></button>
        <div className="receipt-brand">
          <div className="brand-mark small"><Hammer size={18} /></div>
          <div><strong>Obra em Dia</strong><span>Comprovante de pagamento</span></div>
        </div>
        <div className="receipt-status"><Check size={18} /> Pagamento confirmado</div>
        <h2>{money(payment.amount_cents)}</h2>
        <p className="receipt-date">Pago em {date(payment.paid_on)}</p>
        <dl className="receipt-details">
          <div><dt>Empreitada</dt><dd>{project.title}</dd></div>
          <div><dt>Pedreiro</dt><dd>{project.worker_name}</dd></div>
          <div><dt>Contratante</dt><dd>{project.contractor_name}</dd></div>
          <div><dt>Forma de pagamento</dt><dd>{payment.method}</dd></div>
          <div><dt>Total pago até aqui</dt><dd>{money(total)}</dd></div>
          <div><dt>Saldo após o pagamento</dt><dd>{money(project.total_amount_cents - total)}</dd></div>
        </dl>
        {payment.note && <p className="receipt-note">{payment.note}</p>}
        <div className="receipt-code"><span>Número do comprovante</span><strong>{payment.receipt_code}</strong></div>
        <p className="receipt-footnote">Este comprovante registra um pagamento da empreitada descrita acima.</p>
        <button className="button dark wide no-print" onClick={() => window.print()}>
          <ReceiptText size={18} /> Baixar ou imprimir comprovante
        </button>
      </section>
    </div>
  );
}

export default function PublicPortal({ token }: { token: string }) {
  const [project, setProject] = useState<Project | null>(
    !isSupabaseConfigured || token === "demonstracao" ? demoProject : null,
  );
  const [loading, setLoading] = useState(isSupabaseConfigured && token !== "demonstracao");
  const [notFound, setNotFound] = useState(false);
  const [selected, setSelected] = useState<Payment | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured || token === "demonstracao") return;
    getPublicSupabase(token)
      .from("projects")
      .select(`
        id,
        title,
        contractor_name,
        worker_name,
        total_amount_cents,
        started_on,
        address,
        status,
        public_link_active,
        created_at,
        payments (
          id,
          project_id,
          receipt_code,
          amount_cents,
          paid_on,
          method,
          note,
          status,
          created_at
        )
      `)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setProject({ ...data, owner_id: "", public_token: token } as Project);
        setLoading(false);
      });
  }, [token]);

  const validPayments = useMemo(
    () => [...(project?.payments ?? [])].filter((payment) => payment.status === "confirmed").sort((a, b) => b.paid_on.localeCompare(a.paid_on)),
    [project],
  );
  const paid = validPayments.reduce((sum, payment) => sum + payment.amount_cents, 0);
  const balance = Math.max((project?.total_amount_cents ?? 0) - paid, 0);
  const progress = project ? Math.min(Math.round((paid / project.total_amount_cents) * 100), 100) : 0;

  async function share() {
    if (navigator.share) {
      await navigator.share({ title: project?.title, text: "Acompanhe os pagamentos desta empreitada.", url: window.location.href });
      return;
    }
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  }

  if (loading) return <main className="public-state">Carregando os pagamentos...</main>;
  if (notFound || !project) {
    return (
      <main className="public-state">
        <div className="brand-mark"><Hammer size={22} /></div>
        <h1>Link indisponível</h1>
        <p>Peça ao contratante um novo link para consultar a empreitada.</p>
      </main>
    );
  }

  return (
    <main className="public-shell">
      <header className="public-header">
        <div className="public-brand"><div className="brand-mark small"><Hammer size={18} /></div><strong>Obra em Dia</strong></div>
        <button className="public-share" onClick={share}><Share2 size={18} /> <span>Compartilhar</span></button>
      </header>

      <section className="public-hero">
        <div className="public-hero-inner">
          <p className="eyebrow light">Acompanhamento da empreitada</p>
          <h1>Olá, {project.worker_name.split(" ")[0]}.</h1>
          <p>Aqui está o resumo atualizado dos seus pagamentos.</p>
          <div className="public-project-name">
            <Hammer size={16} />
            <span><small>Obra</small><strong>{project.title}</strong></span>
          </div>
        </div>
      </section>

      <div className="public-content">
        <section className="public-balance-card">
          <div className="balance-label"><WalletCards size={18} /><span>Falta receber</span></div>
          <strong>{money(balance)}</strong>
          <div className="public-progress"><div><span style={{ width: `${progress}%` }} /></div><small>{progress}% pago</small></div>
          <div className="public-totals">
            <span><small>Valor combinado</small><strong>{money(project.total_amount_cents)}</strong></span>
            <span><small>Já recebido</small><strong>{money(paid)}</strong></span>
          </div>
        </section>

        <section className="public-payments">
          <div className="public-section-heading"><div><p className="eyebrow">Seus recebimentos</p><h2>Pagamentos</h2></div><span>{validPayments.length}</span></div>
          <div className="public-payment-list">
            {validPayments.map((payment, index) => (
              <button key={payment.id} onClick={() => setSelected(payment)}>
                <span className="public-payment-status"><Check size={17} /></span>
                <span className="public-payment-copy"><strong>{money(payment.amount_cents)}</strong><small>{index === 0 ? "Pagamento mais recente" : date(payment.paid_on)}</small></span>
                <span className="public-payment-date">{date(payment.paid_on)}</span>
                <ChevronRight size={18} />
              </button>
            ))}
          </div>
        </section>

        <div className="public-safe">
          <ShieldCheck size={18} />
          <p><strong>Consulta segura</strong><span>Este link permite somente visualizar. Nenhuma informação pode ser alterada.</span></p>
        </div>
        <p className="public-footer">Atualizado automaticamente · Você não precisa criar uma conta</p>
      </div>

      {selected && <PublicReceipt project={project} payment={selected} onClose={() => setSelected(null)} />}
      {copied && <div className="toast"><Check size={18} />Link copiado</div>}
    </main>
  );
}
