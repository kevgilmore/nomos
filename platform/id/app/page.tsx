import { redirect } from "next/navigation";

export default function IdentityHome() {
  redirect("/sign-in");
}
