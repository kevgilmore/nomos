import { redirect } from "next/navigation";
import { NOMOS_URLS } from "@nomos/auth";

export default function Home() { redirect(NOMOS_URLS.home); }
