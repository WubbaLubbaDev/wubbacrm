# Vite Configuration

Vite build tool configuration, plugin order, Tailwind CSS v4 setup, and BiomeJS config.

## Vite Config

The `@tanstack/router-plugin` must be placed BEFORE `@vitejs/plugin-react` in the plugins array:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
  ],
})
```

## Tailwind CSS v4

No `tailwind.config.js` or `postcss.config.js` needed. The Vite plugin auto-detects template files.

Installation:
```shell
npm install tailwindcss @tailwindcss/vite
```

CSS entry point (e.g., `src/index.css`):
```css
@import "tailwindcss";
```

That's it — the Vite plugin handles scanning and purging automatically.

### Gotcha: Tailwind v4 vs v3

No `tailwind.config.js` needed in v4. Theme is defined in CSS via `@theme inline { ... }`. Don't use the old PostCSS approach.

## BiomeJS Configuration

Biome is a zero-config linter/formatter (Rust-based) replacing ESLint + Prettier.

Installation:
```shell
npm install -D -E @biomejs/biome
npx @biomejs/biome init
```

`biome.json`:
```json
{
  "$schema": "https://biomejs.dev/schemas/2.0.0/schema.json",
  "files": {
    "ignore": [
      "src/routeTree.gen.ts",
      "dist",
      "node_modules"
    ]
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "always"
    }
  }
}
```

**Gotcha:** `routeTree.gen.ts` must be in `files.ignore` — it's auto-generated and should not be linted/formatted. VSCode users should mark it read-only.

## Cross-References

- Project folder layout and package.json scripts: see `project-structure.md`
- Route tree generation: see `tanstack-router.md`
- Tailwind theme tokens (CSS): see `../style/color-system.md` and `../style/spacing-layout.md`

## Sources

- TanStack Router Vite installation: https://tanstack.com/router/v1/docs/installation/with-vite
- Tailwind CSS v4 docs: https://tailwindcss.com/docs
- BiomeJS getting started: https://biomejs.dev/guides/getting-started/
- Tailwind CSS v4 upgrade guide: https://tailwindcss.com/docs/upgrade-guide