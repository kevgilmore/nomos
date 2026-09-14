import { notFound } from "next/navigation";
const pages = ["overview", "chores", "bills", "renewals"] as const;
export function generateStaticParams() { return pages.map((page) => ({ page })); }
export default async function Page({ params }: { params: Promise<{ page: string }> }) { const { page } = await params; if (!pages.includes(page as (typeof pages)[number])) notFound(); return <main className="min-h-dvh px-4 py-8 md:px-8 md:py-12"><h1 className="text-4xl font-semibold capitalize">{page}</h1></main>; }
