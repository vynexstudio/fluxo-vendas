/* ============================================================
 * Fluxo — Modelo de dados e constantes de domínio
 * ============================================================ */

export type Role = "admin" | "vendedor" | "estoquista" | "financeiro";

export interface User {
  id: string;
  name: string;
  email: string;
  passHash: string;
  role: Role;
  super?: boolean;
  createdAt: string;
}

export interface Business {
  id: string;
  name: string;
  segment: string;
  sells: string;
  slug: string;
  phone: string;
  address: string;
  onboarded: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  code: string;
  barcode: string;
  category: string;
  description: string;
  cost: number;
  price: number;
  stock: number;
  minStock: number;
  unit: string;
  supplierId: string;
  active: boolean;
  inCatalog: boolean;
  createdAt: string;
}

export type MoveType = "entrada" | "saida" | "ajuste" | "venda" | "compra" | "perda" | "devolucao";

export interface StockMove {
  id: string;
  productId: string;
  type: MoveType;
  qty: number;
  date: string; // YYYY-MM-DD
  note: string;
  ref?: string;
}

export interface Person {
  id: string;
  name: string;
  doc: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  createdAt: string;
}

export type Customer = Person;
export type Supplier = Person;

export interface Employee {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: Role;
  status: "ativo" | "inativo";
  createdAt: string;
}

export interface SaleItem {
  productId: string;
  name: string;
  qty: number;
  price: number;
  cost: number;
}

export type SaleStatus = "concluida" | "fiado" | "cancelada";

export interface Sale {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  method: string;
  installments: number;
  status: SaleStatus;
  date: string;
  createdAt: string;
}

export interface PurchaseItem {
  productId: string;
  name: string;
  qty: number;
  cost: number;
}

export interface Purchase {
  id: string;
  number: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseItem[];
  discount: number;
  freight: number;
  total: number;
  method: string;
  date: string;
  dueDate: string;
  status: "concluida" | "cancelada";
  createdAt: string;
}

export interface Expense {
  id: string;
  description: string;
  category: string;
  amount: number;
  date: string;
  dueDate: string;
  method: string;
  status: "pago" | "pendente";
  notes: string;
  createdAt: string;
}

export type DocStatus = "pendente" | "pago" | "cancelado";

export interface Receivable {
  id: string;
  customerId: string;
  customerName: string;
  description: string;
  amount: number;
  paid: number;
  dueDate: string;
  origin: "venda" | "pedido" | "outro";
  refId: string;
  status: DocStatus;
  createdAt: string;
}

export interface Payable {
  id: string;
  supplierId: string;
  supplierName: string;
  description: string;
  amount: number;
  dueDate: string;
  origin: "compra" | "despesa" | "outro";
  refId: string;
  status: "pendente" | "pago";
  createdAt: string;
}

export interface CashSession {
  id: string;
  openDate: string;
  openedAt: string;
  opening: number;
  closedAt?: string;
  closing?: {
    counted: number;
    expected: number;
    diff: number;
    byMethod: Record<string, number>;
    totalIn: number;
    totalOut: number;
  };
}

export interface CashMove {
  id: string;
  sessionId: string;
  dir: "in" | "out";
  description: string;
  amount: number;
  method: string;
  date: string;
  refType?: string;
  refId?: string;
  createdAt: string;
}

export type OrderStatus = "novo" | "confirmado" | "preparacao" | "pronto" | "enviado" | "concluido" | "cancelado";

export interface Order {
  id: string;
  number: string;
  customerName: string;
  phone: string;
  address: string;
  items: SaleItem[];
  total: number;
  method: string;
  notes: string;
  status: OrderStatus;
  date: string;
  createdAt: string;
}

export interface Noti {
  id: string;
  kind: "success" | "warn" | "info" | "danger";
  msg: string;
  read: boolean;
  createdAt: string;
}

export interface Settings {
  categories: string[];
  methods: string[];
  notifyLowStock: boolean;
  notifyDue: boolean;
  seq: { v: number; p: number; o: number };
}

export interface DB {
  users: User[];
  business: Business | null;
  products: Product[];
  moves: StockMove[];
  customers: Customer[];
  suppliers: Supplier[];
  employees: Employee[];
  sales: Sale[];
  purchases: Purchase[];
  expenses: Expense[];
  receivables: Receivable[];
  payables: Payable[];
  sessions: CashSession[];
  cashMoves: CashMove[];
  orders: Order[];
  notis: Noti[];
  settings: Settings;
}

/* ---------------- Constantes ---------------- */

export const SEGMENTS = [
  "Loja", "Comércio", "Restaurante", "Barbearia", "Salão",
  "Oficina", "Prestação de serviços", "Venda online", "Outro",
];

export const SELL_TYPES = ["Produtos", "Serviços", "Ambos"];

export const PAY_METHODS = [
  "Dinheiro", "PIX", "Cartão de débito", "Cartão de crédito", "Transferência", "Fiado", "Outro",
];

export const EXPENSE_CATS = [
  "Aluguel", "Energia", "Água", "Internet", "Salários", "Marketing",
  "Transporte", "Fornecedores", "Impostos", "Manutenção", "Outros",
];

export const UNITS = ["un", "kg", "g", "L", "ml", "m", "cx", "pct", "par", "serviço"];

export const MOVE_TYPES: { id: MoveType; label: string }[] = [
  { id: "entrada", label: "Entrada" },
  { id: "saida", label: "Saída" },
  { id: "ajuste", label: "Ajuste" },
  { id: "venda", label: "Venda" },
  { id: "compra", label: "Compra" },
  { id: "perda", label: "Perda" },
  { id: "devolucao", label: "Devolução" },
];

export const ORDER_FLOW: { id: OrderStatus; label: string }[] = [
  { id: "novo", label: "Novo" },
  { id: "confirmado", label: "Confirmado" },
  { id: "preparacao", label: "Em preparação" },
  { id: "pronto", label: "Pronto" },
  { id: "enviado", label: "Enviado" },
  { id: "concluido", label: "Concluído" },
];

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrador",
  vendedor: "Vendedor",
  estoquista: "Estoquista",
  financeiro: "Financeiro",
};

export const PERMISSIONS: Record<string, { label: string; roles: Role[] }> = {
  dashboard: { label: "Dashboard", roles: ["admin", "vendedor", "estoquista", "financeiro"] },
  vendas: { label: "Vendas e pedidos", roles: ["admin", "vendedor"] },
  estoque: { label: "Produtos e estoque", roles: ["admin", "estoquista", "vendedor"] },
  compras: { label: "Compras e fornecedores", roles: ["admin", "estoquista"] },
  financeiro: { label: "Financeiro e caixa", roles: ["admin", "financeiro"] },
  relatorios: { label: "Relatórios e lucro", roles: ["admin", "financeiro"] },
  config: { label: "Configurações", roles: ["admin"] },
};

export const PRODUCT_COLORS = [
  "#0047b3", "#3f759c", "#00a3e6", "#0b3a8c", "#0066ff",
  "#53657d", "#12bfff", "#0052d9", "#7a9bc4", "#06295e",
];
