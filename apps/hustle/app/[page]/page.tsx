import { notFound } from "next/navigation";
import { PageFrame } from "@nomos/ui";
import { SimplysentDashboard } from "@/components/simplysent-dashboard";
import { PulseDashboard } from "@/components/pulse-dashboard";
const pages = ["pulse", "simplysent"] as const;
export function generateStaticParams() { return pages.map((page) => ({ page })); }
export default async function Page({ params }: { params: Promise<{ page: string }> }) { const { page } = await params; if (!pages.includes(page as (typeof pages)[number])) notFound(); return page === "simplysent" ? <PageFrame><SimplysentDashboard /></PageFrame> : <PageFrame><PulseDashboard /></PageFrame>; }
