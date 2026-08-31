import { BadgeDollarSign, Blocks, ChartNoAxesCombined, CreditCard, LayoutDashboard, ListTodo, Megaphone, PackageSearch, ShoppingBag, Truck, WalletCards, type LucideIcon } from "lucide-react";

export type PageConfig = { slug: string; label: string; description: string; icon: LucideIcon; tabs: { slug: string; label: string }[] };
export const pages: PageConfig[] = [
  { slug: "dashboard", label: "Dashboard", description: "A clear overview of your workspace.", icon: LayoutDashboard, tabs: [{ slug: "overview", label: "Overview" }, { slug: "activity", label: "Activity" }, { slug: "sales", label: "Sales" }] },
  { slug: "sales", label: "Sales", description: "Revenue, customers, and growth at a glance.", icon: BadgeDollarSign, tabs: [{ slug: "overview", label: "Overview" }, { slug: "revenue", label: "Revenue" }, { slug: "customers", label: "Customers" }] },
  { slug: "finance", label: "Finance", description: "Financial health and transaction workflows.", icon: WalletCards, tabs: [{ slug: "overview", label: "Overview" }, { slug: "transactions", label: "Transactions" }, { slug: "accounts", label: "Accounts" }] },
  { slug: "logistics", label: "Logistics", description: "Shipments, inventory, and fulfilment operations.", icon: Truck, tabs: [{ slug: "overview", label: "Overview" }, { slug: "shipments", label: "Shipments" }, { slug: "inventory", label: "Inventory" }] },
  { slug: "productivity", label: "Productivity", description: "Tasks, calendars, and focused work.", icon: ListTodo, tabs: [{ slug: "overview", label: "Overview" }, { slug: "tasks", label: "Tasks" }, { slug: "calendar", label: "Calendar" }] },
  { slug: "campaign", label: "Campaign", description: "Plan, launch, and measure campaigns.", icon: Megaphone, tabs: [{ slug: "overview", label: "Overview" }, { slug: "campaigns", label: "Campaigns" }, { slug: "audience", label: "Audience" }] },
  { slug: "analytics", label: "Analytics", description: "Understand traffic, conversion, and retention.", icon: ChartNoAxesCombined, tabs: [{ slug: "overview", label: "Overview" }, { slug: "traffic", label: "Traffic" }, { slug: "conversion", label: "Conversion" }] },
  { slug: "payments", label: "Payments", description: "Payment activity, invoices, and payouts.", icon: CreditCard, tabs: [{ slug: "overview", label: "Overview" }, { slug: "invoices", label: "Invoices" }, { slug: "payouts", label: "Payouts" }] },
  { slug: "ecommerce", label: "eCommerce", description: "Products, customers, and online orders.", icon: ShoppingBag, tabs: [{ slug: "overview", label: "Overview" }, { slug: "products", label: "Products" }, { slug: "customers", label: "Customers" }] },
  { slug: "orders", label: "Orders", description: "Track and manage every order lifecycle.", icon: PackageSearch, tabs: [{ slug: "overview", label: "Overview" }, { slug: "all", label: "All orders" }, { slug: "returns", label: "Returns" }] },
  { slug: "ui-kit", label: "UI kit", description: "The reusable Nomos interface inventory.", icon: Blocks, tabs: [{ slug: "overview", label: "Overview" }, { slug: "forms", label: "Forms" }, { slug: "cards", label: "Cards" }, { slug: "charts", label: "Charts" }, { slug: "data", label: "Data display" }] },
];

export function getPage(pageSlug: string) { return pages.find((page) => page.slug === pageSlug); }
