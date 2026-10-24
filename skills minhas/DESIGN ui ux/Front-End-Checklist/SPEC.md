# Front-End Checklist Rule Specification

> A comprehensive guide for creating, structuring, and maintaining rules in the Front-End Checklist.

## Table of Contents

- [Overview](#overview)
- [Content Philosophy](#content-philosophy)
- [Frontmatter Schema](#frontmatter-schema)
- [Content Structure](#content-structure)
- [MDX Components](#mdx-components)
- [Code Examples](#code-examples)
- [Writing Style Guide](#writing-style-guide)
- [Terminology Glossary](#terminology-glossary)
- [Anti-Patterns](#anti-patterns)
- [Page Rendering](#page-rendering)

---

## Overview

Each rule in the Front-End Checklist is an MDX file containing frontmatter metadata and structured content. Rules are designed to be:

- **Actionable**: Clear guidance on what to do
- **Opinionated**: Recommend specific tools and approaches
- **Proportional**: Content depth matches rule complexity
- **Progressive**: Accept minimal contributions, enhance over time

### Rule Lifecycle

1. Rule submitted to contribution repository
2. Synced to frontendchecklist.io
3. Rendered with consistent UI components
4. Progressively enhanced with community feedback

---

## Content Philosophy

### Verification Approach

**Be opinionated.** Don't just explain what to check—recommend specific tools and methods.

```mdx
<!-- ✅ Good: Specific recommendation -->
Use [axe DevTools](https://www.deque.com/axe/) to automatically detect missing alt text.

<!-- ❌ Bad: Vague guidance -->
You can use various accessibility testing tools to check this.
```

### Framework Coverage

**Dynamic based on rule needs.** Not every rule needs framework examples.

| Rule Type | Framework Examples |
|-----------|-------------------|
| Semantic HTML (doctype, charset) | None needed |
| Component patterns (modals, forms) | React, Vue, Next.js |
| CMS-specific (alt text, SEO) | Add WordPress, Shopify, etc. |
| CSS patterns | Show with/without Tailwind based on context |

### Content Length

**Proportional to complexity.** Simple rules can be concise; complex rules should be comprehensive.

| Complexity | Expected Length | Sections Required |
|------------|----------------|-------------------|
| Simple (charset, doctype) | 50-100 lines | Basic implementation, Why It Matters |
| Medium (form validation) | 100-200 lines | + Framework examples, Testing |
| Complex (alt text, a11y) | 200-400 lines | + Advanced patterns, Edge cases, Multiple testing approaches |

### Handling Nuance

**Acknowledge tradeoffs.** When rules have legitimate exceptions, document them using the `<Exceptions>` component.

---

## Frontmatter Schema

### Required Fields

```yaml
---
title: string           # Action-oriented title (e.g., "Add descriptive alt text to all images")
description: string     # One sentence explaining the rule
categories: string[]    # Primary + secondary categories
priority: enum          # 'critical' | 'high' | 'medium' | 'low'
prompts:                # AI assistant prompts
  check: string         # Prompt to verify compliance
  fix: string           # Prompt to fix issues
  explain: string       # Prompt to explain the concept
---
```

### Optional Fields

```yaml
---
subcategory: string     # Grouping within category (see predefined list below)
difficulty: enum        # 'beginner' | 'intermediate' | 'advanced'
estimatedTime: number   # Minutes to implement (5, 10, 15, 30, 60)
tools:                  # Max 3-4 curated tools
  - name: string
    url: string | null
tldr: string[]          # Quick reference points (supports multiple formats)
whyItMatters: string    # Single sentence motivation
---
```

### Predefined Subcategories

| Category | Subcategories |
|----------|---------------|
| HTML | `document-structure`, `meta`, `forms`, `media`, `navigation`, `components`, `semantics`, `best-practices`, `performance`, `security`, `setup`, `interaction`, `metrics`, `optimization` |
| CSS | `layout`, `typography`, `animation`, `responsive`, `loading`, `optimization`, `design-tokens`, `best-practices`, `performance`, `keyboard`, `formats` |
| JavaScript | `async`, `loading`, `optimization`, `best-practices`, `performance`, `patterns`, `variables`, `quality`, `security`, `events`, `modules`, `storage` |
| Accessibility | `visual`, `keyboard`, `screen-readers`, `aria`, `interaction`, `components`, `forms`, `media`, `content`, `document-structure`, `animation` |
| Performance | `loading`, `rendering`, `caching`, `assets`, `metrics`, `web-vitals` |
| SEO | `meta-tags`, `content`, `technical`, `social` |
| Images | `optimization`, `formats`, `responsive`, `loading`, `accessibility` |
| Security | `headers`, `forms`, `authentication`, `data`, `transport`, `privacy` |
| Testing | `unit`, `integration`, `e2e`, `visual`, `mobile`, `performance`, `best-practices` |
| General | `setup`, `best-practices`, `documentation` |

### Priority Guidelines

| Priority | Criteria | Examples |
|----------|----------|----------|
| **Critical** | WCAG A violations, security risks, broken functionality | alt text, HTTPS, doctype |
| **High** | WCAG AA, significant UX/perf impact | color contrast, lazy loading |
| **Medium** | Best practices, optimization | meta description, CSS minification |
| **Low** | Nice-to-have, edge cases | social cards, print styles |

---

## Content Structure

### Template-Based Sections

Rules should follow this heading structure. Include sections based on rule complexity.

```mdx
---
[frontmatter]
---

[Opening paragraph - 1-2 sentences introducing the rule]

<Tip>
[Key insight or common misconception]
</Tip>

## Basic Implementation

[Minimal code to implement the rule correctly]

## Guidelines

### [Variant 1]
[Code examples with ✅ Good / ❌ Bad patterns]

### [Variant 2]
[Additional scenarios]

<Warning title="Common Pitfall">
[Important gotcha to avoid]
</Warning>

## Framework Examples

<CodeTabs defaultTab="react">
  [Framework-specific implementations]
</CodeTabs>

## Advanced Patterns

[Complex scenarios, edge cases]

<Exceptions>
[Valid reasons to break this rule]
</Exceptions>

## Testing & Validation

### Automated Testing
<CodeTabs>
  [Test examples for Jest, Cypress, Playwright, Vitest]
</CodeTabs>

### Manual Testing
[Steps for human verification]

<Success title="Best Practice">
[Recommended approach summary]
</Success>

## Common Mistakes to Avoid

<ErrorBox title="[Mistake description]">
[Why it's wrong]
</ErrorBox>

[Code showing bad → good]
```

### TLDR Formats

The `tldr` field supports multiple formats based on rule needs:

#### Bullet Points (Default)
```yaml
tldr:
  - Use descriptive alt text for informative images
  - Use empty alt="" for decorative images
  - Describe function, not appearance, for icons
```

#### Decision Tree
```yaml
tldr:
  - "Is the image informative? → Add descriptive alt text"
  - "Is it purely decorative? → Use alt=\"\""
  - "Is it a functional icon? → Describe the action"
```

#### Quick Reference Table
```yaml
tldr:
  - "Informative: alt=\"Description of content\""
  - "Decorative: alt=\"\" role=\"presentation\""
  - "Functional: alt=\"Action verb\""
```

---

## MDX Components

### Available Components

| Component | Purpose | Usage |
|-----------|---------|-------|
| `<Tip>` | Helpful insight, best practice | General guidance |
| `<Warning>` | Important gotcha, common mistake | Risk awareness |
| `<ErrorBox>` | Anti-pattern with explanation | What NOT to do |
| `<Success>` | Recommended approach | Positive reinforcement |
| `<Exceptions>` | Valid reasons to break the rule | Nuance handling |
| `<CodeTabs>` | Multi-framework code examples | Framework comparison |
| `<Tab>` | Individual tab within CodeTabs | Framework-specific code |

### Callout Guidelines

**Soft limit: 3-4 callouts per rule.** More than this creates visual noise.

```mdx
<!-- ✅ Good: Focused callouts -->
<Tip>Screen readers announce "image" before alt text.</Tip>

<Warning title="Common Pitfall">
Don't prefix with "Image of" - it creates redundancy.
</Warning>

<!-- ❌ Bad: Too many callouts -->
<Tip>...</Tip>
<Warning>...</Warning>
<Tip>...</Tip>
<ErrorBox>...</ErrorBox>
<Warning>...</Warning>
<Success>...</Success>
```

**Consolidate related warnings:**

```mdx
<!-- ✅ Good: Grouped warnings -->
<Warning title="Common Mistakes">
- Don't use "Image of" prefixes
- Don't use filenames as alt text
- Don't skip alt for informative images
</Warning>
```

### Exceptions Component

Use when rules have legitimate counter-arguments:

```mdx
<Exceptions>
- **Performance-critical animations**: May skip `prefers-reduced-motion` for essential UI feedback
- **Legacy browser support**: IE11 may require fallback approaches
- **Third-party embeds**: Cannot control alt text in iframe content
</Exceptions>
```

### CodeTabs Usage

```mdx
<CodeTabs defaultTab="react">
  <Tab value="react" label="React">

```jsx
// React implementation
```

  </Tab>
  <Tab value="nextjs" label="Next.js">

```jsx
// Next.js implementation
```

  </Tab>
  <Tab value="vue" label="Vue.js">

```vue
// Vue implementation
```

  </Tab>
</CodeTabs>
```

### CodeTabs Conventions by Type

Different content types have different tab ordering conventions:

#### Framework Examples (Default)

For component implementations and framework-specific code:

```mdx
<CodeTabs defaultTab="react">
  <Tab value="react" label="React">...</Tab>
  <Tab value="nextjs" label="Next.js">...</Tab>
  <Tab value="vue" label="Vue.js">...</Tab>
</CodeTabs>
```

**Order**: React → Next.js → Vue.js (by ecosystem adoption)

#### Testing Framework Examples

For test implementations and testing patterns:

```mdx
<CodeTabs defaultTab="playwright">
  <Tab value="playwright" label="Playwright">...</Tab>
  <Tab value="vitest" label="Vitest">...</Tab>
  <Tab value="jest" label="Jest">...</Tab>
  <Tab value="cypress" label="Cypress">...</Tab>
</CodeTabs>
```

**Order**: Playwright → Vitest → Jest → Cypress (by modern adoption)

#### CMS/Platform Examples

For platform-specific implementations (Shopify, WordPress, etc.):

```mdx
<CodeTabs defaultTab="shopify">
  <Tab value="shopify" label="Shopify">...</Tab>
  <Tab value="wordpress" label="WordPress">...</Tab>
</CodeTabs>
```

**Order**: Alphabetical by platform name

#### Build Tools/CI Examples

For build configuration and CI/CD pipelines:

```mdx
<CodeTabs defaultTab="vite">
  <Tab value="vite" label="Vite">...</Tab>
  <Tab value="webpack" label="Webpack">...</Tab>
  <Tab value="lighthouse" label="Lighthouse CI">...</Tab>
</CodeTabs>
```

**Order**: Modern tools first (Vite before Webpack, ESBuild before Rollup)

---

## Code Examples

### Styling Approach

**Context-dependent.** Use the appropriate styling approach based on rule type.

| Rule Type | Styling Approach |
|-----------|-----------------|
| Semantic HTML, Accessibility | Vanilla HTML/CSS (focus on structure) |
| UI Components, Layout | Tailwind CSS (modern, practical) |
| CSS-specific rules | Both vanilla and Tailwind variants |

```mdx
<!-- Semantic/A11y rule: Vanilla HTML -->
```html
<img src="photo.jpg" alt="Team celebrating project launch">
```

<!-- UI Component rule: With Tailwind -->
```jsx
<button
  className="px-4 py-2 bg-blue-600 text-white rounded-lg
             hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
  aria-pressed={isActive}
>
  Toggle Feature
</button>
```
```

### Code Comparison Styles

#### Inline Comments (Simple Cases)

```html
<!-- ✅ Good: Descriptive alt text -->
<img src="chart.png" alt="Sales increased 25% in Q2">

<!-- ❌ Bad: Generic alt text -->
<img src="chart.png" alt="Chart image">
```

#### Visual Diff Component (Complex Refactors)

For significant before/after transformations, use side-by-side comparison:

```mdx
<CodeComparison>
  <Before>
```html
<div onclick="handleClick()">
  <img src="icon.png">
  Click me
</div>
```
  </Before>
  <After>
```html
<button type="button" onClick={handleClick}>
  <img src="icon.png" alt="" role="presentation" />
  Click me
</button>
```
  </After>
</CodeComparison>
```

### Testing Examples

Provide tests for multiple frameworks. Prioritize:

1. **Jest/Vitest** - Unit tests
2. **Playwright** - E2E tests
3. **Cypress** - E2E alternative
4. **axe-core** - Accessibility-specific

---

## Writing Style Guide

### Voice & Tone

- **Active voice**: "Add alt text" not "Alt text should be added"
- **Direct address**: "You should" or imperative "Add..."
- **Confident but not arrogant**: State best practices, acknowledge exceptions
- **Concise**: Every sentence should add value

### Sentence Structure

```mdx
<!-- ✅ Good: Direct and actionable -->
All images must have appropriate alternative text.

<!-- ❌ Bad: Passive and wordy -->
It is recommended that alternative text be provided for images in order to ensure accessibility.
```

### Technical Accuracy

- Use precise technical terms
- Cite specifications when relevant (WCAG, HTML spec)
- Include version numbers for evolving standards

```mdx
<!-- ✅ Good: Specific reference -->
This rule addresses WCAG 2.1 Success Criterion 1.1.1 (Non-text Content).

<!-- ❌ Bad: Vague reference -->
This helps with accessibility requirements.
```

### Inclusive Language

- **Disability**: Use person-first or identity-first based on community preference
- **Users**: Refer to specific user groups, not "normal users"
- **Ability**: Avoid ableist language ("see below", "blind to")

```mdx
<!-- ✅ Good -->
Screen reader users will hear...
Users with low vision benefit from...
Keyboard users can navigate by...

<!-- ❌ Bad -->
Blind people need...
Normal users won't notice...
If you can see the screen...
```

---

## Terminology Glossary

### Technical Terms

| Preferred | Avoid | Reason |
|-----------|-------|--------|
| HTML element | HTML tag | Elements include opening tag, content, closing tag |
| Alternative text / alt text | Alt tag | `alt` is an attribute, not a tag |
| Screen reader | Screenreader | Two words per common usage |
| Assistive technology | AT | Spell out on first use |
| Viewport | Screen size | More accurate for responsive design |

### Accessibility Terms

| Preferred | Avoid | Reason |
|-----------|-------|--------|
| Screen reader users | The blind | Person-first, specific to context |
| Users with low vision | Visually impaired people | More specific, less clinical |
| Keyboard users | People who can't use a mouse | Inclusive of preference, not just disability |
| Cognitive accessibility | Mental disabilities | Broader, less stigmatizing |

### Framework Terms

| Preferred | Context |
|-----------|---------|
| React component | React-specific code |
| Vue component / Vue SFC | Vue-specific code |
| Next.js page/component | Next.js-specific code |
| Web component | Framework-agnostic custom elements |

---

## Anti-Patterns

### Content Anti-Patterns

#### Vague Guidance

```mdx
<!-- ❌ Bad -->
Make sure your images are accessible.

<!-- ✅ Good -->
Add descriptive alt text to all `<img>` elements. Use empty `alt=""` for decorative images.
```

#### Tool Agnosticism When Opinion Helps

```mdx
<!-- ❌ Bad -->
There are many tools available to test this.

<!-- ✅ Good -->
Use [axe DevTools](https://www.deque.com/axe/) for automated detection.
For manual testing, use NVDA (Windows) or VoiceOver (Mac).
```

#### Excessive Framework Coverage

```mdx
<!-- ❌ Bad: Every framework for a simple HTML rule -->
## Framework Examples
[React, Vue, Angular, Svelte, Solid, Qwik, Astro, Remix, Next, Nuxt...]

<!-- ✅ Good: Only when frameworks handle it differently -->
## Framework Examples
[Show only if framework has specific API or gotcha]
```

#### Missing Context for Code

```mdx
<!-- ❌ Bad: Code without explanation -->
```html
<img src="photo.jpg" alt="Team photo" loading="lazy">
```

<!-- ✅ Good: Code with context -->
For images below the fold, add lazy loading to improve initial page load:

```html
<img src="photo.jpg" alt="Team photo" loading="lazy">
```
```

### Structure Anti-Patterns

#### Heading Hierarchy Violations

```mdx
<!-- ❌ Bad: Skipping levels -->
## Implementation
#### Specific Detail  <!-- Skipped h3 -->

<!-- ✅ Good: Sequential hierarchy -->
## Implementation
### Basic Usage
#### Edge Case
```

#### Callout Overload

```mdx
<!-- ❌ Bad: Wall of callouts -->
<Tip>...</Tip>
<Warning>...</Warning>
<Tip>...</Tip>
<Warning>...</Warning>

<!-- ✅ Good: Strategic placement -->
[Content explaining concept]
<Tip>Key insight</Tip>
[More content]
<Warning>Important gotcha</Warning>
```

#### Testing Without Context

```mdx
<!-- ❌ Bad: Test code dump -->
```javascript
test('images have alt', () => { ... })
```

<!-- ✅ Good: Explain what's being tested -->
Verify all images have appropriate alt attributes. Decorative images should have empty alt:

```javascript
test('informative images have descriptive alt', () => { ... })
test('decorative images have empty alt', () => { ... })
```
```

---

## Page Rendering

### Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│ Breadcrumb: Home > Rules > Category > Rule Title        │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────┐ ┌─────────────────┐ │
│ │ Main Content                    │ │ Sidebar         │ │
│ │                                 │ │                 │ │
│ │ Title                   [Done]  │ │ Table of        │ │
│ │ Description                     │ │ Contents        │ │
│ │ [Priority] [Difficulty] [Time]  │ │                 │ │
│ │ [Categories...]                 │ │ - Section 1     │ │
│ │                                 │ │ - Section 2     │ │
│ │ ┌─────────────────────────────┐ │ │ - Section 3     │ │
│ │ │ TL;DR                       │ │ │                 │ │
│ │ │ • Point 1                   │ │ │ ─────────────── │ │
│ │ │ • Point 2                   │ │ │                 │ │
│ │ │ Why: Single sentence        │ │ │ Related Rules   │ │
│ │ └─────────────────────────────┘ │ │                 │ │
│ │                                 │ │ • Related 1     │ │
│ │ [MDX Content...]                │ │ • Related 2     │ │
│ │                                 │ │ • Related 3     │ │
│ │ ─────────────────────────────── │ │                 │ │
│ │                                 │ └─────────────────┘ │
│ │ AI Prompts                      │                     │
│ │ [Check] [Fix] [Explain]         │                     │
│ │                                 │                     │
│ │ ─────────────────────────────── │                     │
│ │                                 │                     │
│ │ Tools & Resources               │                     │
│ │ • Tool 1 ↗                      │                     │
│ │ • Tool 2 ↗                      │                     │
│ └─────────────────────────────────┘                     │
├─────────────────────────────────────────────────────────┤
│                    [AI Prompts FAB]                     │
└─────────────────────────────────────────────────────────┘
```

### UI Components Behavior

#### Priority Indicator
Colored badge with dot: Critical (red), High (orange), Medium (yellow), Low (green)

#### AI Prompts FAB (Floating Action Button)
- Fixed position bottom-right
- Shows all 3 prompts on click (Check, Fix, Explain)
- One-click copy to clipboard
- Doesn't obscure content

#### Table of Contents
- Sticky sidebar on desktop
- Highlights current section
- Depth: h2 and h3 only

#### Related Rules
- Smart suggestions based on content similarity
- Max 5 rules shown
- Falls back to same-category if no similar content

#### Last Updated
- Shown in header area
- Format: "Updated Jan 2025"
- Derived from git history or frontmatter

---

## Appendix

### Minimum Viable Rule

The absolute minimum for a valid rule:

```mdx
---
title: Use the HTML5 doctype
description: The Doctype is HTML5 and is at the top of all your HTML pages.
categories: ['html']
priority: 'critical'
prompts:
  check: "Verify this HTML document has <!DOCTYPE html> at the top."
  fix: "Add <!DOCTYPE html> as the first line of the HTML document."
  explain: "Explain why HTML5 doctype is required for standards mode rendering."
---

The HTML5 doctype must be declared at the very top of every HTML page.

## Basic Implementation

```html
<!DOCTYPE html>
<html lang="en">
  <head>...</head>
  <body>...</body>
</html>
```
```

### Complete Rule Examples

See these comprehensive examples demonstrating all sections and components:

- `/packages/content/rules/en/html/alt-text.mdx` - Demonstrates accessibility rule patterns, testing approaches, and semantic HTML guidance
- `/packages/content/rules/en/images/image-optimization.mdx` - Demonstrates CodeTabs with framework examples (React, Next.js, Vue.js), build tool integration, and performance optimization patterns

---

*Last updated: January 2025*
