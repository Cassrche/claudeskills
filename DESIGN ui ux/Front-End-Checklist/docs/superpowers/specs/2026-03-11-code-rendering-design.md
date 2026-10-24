# Shared Code Rendering Design

## Goal

Route every inline code token and block/command code surface in the web app through one shared implementation so styling, copy behavior, and future changes come from a single place.

## Scope

- Add canonical-url `InlineCode` and `CodeSurface` primitives in `apps/web/components/content/code/code.tsx`
- Keep `mdx-components` as the adapter for MDX-authored `code` and `pre`
- Refactor app-authored command/config surfaces to use the same primitives
- Preserve existing prose and rehype-pretty-code behavior

## Decisions

### Inline code

Use `InlineCode` for any JSX-authored inline code token and for MDX inline code when the node is not a fenced block code element.

### Block and command code

Use `CodeSurface` for:

- fenced MDX blocks
- install commands
- MCP config snippets
- standalone command examples

`CodeSurface` owns the wrapper, copy affordance, and pre/code markup.

### MDX boundary

MDX `pre` maps to `CodeSurface`.
MDX `code` maps to `InlineCode` only for inline code. Block-code nodes keep raw `<code>` markup inside the shared surface so rehype-pretty-code attributes continue to work.

## Expected outcome

- One implementation source for code rendering in the app
- No bespoke install-command markup path
- No raw app-level `<pre><code>` or `<code className="code-inline">` outside the shared primitives and MDX adapter
