import { TemplateCatalogue, type TemplatePageSlug } from "@nomos/ui";

const pageTabs = {
  overview: ["foundations", "empty", "loading"], cards: ["basic", "image", "stats", "interactive"], feedback: ["banners", "toasts", "errors", "progress"], forms: ["inputs", "selection", "dates", "uploads"], data: ["standard", "filtered", "editable"], charts: ["trends", "comparison", "distribution"], overlays: ["modals", "drawers", "menus"], actions: ["buttons", "navigation", "filters"], status: ["badges", "identity", "priority"], ai: ["agent"],
} as const;
const pageSlugs = Object.keys(pageTabs) as TemplatePageSlug[];

export function generateStaticParams() {
  return pageSlugs.flatMap((page) => pageTabs[page].map((tab) => ({ page, tab })));
}

export default async function CataloguePage({ params }: { params: Promise<{ page: string; tab: string }> }) {
  const { page, tab } = await params;
  const validPage = pageSlugs.includes(page as TemplatePageSlug) ? page as TemplatePageSlug : "overview";
  return <TemplateCatalogue page={validPage} tab={tab} />;
}
