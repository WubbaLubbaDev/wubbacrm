# Component Styling Patterns

Exact Tailwind class recipes for all UI primitives. Build from scratch using plain React + Tailwind classes, copying from shadcn's new-york-v4 source.

## Approach

**Do NOT install:** `shadcn` CLI, `radix-ui`, `@radix-ui/*`, `class-variance-authority`.
**DO install:** `clsx` + `tailwind-merge` (for `cn()`), `lucide-react` (for icons).

For variant management (button variants, badge variants), use a simple inline pattern instead of `cva`:

```tsx
const variants = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  outline: "border bg-background shadow-xs hover:bg-accent ...",
  ...
} as const;
```

## `cn()` utility (`src/lib/utils.ts`)

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

## Button (`src/components/ui/button.tsx`)

Base classes (all variants):
```
inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4
```

Variants:
| variant | classes |
|---|---|
| default | `bg-primary text-primary-foreground hover:bg-primary/90` |
| destructive | `bg-destructive text-white hover:bg-destructive/90` |
| outline | `border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground` |
| secondary | `bg-secondary text-secondary-foreground hover:bg-secondary/80` |
| ghost | `hover:bg-accent hover:text-accent-foreground` |
| link | `text-primary underline-offset-4 hover:underline` |

Sizes:
| size | classes |
|---|---|
| default | `h-9 px-4 py-2 has-[>svg]:px-3` |
| sm | `h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5` |
| lg | `h-10 rounded-md px-6 has-[>svg]:px-4` |
| icon | `size-9` |

## Card (`src/components/ui/card.tsx`)

| Sub-component | Classes |
|---|---|
| Card | `flex flex-col gap-6 rounded-xl border bg-card py-6 text-card-foreground shadow-sm` |
| CardHeader | `grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6` |
| CardTitle | `leading-none font-semibold` |
| CardDescription | `text-sm text-muted-foreground` |
| CardAction | `col-start-2 row-span-2 row-start-1 self-start justify-self-end` |
| CardContent | `px-6` |
| CardFooter | `flex items-center px-6 [.border-t]:pt-6` |

## Input (`src/components/ui/input.tsx`)

```
h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm
focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50
aria-invalid:border-destructive aria-invalid:ring-destructive/20
```

## Label (`src/components/ui/label.tsx`)

```
flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50
```

(Use a native `<label>` element — no Radix needed.)

## Badge (`src/components/ui/badge.tsx`)

Base: `inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-[color,box-shadow] [&>svg]:pointer-events-none [&>svg]:size-3`

Variants:
| variant | classes |
|---|---|
| default | `bg-primary text-primary-foreground` |
| secondary | `bg-secondary text-secondary-foreground` |
| destructive | `bg-destructive text-white` |
| outline | `border-border text-foreground` |

## Table (`src/components/ui/table.tsx`)

| Sub-component | Classes |
|---|---|
| Table (wrapper div) | `relative w-full overflow-x-auto` |
| Table (table) | `w-full caption-bottom text-sm` |
| TableHeader | `[&_tr]:border-b` |
| TableBody | `[&_tr:last-child]:border-0` |
| TableFooter | `border-t bg-muted/50 font-medium [&>tr]:last:border-b-0` |
| TableRow | `border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted` |
| TableHead | `h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0` |
| TableCell | `p-2 align-middle [&:has([role=checkbox])]:pr-0` |

## Separator (`src/components/ui/separator.tsx`)

Simple `<div>` — no Radix needed:
- Horizontal: `shrink-0 h-px w-full bg-border`
- Vertical: `shrink-0 h-full w-px bg-border`

Props: `{ orientation?: "horizontal" | "vertical", className }`.

## Skeleton (`src/components/ui/skeleton.tsx`)

```
animate-pulse rounded-md bg-accent
```

## Avatar (`src/components/ui/avatar.tsx`)

Without Radix, use native `<img>` with fallback:
- Avatar container: `relative flex size-8 shrink-0 overflow-hidden rounded-full select-none`
- AvatarImage: `aspect-square size-full object-cover`
- AvatarFallback: `flex size-full items-center justify-center rounded-full bg-muted text-sm text-muted-foreground`

Implement fallback by catching image `onError` and swapping to initials/text.

## Breadcrumb (`src/components/ui/breadcrumb.tsx`)

| Sub-component | Classes |
|---|---|
| Breadcrumb | `<nav aria-label="breadcrumb">` |
| BreadcrumbList | `flex flex-wrap items-center gap-1.5 text-sm break-words text-muted-foreground sm:gap-2.5` |
| BreadcrumbItem | `inline-flex items-center gap-1.5` |
| BreadcrumbLink | `transition-colors hover:text-foreground` |
| BreadcrumbPage | `font-normal text-foreground` |
| BreadcrumbSeparator | Render `<ChevronRight />` from lucide-react with `[&>svg]:size-3.5` |

