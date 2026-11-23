"use client";

import * as React from "react";
import { Check, ChevronDown, Filter, Users } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@nomos/ui";

type FilterOption = { value: string; label: string };
type FilterDefinition = {
  key: string;
  label: string;
  icon: React.ElementType;
  options: FilterOption[];
};

const dateOptions: FilterOption[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "12m", label: "Last 12 months" },
];

const segmentOptions: FilterOption[] = [
  { value: "all", label: "All" },
  { value: "new", label: "New visitors" },
  { value: "returning", label: "Returning visitors" },
  { value: "high-intent", label: "High intent" },
];

const productOptions: FilterOption[] = [
  { value: "all", label: "All products" },
  { value: "simplysent", label: "Simplysent" },
  { value: "pulse", label: "Pulse" },
];

function FilterDropdown({ definition, selected, onSelect }: { definition: FilterDefinition; selected: string; onSelect: (value: string) => void }) {
  const option = definition.options.find((item) => item.value === selected) ?? definition.options[0];
  const Icon = definition.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" aria-haspopup="menu" aria-label={`${definition.label}: ${option.label}`}>
          <Icon className="size-3.5" />
          <span className="max-w-36 truncate">{option.label}</span>
          <ChevronDown className="size-3.5" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{definition.label}</DropdownMenuLabel>
        {definition.options.map((item) => (
          <DropdownMenuItem key={item.value} onSelect={() => onSelect(item.value)}>
            <Check className={`size-4 ${item.value === selected ? "text-[var(--ring)] opacity-100" : "opacity-0"}`} aria-hidden="true" />
            <span>{item.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function HustleFilters({ mode }: { mode: "pulse" | "simplysent" }) {
  const definitions: FilterDefinition[] = mode === "pulse"
    ? [
        { key: "date", label: "Date range", icon: Filter, options: dateOptions },
        { key: "product", label: "Product", icon: Users, options: productOptions },
      ]
    : [
        { key: "date", label: "Date range", icon: Filter, options: dateOptions.slice(0, 3) },
        { key: "segment", label: "Ad segment", icon: Users, options: segmentOptions },
      ];
  const [selected, setSelected] = React.useState<Record<string, string>>(() => Object.fromEntries(definitions.map((item) => [item.key, item.options[0].value === "all" ? "all" : item.key === "date" ? (mode === "pulse" ? "12m" : "30d") : item.options[0].value])));

  return (
    <div className="flex flex-wrap gap-2" aria-label={`${mode} filters`}>
      {definitions.map((definition) => (
        <FilterDropdown
          key={definition.key}
          definition={definition}
          selected={selected[definition.key]}
          onSelect={(value) => setSelected((current) => ({ ...current, [definition.key]: value }))}
        />
      ))}
    </div>
  );
}
