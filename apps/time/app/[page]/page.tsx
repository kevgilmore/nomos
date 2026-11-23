import { notFound } from "next/navigation";
import { PageFrame } from "@nomos/ui";
const pages = ["breakdown", "schedule", "calendar", "holidays"] as const;
export function generateStaticParams() { return pages.map((page) => ({ page })); }
export default async function Page({ params }: { params: Promise<{ page: string }> }) { const { page } = await params; if (!pages.includes(page as (typeof pages)[number])) notFound(); return <PageFrame />; }
