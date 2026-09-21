# Obra em Dia

Aplicação em Next.js para registrar pagamentos de uma empreitada, acompanhar o
saldo restante e compartilhar comprovantes com o pedreiro por um link privado,
sem exigir login dele.

## Funcionalidades

- painel administrativo com autenticação pelo Supabase;
- cadastro da empreitada e lançamento de pagamentos;
- controle privado de gastos da obra, visível somente para o administrador;
- comparação de preço unitário entre fornecedores e estimativa de economia por material;
- controle de cartões, compras parceladas, limite disponível e pagamento de fatura;
- organização de assinaturas, investimentos e gastos essenciais recorrentes;
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
NEXT_PUBLIC_PURCHASE_API_URL=
```

Na página `/financeiro`, a ação “Enviar via API” faz uma requisição `POST` para
`/api/compras` por padrão, com o payload JSON `banco`, `valor`, `cartao`, `data`
e `hora`. Para encaminhar a requisição para outro serviço, defina
`NEXT_PUBLIC_PURCHASE_API_URL`.

## Validação

```bash
npm test
npm run build
```

O schema do banco está versionado em `supabase/migrations/`. A migração
`20260803120000_create_expenses.sql` adiciona o controle de gastos com RLS
restrita ao proprietário da obra.
