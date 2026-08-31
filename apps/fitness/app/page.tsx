import { redirect } from "next/navigation";
import { appConfig } from "@/lib/app-config";

export default function Home() { redirect(appConfig.homePath); }
