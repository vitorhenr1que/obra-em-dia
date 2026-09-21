import { NextResponse } from "next/server";

type PurchasePayload = {
  banco: unknown;
  valor: unknown;
  cartao: unknown;
  data: unknown;
  hora: unknown;
};

function unwrapPayload(value: unknown): PurchasePayload {
  if (typeof value === "object" && value !== null && "data" in value) {
    const wrapped = (value as { data?: unknown }).data;
    if (typeof wrapped === "object" && wrapped !== null) return wrapped as PurchasePayload;
  }
  return value as PurchasePayload;
}

function normalizeDate(value: unknown) {
  if (typeof value !== "string") return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (date.getFullYear() !== Number(year) || date.getMonth() !== Number(month) - 1 || date.getDate() !== Number(day)) return null;
  return `${year}-${month}-${day}`;
}

function normalizeTime(value: unknown) {
  if (typeof value !== "string") return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${match[2]}`;
}

export async function POST(request: Request) {
  let body: PurchasePayload;

  try {
    body = unwrapPayload(await request.json());
  } catch {
    return NextResponse.json({ error: "O corpo da requisição precisa ser um JSON válido." }, { status: 400 });
  }

  const banco = typeof body.banco === "string" ? body.banco.trim() : "";
  const cartao = typeof body.cartao === "string" ? body.cartao.trim() : "";
  const valor = typeof body.valor === "number" ? body.valor : Number(body.valor);
  const data = normalizeDate(body.data);
  const hora = normalizeTime(body.hora);

  if (!banco || !cartao || !Number.isFinite(valor) || valor <= 0 || !data || !hora) {
    return NextResponse.json({
      error: "Payload inválido. Envie banco, valor, cartao, data (DD/MM/AAAA ou AAAA-MM-DD) e hora curta (HH:mm).",
    }, { status: 422 });
  }

  const purchase = { banco, valor, cartao, data, hora };

  return NextResponse.json({
    ok: true,
    message: "Compra recebida com sucesso.",
    compra: purchase,
  }, { status: 201 });
}