## ScrollArea (`src/components/ui/scroll-area.tsx`)

Skip Radix. Use a simple scrollable div with custom scrollbar styling:
```
relative overflow-auto
[&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border
```

## Empty State

```
flex flex-col items-center justify-center gap-3 py-12 text-center
```
- Icon: `size-12 text-muted-foreground/50`
- Title: `text-sm font-medium`
- Description: `text-sm text-muted-foreground`

## Toast (minimal hand-built)

1. Create a `ToastContext` in `src/components/ui/toast.tsx`
2. Render toasts in a fixed container: `fixed bottom-4 right-4 z-50 flex flex-col gap-2`
3. Each toast: `flex items-center gap-3 rounded-md border bg-popover p-4 text-popover-foreground shadow-md`
4. Auto-dismiss after 3s with `setTimeout`

Alternatively, `sonner` is the lightest toast library (1.2kB, no Radix dependency).

## Chat Components (Customer Chat with AI Companion)

Chat UI components for the public-facing AI companion widget. These are NOT dashboard components — they live in `src/components/chat/` and are used on public routes (no auth required).

### ChatWidget (`src/components/chat/chat-widget.tsx`)

Floating button + overlay container. Manages open/closed state.

| Part | Classes |
|---|---|
| Floating button (closed) | `fixed bottom-4 right-4 z-50 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:bg-primary/90` |
| Overlay backdrop | `fixed inset-0 z-50 bg-black/50 sm:bg-transparent` |
| Chat container (mobile) | `fixed inset-0 z-50 flex flex-col bg-background` |
| Chat container (desktop) | `fixed bottom-20 right-4 z-50 flex h-[600px] w-[400px] flex-col rounded-xl border bg-card shadow-xl` |

Use `MessageCircle` icon from lucide-react for the floating button.

### ChatWindow (`src/components/chat/chat-window.tsx`)

Full chat container: header + message list + input. Manages session, streaming, scroll.

| Part | Classes |
|---|---|
| Window | `flex h-full flex-col` |
| Header | `flex items-center justify-between border-b px-4 py-3` |
| Header title | `text-sm font-semibold` |
| Header close button | `size-8 rounded-md hover:bg-accent` (ghost button) |
| Message list | `flex-1 overflow-y-auto px-4 py-4 space-y-4` (use ScrollArea pattern) |
| Input area | `border-t p-4` |

Auto-scroll to bottom on new messages: use a `ref` on the message list bottom and `scrollIntoView({ behavior: 'smooth' })`.

### ChatMessage (`src/components/chat/chat-message.tsx`)

Single message bubble. Handles alignment, avatar, markdown rendering.

| Role | Container classes | Bubble classes |
|---|---|---|
| user | `flex justify-end` | `max-w-[80%] rounded-2xl rounded-br-md bg-primary px-3 py-2 text-sm text-primary-foreground` |
| assistant | `flex justify-start gap-2` | `max-w-[80%] rounded-2xl rounded-bl-md bg-muted px-3 py-2 text-sm text-foreground` |

AI avatar (optional): `size-6 shrink-0 rounded-full bg-primary/10 flex items-center justify-center` with a `Bot` icon from lucide-react.

For markdown rendering inside AI messages, install `react-markdown` and render with `prose prose-sm max-w-none` classes (or render plain text for simplicity).

### ChatInput (`src/components/chat/chat-input.tsx`)

Auto-resizing textarea + send button. Enter to send, Shift+Enter for newline.

| Part | Classes |
|---|---|
| Container | `flex items-end gap-2` |
| Textarea | `flex-1 min-h-[40px] max-h-[120px] resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50` |
| Send button | Use Button component with `size="icon"` variant `"default"`. `Send` icon from lucide-react. Disabled when input is empty or streaming. |

Auto-resize: adjust `style.height` on input change up to `max-h-[120px]`, then scroll.

### TypingIndicator (`src/components/chat/typing-indicator.tsx`)

Three-dot animated bouncing indicator. Shown before first token arrives.

```
flex items-center gap-1 px-3 py-2
```

Each dot: `size-2 rounded-full bg-muted-foreground/50 animate-bounce` with staggered `style={{ animationDelay: '0ms' | '150ms' | '300ms' }}`.

### ChatSuggestions (`src/components/chat/chat-suggestions.tsx`)

Optional: suggested questions shown in empty state (no messages yet).

| Part | Classes |
|---|---|
| Container | `flex flex-col gap-2 py-2` |
| Suggestion button | `rounded-lg border bg-background px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-accent` |

### use-chat Hook (`src/components/chat/use-chat.ts`)

Custom hook managing chat state: messages array, streaming state, session token, sending logic.

