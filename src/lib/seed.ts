/* ============================================================
 * Fluxo — Dados de demonstração (primeira execução)
 * ============================================================ */
import type { DB, Product, Customer, Supplier, Sale, SaleItem, StockMove, CashMove, Receivable } from "./types";
import { hashPass, mulberry32, todayISO, uid } from "./utils";
import { addDays, format } from "date-fns";

const dISO = (d: Date) => format(d, "yyyy-MM-dd");
const back = (n: number) => dISO(addDays(new Date(), -n));

export async function buildSeed(): Promise<DB> {
  const rnd = mulberry32(20240117);
  const today = todayISO();

  const demoUser = {
    id: "u-demo", name: "Alex Demo", email: "demo@fluxo.app",
    passHash: await hashPass("demo123"), role: "admin" as const, createdAt: new Date().toISOString(),
  };
  const sysUser = {
    id: "sys-admin", name: "Administrador do Sistema", email: "admin@fluxo.app",
    passHash: await hashPass("admin123"), role: "admin" as const, super: true, createdAt: new Date().toISOString(),
  };

  const suppliers: Supplier[] = [
    { id: "f1", name: "Fornecedor Alpha", doc: "12.345.678/0001-90", phone: "(11) 98888-1001", email: "contato@alpha.com.br", address: "Av. Industrial, 500 — São Paulo/SP", notes: "Entrega às terças", createdAt: new Date().toISOString() },
    { id: "f2", name: "Distribuidora Beta", doc: "98.765.432/0001-10", phone: "(11) 97777-2002", email: "vendas@beta.com.br", address: "Rua das Palmas, 88 — Guarulhos/SP", notes: "", createdAt: new Date().toISOString() },
    { id: "f3", name: "Confecções Gamma", doc: "45.678.912/0001-33", phone: "(21) 96666-3003", email: "pedidos@gamma.com.br", address: "Rua Têxtil, 210 — Rio de Janeiro/RJ", notes: "Pedido mínimo R$ 300", createdAt: new Date().toISOString() },
  ];

  const P = (n: string, sku: string, cat: string, cost: number, price: number, stock: number, min: number, sup: string, desc: string): Product => ({
    id: uid(), name: n, sku, code: sku.replace(/\D/g, ""), barcode: `789${String(Math.floor(rnd() * 1e10)).padStart(10, "0")}`,
    category: cat, description: desc, cost, price, stock, minStock: min, unit: "un",
    supplierId: sup, active: true, inCatalog: stock > 0 || rnd() > 0.3, createdAt: new Date().toISOString(),
  });

  const products: Product[] = [
    P("Camiseta Básica", "CAM001", "Vestuário", 22, 49.9, 34, 10, "f3", "Camiseta 100% algodão, cores sortidas."),
    P("Tênis Casual", "TEN002", "Calçados", 72, 129.9, 12, 5, "f1", "Tênis confortável para o dia a dia."),
    P("Relógio Classic", "REL003", "Acessórios", 45, 89.9, 8, 4, "f2", "Relógio analógico com pulseira em couro."),
    P("Boné Street", "BON004", "Acessórios", 14, 39.9, 25, 8, "f3", "Boné aba curva, bordado frontal."),
    P("Mochila Urban", "MOc005", "Acessórios", 68, 149.9, 6, 4, "f1", "Mochila 25L com compartimento para notebook."),
    P("Kit 3 Meias", "MEI006", "Vestuário", 9, 24.9, 3, 10, "f3", "Kit com 3 pares de meias de algodão."),
    P("Calça Jeans", "CAL007", "Vestuário", 58, 119.9, 15, 6, "f3", "Jeans reto, lavagem escura."),
    P("Óculos de Sol", "OCU008", "Acessórios", 32, 79.9, 9, 4, "f2", "Proteção UV400, armação leve."),
    P("Garrafa Térmica 1L", "GAR009", "Utilidades", 28, 59.9, 18, 6, "f2", "Mantém a temperatura por até 12h."),
    P("Cinto de Couro", "CIN010", "Acessórios", 20, 44.9, 14, 5, "f3", "Cinto em couro legítimo com fivela metálica."),
  ];

  const customers: Customer[] = [
    { id: "c1", name: "João Silva", doc: "123.456.789-00", phone: "(11) 99911-2233", email: "joao.silva@email.com", address: "Rua A, 120 — Centro", notes: "Prefere PIX", createdAt: new Date().toISOString() },
    { id: "c2", name: "Maria Oliveira", doc: "987.654.321-00", phone: "(11) 98822-3344", email: "maria.ol@email.com", address: "Av. Brasil, 900", notes: "", createdAt: new Date().toISOString() },
    { id: "c3", name: "Carlos Santos", doc: "456.789.123-00", phone: "(21) 97733-4455", email: "carlos.s@email.com", address: "Rua XV, 45", notes: "Cliente fiado — pontual", createdAt: new Date().toISOString() },
    { id: "c4", name: "Ana Souza", doc: "321.654.987-00", phone: "(31) 96644-5566", email: "ana.souza@email.com", address: "Rua das Flores, 12", notes: "", createdAt: new Date().toISOString() },
    { id: "c5", name: "Pedro Lima", doc: "654.321.987-00", phone: "(11) 95555-6677", email: "pedro.l@email.com", address: "Av. Paulista, 1500", notes: "", createdAt: new Date().toISOString() },
    { id: "c6", name: "Fernanda Costa", doc: "789.123.456-00", phone: "(47) 94466-7788", email: "fer.costa@email.com", address: "Rua do Comércio, 77", notes: "Compra todo mês", createdAt: new Date().toISOString() },
  ];

  const methods = ["Dinheiro", "PIX", "PIX", "Cartão de débito", "Cartão de crédito", "PIX", "Dinheiro"];
  const sales: Sale[] = [];
  const moves: StockMove[] = [];
  const receivables: Receivable[] = [];
  const cashMoves: CashMove[] = [];
  const sid = "s-open";
  let seqV = 0;

  const makeSale = (dayOffset: number, forceFiado = false): Sale => {
    const nItems = 1 + Math.floor(rnd() * 3);
    const items: SaleItem[] = [];
    for (let i = 0; i < nItems; i++) {
      const p = products[Math.floor(rnd() * products.length)];
      const qty = 1 + Math.floor(rnd() * 2);
      if (items.some((it) => it.productId === p.id)) continue;
      items.push({ productId: p.id, name: p.name, qty, price: p.price, cost: p.cost });
    }
    const subtotal = items.reduce((s, it) => s + it.qty * it.price, 0);
    const discount = rnd() < 0.25 ? Math.round(subtotal * 0.05 * 100) / 100 : 0;
    const total = Math.round((subtotal - discount) * 100) / 100;
    const method = forceFiado ? "Fiado" : methods[Math.floor(rnd() * methods.length)];
    seqV++;
    const sale: Sale = {
      id: uid(), number: `V-${String(seqV).padStart(4, "0")}`,
      customerId: customers[Math.floor(rnd() * customers.length)].id,
      customerName: "", items, subtotal, discount, total, method,
      installments: method === "Cartão de crédito" && rnd() < 0.4 ? 2 + Math.floor(rnd() * 2) : 1,
      status: method === "Fiado" ? "fiado" : "concluida",
      date: back(dayOffset), createdAt: new Date().toISOString(),
    };
    sale.customerName = customers.find((c) => c.id === sale.customerId)!.name;
    for (const it of items) {
      moves.push({ id: uid(), productId: it.productId, type: "venda", qty: -it.qty, date: sale.date, note: `Venda ${sale.number}`, ref: sale.id });
    }
    if (method === "Fiado") {
      receivables.push({
        id: uid(), customerId: sale.customerId, customerName: sale.customerName,
        description: `Venda ${sale.number} (fiado)`, amount: total, paid: 0,
        dueDate: dISO(addDays(new Date(sale.date + "T12:00:00"), 15)),
        origin: "venda", refId: sale.id, status: "pendente", createdAt: new Date().toISOString(),
      });
    } else if (dayOffset === 0) {
      cashMoves.push({
        id: uid(), sessionId: sid, dir: "in", description: `Venda ${sale.number} — ${sale.customerName}`,
        amount: total, method, date: today, refType: "venda", refId: sale.id, createdAt: new Date().toISOString(),
      });
    }
    return sale;
  };

  // Vendas: 6 hoje, distribuídas nos últimos 30 dias
  for (let i = 0; i < 6; i++) sales.push(makeSale(0));
  for (let i = 1; i <= 30; i++) {
    const count = rnd() < 0.75 ? 1 + Math.floor(rnd() * 2) : 0;
    for (let j = 0; j < count; j++) sales.push(makeSale(i));
  }
  // Fiados antigos (um vencido, um parcial)
  const fiado1 = makeSale(25, true); sales.push(fiado1);
  const fiado2 = makeSale(40, true); sales.push(fiado2);
  receivables[receivables.length - 2].dueDate = back(5); // vencido
  const r2 = receivables[receivables.length - 1];
  r2.paid = Math.round(r2.amount * 0.4 * 100) / 100; // parcial
  sales.sort((a, b) => b.date.localeCompare(a.date));

  // Entradas iniciais de estoque
  for (const p of products) {
    moves.push({ id: uid(), productId: p.id, type: "entrada", qty: p.stock + 10, date: back(35), note: "Estoque inicial", ref: "" });
  }

  const expenses = [
    { id: uid(), description: "Aluguel do ponto", category: "Aluguel", amount: 1800, date: back(8), dueDate: back(8), method: "Transferência", status: "pago" as const, notes: "", createdAt: new Date().toISOString() },
    { id: uid(), description: "Conta de energia", category: "Energia", amount: 342.5, date: back(3), dueDate: dISO(addDays(new Date(), 3)), method: "PIX", status: "pendente" as const, notes: "", createdAt: new Date().toISOString() },
    { id: uid(), description: "Internet fibra", category: "Internet", amount: 120, date: back(12), dueDate: back(12), method: "Cartão de débito", status: "pago" as const, notes: "", createdAt: new Date().toISOString() },
    { id: uid(), description: "Tráfego pago — Instagram", category: "Marketing", amount: 250, date: today, dueDate: today, method: "Cartão de crédito", status: "pendente" as const, notes: "Campanha de inverno", createdAt: new Date().toISOString() },
    { id: uid(), description: "Salário vendedor", category: "Salários", amount: 1650, date: back(20), dueDate: back(20), method: "Transferência", status: "pago" as const, notes: "", createdAt: new Date().toISOString() },
    { id: uid(), description: "Reposição de embalagens", category: "Fornecedores", amount: 96.4, date: back(2), dueDate: back(2), method: "PIX", status: "pago" as const, notes: "", createdAt: new Date().toISOString() },
    { id: uid(), description: "Manutenção da vitrine", category: "Manutenção", amount: 180, date: today, dueDate: today, method: "Dinheiro", status: "pendente" as const, notes: "", createdAt: new Date().toISOString() },
    { id: uid(), description: "DAS — imposto mensal", category: "Impostos", amount: 189.7, date: back(30), dueDate: back(2), method: "PIX", status: "pendente" as const, notes: "", createdAt: new Date().toISOString() },
  ];

  const purchases = [
    {
      id: uid(), number: "C-0001", supplierId: "f3", supplierName: "Confecções Gamma",
      items: [
        { productId: products[0].id, name: products[0].name, qty: 20, cost: 22 },
        { productId: products[6].id, name: products[6].name, qty: 10, cost: 58 },
      ],
      discount: 0, freight: 35, total: 20 * 22 + 10 * 58 + 35, method: "Transferência",
      date: back(35), dueDate: back(35), status: "concluida" as const, createdAt: new Date().toISOString(),
    },
    {
      id: uid(), number: "C-0002", supplierId: "f1", supplierName: "Fornecedor Alpha",
      items: [
        { productId: products[1].id, name: products[1].name, qty: 8, cost: 72 },
        { productId: products[4].id, name: products[4].name, qty: 5, cost: 68 },
      ],
      discount: 40, freight: 0, total: 8 * 72 + 5 * 68 - 40, method: "Fiado",
      date: back(10), dueDate: dISO(addDays(new Date(), 5)), status: "concluida" as const, createdAt: new Date().toISOString(),
    },
  ];

  const payables = [
    {
      id: uid(), supplierId: "f1", supplierName: "Fornecedor Alpha",
      description: "Compra C-0002 (a prazo)", amount: purchases[1].total,
      dueDate: purchases[1].dueDate, origin: "compra" as const, refId: purchases[1].id,
      status: "pendente" as const, createdAt: new Date().toISOString(),
    },
  ];

  for (const pu of purchases) {
    for (const it of pu.items) {
      moves.push({ id: uid(), productId: it.productId, type: "compra", qty: it.qty, date: pu.date, note: `Compra ${pu.number}`, ref: pu.id });
    }
  }

  const db: DB = {
    users: [sysUser, demoUser],
    business: {
      id: "b1", name: "Aurora Store", segment: "Loja", sells: "Produtos",
      slug: "aurora-store", phone: "(11) 91234-5678", address: "Rua do Comércio, 250 — São Paulo/SP",
      onboarded: true, createdAt: new Date().toISOString(),
    },
    products, moves, customers, suppliers,
    employees: [
      { id: uid(), name: "Alex Demo", phone: "(11) 91234-5678", email: "demo@fluxo.app", role: "admin", status: "ativo", createdAt: new Date().toISOString() },
      { id: uid(), name: "Bruna Sales", phone: "(11) 98811-0022", email: "bruna@aurora.com", role: "vendedor", status: "ativo", createdAt: new Date().toISOString() },
    ],
    sales,
    purchases,
    expenses,
    receivables,
    payables,
    sessions: [{ id: sid, openDate: today, openedAt: new Date().toISOString(), opening: 200 }],
    cashMoves,
    orders: [
      {
        id: uid(), number: "P-0001", customerName: "Renata Dias", phone: "(11) 93344-1122",
        address: "Rua Verde, 33", items: [{ productId: products[0].id, name: products[0].name, qty: 2, price: products[0].price, cost: products[0].cost }],
        total: products[0].price * 2, method: "PIX", notes: "Entregar após 18h", status: "novo", date: today, createdAt: new Date().toISOString(),
      },
      {
        id: uid(), number: "P-0002", customerName: "Otávio Ramos", phone: "(11) 92233-8899",
        address: "Av. Central, 1200", items: [
          { productId: products[1].id, name: products[1].name, qty: 1, price: products[1].price, cost: products[1].cost },
          { productId: products[3].id, name: products[3].name, qty: 1, price: products[3].price, cost: products[3].cost },
        ],
        total: products[1].price + products[3].price, method: "Dinheiro", notes: "", status: "confirmado", date: back(1), createdAt: new Date().toISOString(),
      },
      {
        id: uid(), number: "P-0003", customerName: "Lígia Prates", phone: "(19) 91122-7788",
        address: "Rua Nova, 88", items: [{ productId: products[8].id, name: products[8].name, qty: 1, price: products[8].price, cost: products[8].cost }],
        total: products[8].price, method: "Cartão de débito", notes: "", status: "preparacao", date: back(2), createdAt: new Date().toISOString(),
      },
    ],
    notis: [
      { id: uid(), kind: "info", msg: "Bem-vindo ao Fluxo! Seus dados de demonstração estão prontos para explorar.", read: false, createdAt: new Date().toISOString() },
      { id: uid(), kind: "warn", msg: "Pedido P-0001 recebido pelo catálogo online.", read: false, createdAt: new Date().toISOString() },
    ],
    settings: {
      categories: ["Vestuário", "Calçados", "Acessórios", "Utilidades"],
      methods: ["Dinheiro", "PIX", "Cartão de débito", "Cartão de crédito", "Transferência", "Fiado", "Outro"],
      notifyLowStock: true, notifyDue: true,
      seq: { v: seqV, p: 2, o: 3 },
    },
  };
  return db;
}

export function emptyDB(keepUsers: DB["users"], business: DB["business"], settings?: DB["settings"]): DB {
  return {
    users: keepUsers, business,
    products: [], moves: [], customers: [], suppliers: [], employees: [],
    sales: [], purchases: [], expenses: [], receivables: [], payables: [],
    sessions: [], cashMoves: [], orders: [], notis: [],
    settings: settings ?? {
      categories: ["Geral"], methods: ["Dinheiro", "PIX", "Cartão de débito", "Cartão de crédito", "Transferência", "Fiado", "Outro"],
      notifyLowStock: true, notifyDue: true, seq: { v: 0, p: 0, o: 0 },
    },
  };
}
