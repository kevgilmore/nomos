"use client";

import { FormEvent, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUp, Check, ChevronDown, Copy, MessageSquarePlus, PanelRightClose, Trash2, X } from "lucide-react";
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, Progress } from "./index";
import { appIdForPage, createConversation, deleteConversation, getCachedAvailableModels, getCachedConversation, getCachedConversations, getConversation, listAvailableModels, listConversations, sendMessage } from "@nomos/ai/client";
import type { AvailableAiModel } from "@nomos/ai/client";
import type { AiConversation } from "@nomos/ai/types";

type Message = { role: "assistant" | "user"; content: string; proposal?: Record<string, unknown> };

const suggestions = ["Summarise this page", "What needs attention?", "Draft a status update"];

// Claude is not connected yet. Keep the provider UI useful with clearly local placeholder usage.
const claudeModels = [
  { name: "Claude Sonnet 4", tokens: 124_000, requests: 32 },
  { name: "Claude Opus 4", tokens: 68_000, requests: 14 },
  { name: "Claude Haiku 3.5", tokens: 31_000, requests: 9 },
];
const claudeCreditUsed = 223_000;
const claudeCreditLimit = 500_000;
const DEFAULT_OPENAI_MODEL = "gpt-5.4-nano";
const MODEL_STORAGE_PREFIX = "nomos-ai-selected-model";
const openAiModelOptions = [
  { label: "Fast", name: "gpt-5.4-nano" },
  { label: "Balanced", name: "gpt-5.4-mini" },
  { label: "Powerful", name: "gpt-5.4" },
  { label: "Maximum", name: "gpt-5.5" },
] as const;

function modelStorageKey(appId: string, provider: "OpenAI" | "Claude") {
  return `${MODEL_STORAGE_PREFIX}:${appId}:${provider.toLowerCase()}`;
}
function readStoredModel(appId: string, provider: "OpenAI" | "Claude") {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(modelStorageKey(appId, provider));
    return value?.trim() || null;
  } catch { return null; }
}
function storeSelectedModel(appId: string, provider: "OpenAI" | "Claude", model: string) {
  try { window.localStorage.setItem(modelStorageKey(appId, provider), model); } catch { /* Storage may be unavailable. */ }
}
function modelDisplayName(model: string) {
  const option = openAiModelOptions.find((item) => item.name === model);
  return option ? `${option.label} (${option.name})` : model;
}