Key state:
- `messages: { role: 'user' | 'assistant', content: string }[]`
- `isStreaming: boolean`
- `sessionToken: string` (from `sessionStorage`, generated as `crypto.randomUUID()` if not present)
- `sendMessage(text: string): Promise<void>` — adds user message, calls Edge Function, streams tokens into assistant message

See the feature brief for the streaming implementation pattern.

## Integration Components

Added for the Google Calendar Integration feature. All files live in `src/components/integrations/`.

### IntegrationCard (`src/components/integrations/integration-card.tsx`)

A Card variant for listing available integrations on the Integrations page. Uses the existing Card component as base.

Props:
```typescript
interface IntegrationCardProps {
  icon: React.ComponentType<{ className?: string }>  // lucide-react icon
  name: string
  description: string
  status: "connected" | "disconnected" | "error"
  href: string  // TanStack Router Link target
}
```

Layout:
```
Card
├── CardHeader (flex row: icon + name/description on left, status badge on right)
│   ├── Icon (size-8, text-foreground)
│   ├── div (flex-col gap-0.5)
│   │   ├── CardTitle (text-base)
│   │   └── CardDescription
│   └── Badge (status: connected=secondary, disconnected=outline, error=destructive)
├── CardContent (optional — connection details or empty)
└── CardFooter
    └── Button (variant="outline", size="sm") as Link → "Manage" or "Connect"
```

Key classes:
- Icon container: `flex size-10 items-center justify-center rounded-lg bg-muted`
- Status badge: use existing Badge component with variant mapping

### ConnectButton (`src/components/integrations/connect-button.tsx`)

A Button variant that triggers the OAuth redirect flow. Uses the existing Button component.

```tsx
import { Button } from "@/components/ui/button"
import { initiateOAuthFlow } from "@/lib/google-oauth"

export function ConnectButton() {
  return (
    <Button onClick={initiateOAuthFlow} className="gap-2">
      <PlugIcon className="size-4" />
      Connect Google Calendar
    </Button>
  )
}
```

- Uses `default` variant (black background in the B&W theme)
- Icon: `Plug` or `CalendarPlus` from lucide-react
- On click: calls `initiateOAuthFlow()` which stores state in sessionStorage and redirects to Google

### DisconnectButton (`src/components/integrations/disconnect-button.tsx`)

A Button variant for disconnecting an integration. Uses `destructive` or `outline` variant.

```tsx
<Button variant="outline" onClick={handleDisconnect} className="text-destructive">
  <UnplugIcon className="size-4" />
  Disconnect
</Button>
```

### CalendarSelector (`src/components/integrations/calendar-selector.tsx`)

A dropdown/select for choosing which Google Calendar to sync with. Build using a native `<select>` styled with Tailwind (or a custom dropdown using Button + popover pattern if needed).

```tsx
<select className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50">
  <option value="">Select a calendar...</option>
  {calendars.map(c => <option key={c.id} value={c.id}>{c.summary}</option>)}
</select>
```

Use the same focus ring classes as the Input component.

### OAuthCallbackHandler (route component)

Not a reusable component — lives in the callback route file (`callback.tsx`). Handles:
1. Reading `code` and `state` URL params
2. Validating state against sessionStorage
3. Calling the Edge Function to exchange code
4. Showing loading/error/success states

States to render:
- Loading: `flex flex-col items-center justify-center gap-3 py-12` with a spinner (Loader2 icon with `animate-spin`)
- Error: use EmptyState pattern with `text-destructive` and a retry Button
- Success: auto-navigate to the Google Calendar settings page

## Cross-References

- Color tokens referenced by these classes: see `color-system.md`
- Spacing/radius/shadow tokens: see `spacing-layout.md`
- Typography classes (text-sm, font-semibold, etc.): see `typography.md`
- Layout components (sidebar, header, settings sub-sidebar): see `layout-patterns.md`
- File naming conventions (kebab-case files, PascalCase components): see `../setup/project-structure.md`
- Google Calendar integration full brief: see `../features/google-calendar-integration-brief.md`

## Sources

- shadcn/ui new-york-v4 component source: https://github.com/shadcn-ui/ui/tree/main/apps/v4/registry/new-york-v4/ui
- shadcn/ui button source: https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/new-york-v4/ui/button.tsx
- shadcn/ui card source: https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/new-york-v4/ui/card.tsx
- shadcn/ui input source: https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/new-york-v4/ui/input.tsx
- shadcn/ui badge source: https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/new-york-v4/ui/badge.tsx
- shadcn/ui table source: https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/new-york-v4/ui/table.tsx
- shadcn/ui sidebar source: https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/new-york-v4/ui/sidebar.tsx
- shadcn/ui button docs: https://ui.shadcn.com/docs/components/button
- shadcn/ui card docs: https://ui.shadcn.com/docs/components/card
- shadcn/ui theme builder: https://ui.shadcn.com/create