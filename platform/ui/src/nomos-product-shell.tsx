"use client";

import { NOMOS_URLS } from "@nomos/auth";
import { NomosLogo } from "./nomos-logo";
import { NomosShell, type ShellNavItem } from "./nomos-shell";
import { NOMOS_APPS } from "./nomos-apps";

export function NomosProductShell({ title, assistantPage, navigation, profileImage, appSlug, children }: { title: string; assistantPage: string; navigation: ShellNavItem[]; profileImage?: string; appSlug?: "base" | "fitness"; children: React.ReactNode }) {
  return <NomosShell title={title} homeUrl={NOMOS_URLS.home} logo={<NomosLogo compact />} apps={[...NOMOS_APPS]} assistantPage={assistantPage} navigation={navigation} profileImage={profileImage} appSlug={appSlug}>{children}</NomosShell>;
}

export function NomosHomeShell({ navigation, profileImage, children }: { navigation: ShellNavItem[]; profileImage?: string; children: React.ReactNode }) {
  return <NomosShell title="Nomos" homeUrl={NOMOS_URLS.home} logo={<NomosLogo compact />} apps={[...NOMOS_APPS]} navigation={navigation} profileImage={profileImage}>{children}</NomosShell>;
}