function formatTokenAmount(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 100_000 ? 0 : 1).replace(/\.0$/, "")}K`;
  return value.toLocaleString();
}
function formatRelativeTime(value: string, now: number) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "";
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds} secs ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}
function newestFirst(conversations: AiConversation[]) {
  return [...conversations].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}
function readAssistantContext(storageKey?: string) {
  if (!storageKey) return undefined;
  try {
    const value = JSON.parse(window.localStorage.getItem(storageKey) || "null");
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
  } catch { return undefined; }
}

function renderInlineMarkdown(value: string) {
  const parts = value.split(/(\*\*[^*\n]+\*\*|__[^_\n]+__|`[^`\n]+`)/g);
  return parts.map((part, index) => {
    if ((part.startsWith("**") && part.endsWith("**")) || (part.startsWith("__") && part.endsWith("__"))) {
      return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={`${part}-${index}`} className="rounded bg-black/10 px-1 py-0.5 text-[0.9em] dark:bg-white/10">{part.slice(1, -1)}</code>;
    }
    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

function AssistantMessage({ content }: { content: string }) {
  return <div className="space-y-2">
    {content.split("\n").map((line, index) => {
      const bullet = line.match(/^(\s*)[-*]\s+(.+)$/);
      if (bullet) return <div key={`${line}-${index}`} className={`flex gap-2 ${bullet[1] ? "ml-4" : ""}`}><span aria-hidden="true" className="shrink-0">•</span><span className="min-w-0">{renderInlineMarkdown(bullet[2])}</span></div>;
      if (!line.trim()) return <div key={`blank-${index}`} aria-hidden="true" className="h-1" />;
      return <p key={`${line}-${index}`}>{renderInlineMarkdown(line)}</p>;
    })}
  </div>;
}

function publishAssistantProposal(storageKey: string | undefined, proposal: Record<string, unknown> | null | undefined) {
  if (!storageKey || typeof window === "undefined") return;
  const savedAt = new Date().toISOString();
  try {
    if (!proposal) {
      // A later answer without a plan must not leave an older proposal visible.
      window.localStorage.removeItem(storageKey);
      window.dispatchEvent(new CustomEvent("nomos:assistant-proposal", { detail: { storageKey, version: 1, savedAt, proposal: null } }));
      return;
    }
    const envelope = { version: 1, savedAt, proposal };
    window.localStorage.setItem(storageKey, JSON.stringify(envelope));
    window.dispatchEvent(new CustomEvent("nomos:assistant-proposal", { detail: { storageKey, ...envelope } }));
  } catch {
    // The assistant remains usable when local storage is unavailable.
  }
}

export function AssistantPanel({ page, mobile = false, width, contextStorageKey, proposalStorageKey, onResizeStart, onClose }: { page: string; mobile?: boolean; width?: number; contextStorageKey?: string; proposalStorageKey?: string; onResizeStart?: (event: ReactPointerEvent<HTMLDivElement>) => void; onClose: () => void }) {
  const appId = appIdForPage(page);
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationError, setConversationError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [model, setModelState] = useState(() => readStoredModel(appId, "OpenAI") || DEFAULT_OPENAI_MODEL);
  const [models, setModels] = useState<AvailableAiModel[]>([]);
  const [openAiTrackedTokens, setOpenAiTrackedTokens] = useState(0);
  const [openAiCreditLimit, setOpenAiCreditLimit] = useState<number | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);
  const [provider, setProvider] = useState<"OpenAI" | "Claude">("OpenAI");
  const [clearing, setClearing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [errorCopied, setErrorCopied] = useState(false);
  const [relativeNow, setRelativeNow] = useState(() => Date.now());
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesViewportRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const conversationOperation = useRef(0);
  function setModel(value: string | ((current: string) => string), modelProvider = provider) {
    setModelState((current) => {
      const next = typeof value === "function" ? value(current) : value;
      if (next) storeSelectedModel(appId, modelProvider, next);
      return next;
    });
  }
  function selectProvider(value: "OpenAI" | "Claude") {
    setProvider(value);
    setModel(readStoredModel(appId, value) || (value === "Claude" ? claudeModels[0].name : DEFAULT_OPENAI_MODEL), value);
  }

  useEffect(() => {
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const operation = conversationOperation.current;
        const storedId = window.sessionStorage.getItem(`nomos-ai:${appId}`);
        const cachedConversations = getCachedConversations(appId);
        const cachedSelected = cachedConversations.find((item) => item.id === storedId) ?? cachedConversations[0];
        if (cachedConversations.length) setConversations(cachedConversations);
        if (cachedSelected) {
          const cachedConversation = getCachedConversation(appId, cachedSelected.id);
          setConversationId(cachedSelected.id);
          window.sessionStorage.setItem(`nomos-ai:${appId}`, cachedSelected.id);
          if (cachedConversation) setMessages(cachedConversation.messages.map((message) => ({ role: message.role === "user" ? "user" : "assistant", content: message.content, proposal: message.proposal })));
        }
        const result = await listConversations(appId, { force: true });
        if (!active || conversationOperation.current !== operation) return;
        setConversations(newestFirst(result.conversations));
        const selected = result.conversations.find((item) => item.id === storedId) ?? result.conversations[0];
        if (!selected) {
          setConversationId(null);
          setMessages([]);
          window.sessionStorage.removeItem(`nomos-ai:${appId}`);
          setConversationError(null);
          return;
        }
        const conversation = await getConversation(appId, selected.id, { force: true });
        if (!active || conversationOperation.current !== operation) return;
        setConversationId(conversation.conversation.id);
        window.sessionStorage.setItem(`nomos-ai:${appId}`, conversation.conversation.id);
        setMessages(conversation.messages.map((message) => ({ role: message.role === "user" ? "user" : "assistant", content: message.content, proposal: message.proposal })));
        setConversationError(null);
      } catch (error) {
        if (active) setConversationError(error instanceof Error ? error.message : "AI history unavailable");
      }
    }
    void load();
    return () => { active = false; };
  }, [appId]);

  useEffect(() => {
    const interval = window.setInterval(() => setRelativeNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!stickToBottomRef.current) return;
    const frame = requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }));
    return () => cancelAnimationFrame(frame);
  }, [messages, sending, conversationError]);

  useEffect(() => {
    let active = true;
    const cached = getCachedAvailableModels(appId);
    if (cached?.live && cached.models.length) {
      setModels(cached.models);
      setOpenAiTrackedTokens(cached.trackedTokens ?? cached.models.reduce((total, option) => total + option.tokens, 0));
      setOpenAiCreditLimit(cached.creditLimitTokens ?? null);
      setModel((current) => current || readStoredModel(appId, "OpenAI") || DEFAULT_OPENAI_MODEL, "OpenAI");
    }
    listAvailableModels(appId, { force: true }).then((data) => {
      if (!active) return;
      if (!data.live || !data.models.length) throw new Error(data.error || "No live OpenAI models are available.");
      setModels(data.models);
      setOpenAiTrackedTokens(data.trackedTokens ?? data.models.reduce((total, option) => total + option.tokens, 0));
      setOpenAiCreditLimit(data.creditLimitTokens ?? null);
      setModel(readStoredModel(appId, "OpenAI") || DEFAULT_OPENAI_MODEL, "OpenAI");
      setModelError(null);
    }).catch((error) => {
      if (active) {
        if (!cached?.models.length) {
          setModels([]);
          setOpenAiTrackedTokens(0);
          setOpenAiCreditLimit(null);
          setModel(DEFAULT_OPENAI_MODEL, "OpenAI");
        }
        setModelError(error instanceof Error ? error.message : "Live OpenAI models are unavailable.");
      }
    });
    return () => { active = false; };
  }, [appId]);

  useEffect(() => {
    if (!mobile) return;
    function closeOnEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobile, onClose]);

  async function send(value = prompt) {
    const next = value.trim();
    if (!next || sending) return;
    conversationOperation.current += 1;
    setSending(true);
    setConversationError(null);
    setErrorCopied(false);
    setPrompt("");
    try {
      let activeConversationId = conversationId;
      let activeConversation = conversations.find((conversation) => conversation.id === activeConversationId);
      if (!activeConversationId) {
        const created = await createConversation(appId, model || undefined);
        activeConversationId = created.conversation.id;
        activeConversation = created.conversation;
        setConversations((current) => newestFirst([created.conversation, ...current]));
        setConversationId(activeConversationId);
        window.sessionStorage.setItem(`nomos-ai:${appId}`, activeConversationId);
      }
      setMessages((current) => [...current, { role: "user", content: next }]);
      const cachedContext = readAssistantContext(contextStorageKey);
      const cachedContextVersion = typeof cachedContext?.version === "number" ? cachedContext.version : undefined;
      const context = activeConversation?.hasContext && activeConversation.contextVersion === cachedContextVersion ? undefined : cachedContext;
      const result = await sendMessage(appId, activeConversationId, next, context);
      publishAssistantProposal(proposalStorageKey, result.proposal);
      setMessages((current) => [...current, { role: "assistant", content: result.assistantMessage.content, proposal: result.proposal }]);
      setConversations((current) => newestFirst(current.map((conversation) => conversation.id === activeConversationId ? result.conversation || { ...conversation, title: conversation.messageCount === 0 ? next.slice(0, 72) : conversation.title, updatedAt: result.assistantMessage.createdAt, messageCount: conversation.messageCount + 2, hasContext: conversation.hasContext || Boolean(context) } : conversation)));
    } catch (error) {
      setConversationError(error instanceof Error ? error.message : "Unable to reach the AI service");
    } finally {
      setSending(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  async function startConversation() {
    if (starting) return;
    conversationOperation.current += 1;
    setStarting(true);
    try {
      const conversation = await createConversation(appId, model || undefined);
      setConversations((current) => newestFirst([conversation.conversation, ...current]));
      setConversationId(conversation.conversation.id);
      setMessages([]);
      setConversationError(null);
      setErrorCopied(false);
      window.sessionStorage.setItem(`nomos-ai:${appId}`, conversation.conversation.id);
    } catch (error) { setConversationError(error instanceof Error ? error.message : "Unable to create conversation"); }
    finally { setStarting(false); }
  }

  async function selectConversation(id: string) {
    const operation = ++conversationOperation.current;
    try {
      const conversation = await getConversation(appId, id);
      if (conversationOperation.current !== operation) return;
      setConversationId(id);
      setMessages(conversation.messages.map((message) => ({ role: message.role === "user" ? "user" : "assistant", content: message.content, proposal: message.proposal })));
      window.sessionStorage.setItem(`nomos-ai:${appId}`, id);
      setConversationError(null);
    } catch (error) { setConversationError(error instanceof Error ? error.message : "Unable to load conversation"); }
  }

  async function clearCurrentConversation() {
    if (!conversationId || clearing) return;
    conversationOperation.current += 1;
    setClearing(true);
    setConversationError(null);
    try {
      const deletedConversationId = conversationId;
      await deleteConversation(appId, deletedConversationId);
      const result = await listConversations(appId, { force: true });
      const remaining = newestFirst(result.conversations.filter((conversation) => conversation.id !== deletedConversationId));
      setConversations(remaining);
      setMessages([]);
      if (!remaining.length) {
        setConversationId(null);
        window.sessionStorage.removeItem(`nomos-ai:${appId}`);
        return;
      }
      const next = await getConversation(appId, remaining[0].id, { force: true });
      setConversationId(next.conversation.id);
      setMessages(next.messages.map((message) => ({ role: message.role === "user" ? "user" : "assistant", content: message.content, proposal: message.proposal })));
      window.sessionStorage.setItem(`nomos-ai:${appId}`, next.conversation.id);
    } catch (error) {
      setConversationError(error instanceof Error ? error.message : "Unable to clear conversation");
    } finally {
      setClearing(false);
    }
  }

  async function copyConversationError() {
    if (!conversationError) return;
    try {
      await navigator.clipboard.writeText(conversationError);
      setErrorCopied(true);
      window.setTimeout(() => setErrorCopied(false), 1800);
    } catch {
      setErrorCopied(false);
    }
  }

  function submit(event: FormEvent) { event.preventDefault(); void send(); }
  function reviewProposal() {
    router.push("/plan/");
    onClose();
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  }
  function handleKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); }
  }
  function handleMessagesScroll() {
    const element = messagesViewportRef.current;
    if (!element) return;
    stickToBottomRef.current = element.scrollHeight - element.scrollTop - element.clientHeight <= 64;
  }

  const openAiTokens = openAiTrackedTokens;
  const openAiRemaining = openAiCreditLimit === null ? null : Math.max(openAiCreditLimit - openAiTokens, 0);
  const openAiUsagePercent = openAiCreditLimit === null ? 0 : Math.min((openAiTokens / openAiCreditLimit) * 100, 100);
  const claudeUsagePercent = (claudeCreditUsed / claudeCreditLimit) * 100;

  return <section aria-label={`${provider} assistant panel`} role={mobile ? "dialog" : undefined} aria-modal={mobile || undefined} style={!mobile && width ? { width } : undefined} className={mobile ? "fixed inset-0 z-50 flex flex-col bg-[var(--card)] xl:hidden" : "relative sticky top-18 hidden h-[calc(100dvh-4.5rem)] shrink-0 flex-col bg-[var(--card)] xl:flex"}>
    {!mobile && onResizeStart && <div role="separator" aria-label={`Resize ${provider} panel`} aria-orientation="vertical" onPointerDown={onResizeStart} className="absolute -left-1 top-0 z-10 h-full w-2 cursor-col-resize"/>}
    <header className="shrink-0 border-b border-[var(--border)] px-4 py-3">
      <div className="flex h-9 items-center gap-3">
        <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-[var(--accent)]"><img src={provider === "Claude" ? "/claude.png" : "/openai.png"} alt={`${provider} logo`} width={24} height={24} className="size-6 rounded-md object-contain"/></span>
        <h2 className="min-w-0 flex-1 text-sm font-semibold">{provider}</h2>
        <DropdownMenu><DropdownMenuTrigger asChild><button className="flex h-9 min-w-28 items-center justify-between gap-3 rounded-xl bg-[var(--muted)] px-3 text-xs font-semibold text-[var(--foreground)] outline-none transition-colors hover:bg-[var(--accent)] data-[state=open]:bg-[var(--accent)]" aria-label={`${provider} model: ${model || "Models unavailable"}`}><span className="max-w-40 truncate">{model ? modelDisplayName(model) : "Models unavailable"}</span><ChevronDown className="size-3.5 text-[var(--muted-foreground)]"/></button></DropdownMenuTrigger><DropdownMenuContent align="end" className="max-h-[min(32rem,calc(100dvh-7rem))] w-72 overflow-y-auto border-0 bg-[var(--popover)] p-2 shadow-xl outline-none"><div className="space-y-1"><button type="button" onClick={() => selectProvider("OpenAI")} className="flex w-full items-center gap-3 rounded-xl p-3 text-left text-sm transition-colors hover:bg-[var(--accent)]"><span className="flex-1 font-semibold">OpenAI</span><ChevronDown className={`size-4 transition-transform ${provider === "OpenAI" ? "rotate-180" : ""}`}/></button>{provider === "OpenAI" && <div className="space-y-2 pl-3">{openAiModelOptions.map((option) => { const live = models.find((item) => item.name === option.name); return <button type="button" key={option.name} onClick={() => setModel(option.name)} className="flex min-h-14 w-full items-center gap-2 rounded-xl p-3 text-left text-xs font-medium transition-colors hover:bg-[var(--accent)]"><span className="min-w-0 flex-1"><span className="block truncate">{option.label} ({option.name})</span><span className="mt-0.5 block truncate text-[10px] font-normal text-[var(--muted-foreground)]">{live ? `${live.tokens.toLocaleString()} tokens used` : "OpenAI model"}</span></span>{model === option.name && <Check className="size-3.5 shrink-0 text-[var(--ring)]"/>}</button>; })}</div>}<button type="button" onClick={() => selectProvider("Claude")} className="flex w-full items-center gap-3 rounded-xl p-3 text-left text-sm transition-colors hover:bg-[var(--accent)]"><span className="flex-1 font-semibold">Claude</span><ChevronDown className={`size-4 transition-transform ${provider === "Claude" ? "rotate-180" : ""}`}/></button>{provider === "Claude" && <div className="space-y-2 pl-3">{claudeModels.map((option) => <button type="button" key={option.name} onClick={() => setModel(option.name)} className="flex min-h-14 w-full items-center gap-2 rounded-xl p-3 text-left text-xs font-medium transition-colors hover:bg-[var(--accent)]"><span className="min-w-0 flex-1"><span className="block truncate">{option.name}</span><span className="mt-0.5 block truncate text-[10px] font-normal text-[var(--muted-foreground)]">{option.tokens.toLocaleString()} tokens used · demo</span></span>{model === option.name && <Check className="size-3.5 shrink-0 text-[var(--ring)]"/>}</button>)}</div>}</div></DropdownMenuContent></DropdownMenu>
        {!mobile && <Button variant="ghost" size="icon" onClick={onClose} aria-label={`Close ${provider}`} title={`Close ${provider}`} className="size-10 min-h-10 rounded-xl text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"><PanelRightClose/></Button>}
      </div>
      <div className="mt-3 space-y-1.5">
        <div className="flex items-center justify-between gap-2 text-[10px]"><span className="font-semibold text-[var(--foreground)]">{provider} credit{provider === "Claude" ? " (demo)" : ""}</span><span className="text-right text-[var(--muted-foreground)]">{provider === "Claude" ? formatTokenAmount(claudeCreditLimit - claudeCreditUsed) : openAiRemaining === null ? "—" : formatTokenAmount(openAiRemaining)}</span></div>
        <Progress value={provider === "Claude" ? claudeUsagePercent : openAiUsagePercent}/>
      </div>
    </header>

    <div className="flex min-h-12 shrink-0 items-center justify-between gap-2 border-y border-[var(--border)] px-4">
      <DropdownMenu><DropdownMenuTrigger asChild><button className="flex min-w-0 max-w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-[var(--muted-foreground)] hover:bg-[var(--accent)]" aria-label="Choose conversation"><span className="shrink-0 font-semibold uppercase tracking-[0.12em]">History</span><span className="min-w-0 truncate">{conversations.find((item) => item.id === conversationId)?.title || (conversations.length ? "New conversation" : "No conversations")}</span><ChevronDown className="size-3 shrink-0"/></button></DropdownMenuTrigger><DropdownMenuContent align="start" className="max-h-[min(24rem,calc(100dvh-8rem))] w-64 overflow-y-auto">{!conversations.length && <DropdownMenuItem disabled className="cursor-default opacity-70">No conversations</DropdownMenuItem>}{conversations.map((conversation) => <DropdownMenuItem key={conversation.id} onSelect={() => void selectConversation(conversation.id)} className="min-w-0"><span className="min-w-0 flex-1 truncate">{conversation.title}</span><span className="shrink-0 text-[10px] text-[var(--muted-foreground)]">{formatRelativeTime(conversation.updatedAt, relativeNow)}</span></DropdownMenuItem>)}{conversationId && <><DropdownMenuSeparator/><DropdownMenuItem onSelect={() => void clearCurrentConversation()} disabled={clearing} className="text-rose-300 focus:text-rose-200"><Trash2 className="size-4"/>{clearing ? "Deleting…" : "Delete conversation"}</DropdownMenuItem></>}</DropdownMenuContent></DropdownMenu>
      <button type="button" onClick={() => void startConversation()} disabled={starting || sending} className="grid size-9 shrink-0 place-items-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)] disabled:pointer-events-none disabled:opacity-50" aria-label="Start a new chat" title="Start a new chat"><MessageSquarePlus className="size-4"/></button>
    </div>

    <div ref={messagesViewportRef} onScroll={handleMessagesScroll} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite">
      {!messages.length && !conversationError && <p className="text-sm text-[var(--muted-foreground)]">{`Start a conversation about ${page}.`}</p>}
      {conversationError && <div role="alert" className="flex items-start gap-3 rounded-xl bg-[var(--muted)] px-3.5 py-2.5 text-sm leading-6 text-[var(--muted-foreground)]"><p className="min-w-0 flex-1 whitespace-pre-wrap">{conversationError}</p><button type="button" onClick={() => void copyConversationError()} className="flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-medium hover:bg-[var(--accent)] hover:text-[var(--foreground)]" aria-label="Copy error" title="Copy error"><Copy className="size-3"/>{errorCopied ? "Copied" : "Copy"}</button></div>}
      {messages.map((message, index) => <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${message.role === "user" ? "rounded-br-md bg-[var(--primary)] text-[var(--primary-foreground)]" : "rounded-bl-md bg-[var(--muted)]"}`}><AssistantMessage content={message.content}/>{message.proposal && proposalStorageKey && <Link href="/plan/" onClick={(event) => { event.preventDefault(); reviewProposal(); }} className="mt-3 inline-flex min-h-10 items-center rounded-xl bg-[var(--primary)] px-3 text-xs font-semibold text-[var(--primary-foreground)] hover:opacity-90">Review suggested plan</Link>}</div></div>)}
      {sending && <div className="flex justify-start" role="status" aria-label={`${provider} is thinking`}><div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-[var(--muted)] px-4 py-3"><span className="size-1.5 animate-bounce rounded-full bg-[var(--muted-foreground)] [animation-delay:-0.2s]"/><span className="size-1.5 animate-bounce rounded-full bg-[var(--muted-foreground)] [animation-delay:-0.1s]"/><span className="size-1.5 animate-bounce rounded-full bg-[var(--muted-foreground)]"/></div></div>}
      <div ref={messagesEndRef} aria-hidden="true" />
    </div>

    <div className="shrink-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      {messages.length === 0 && <div className="mb-3 flex flex-wrap gap-2">{suggestions.map((suggestion) => <button key={suggestion} onClick={() => void send(suggestion)} disabled={sending} className="rounded-full bg-[var(--muted)] px-3 py-1.5 text-xs text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)] disabled:pointer-events-none disabled:opacity-50">{suggestion}</button>)}</div>}
      <form onSubmit={submit} className="flex items-end gap-2 rounded-2xl border border-transparent bg-[var(--muted)] p-2 pl-3 transition-shadow focus-within:border-transparent focus-within:ring-2 focus-within:ring-[color-mix(in_srgb,var(--ring)_55%,transparent)]">
        <label htmlFor={mobile ? "mobile-assistant-prompt" : "desktop-assistant-prompt"} className="sr-only">Ask {provider}</label>
        <textarea ref={inputRef} id={mobile ? "mobile-assistant-prompt" : "desktop-assistant-prompt"} rows={1} value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={handleKeyDown} placeholder="Ask about this page…" className="assistant-prompt max-h-28 min-h-9 flex-1 resize-none border-0 bg-transparent py-2 text-base !outline-none !ring-0 !shadow-none placeholder:text-[var(--muted-foreground)] focus:border-0 focus:!outline-none focus:!ring-0 focus:!shadow-none focus-visible:!outline-none focus-visible:!ring-0 sm:text-sm"/>
        <Button type="submit" size="icon" disabled={!prompt.trim() || sending} aria-label="Send prompt" className="size-9 min-h-9 shrink-0 rounded-xl"><ArrowUp/></Button>
      </form>
      {mobile && <Button variant="ghost" onClick={onClose} className="mt-3 h-10 w-full rounded-xl bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]"><X className="size-4"/>Hide {provider}</Button>}
      <p className="mt-2 text-center text-[10px] text-[var(--muted-foreground)]">Conversations are stored securely for 30 days</p>
    </div>
  </section>;
}
