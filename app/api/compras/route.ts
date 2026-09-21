import { NextResponse } from "next/server";

type PurchasePayload = {
  banco: unknown;
  valor: unknown;
  cartao: unknown;
  data: unknown;
  hora: unknown;
};

function isDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isTime(value: unknown): value is string {
  return typeof value === "string" && /^\d{2}:\d{2}$/.test(value);
}

export async function POST(request: Request) {
  let body: PurchasePayload;

  try {
    body = await request.json() as PurchasePayload;
  } catch {
    return NextResponse.json({ error: "O corpo da requisição precisa ser um JSON válido." }, { status: 400 });
  }

  const banco = typeof body.banco === "string" ? body.banco.trim() : "";
  const cartao = typeof body.cartao === "string" ? body.cartao.trim() : "";
  const valor = typeof body.valor === "number" ? body.valor : Number(body.valor);

  if (!banco || !cartao || !Number.isFinite(valor) || valor <= 0 || !isDate(body.data) || !isTime(body.hora)) {
    return NextResponse.json({
      error: "Payload inválido. Envie banco, valor, cartao, data (AAAA-MM-DD) e hora (HH:mm).",
    }, { status: 422 });
  }

  const purchase = { banco, valor, cartao, data: body.data, hora: body.hora };

  return NextResponse.json({
    ok: true,
    message: "Compra recebida com sucesso.",
    compra: purchase,
  }, { status: 201 });
}
