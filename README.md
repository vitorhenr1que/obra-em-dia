# Obra em Dia

Aplicação em Next.js para registrar pagamentos de uma empreitada, acompanhar o
saldo restante e compartilhar comprovantes com o pedreiro por um link privado,
sem exigir login dele.

## Funcionalidades

- painel administrativo com autenticação pelo Supabase;
- cadastro da empreitada e lançamento de pagamentos;
- cálculo automático de total pago e saldo restante;
- comprovantes imprimíveis ou salváveis em PDF;
- portal mobile do pedreiro acessível por link secreto;
- políticas RLS para separar os dados de cada administrador.

## Desenvolvimento

Requer Node.js 22.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Variáveis necessárias:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

## Validação

```bash
npm test
npm run build
```

O schema do banco está em
`supabase/migrations/20260729133815_create_payment_tracker_schema.sql`.
