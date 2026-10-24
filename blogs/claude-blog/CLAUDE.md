# Claude Blog - Blog Creation & Optimization Skill

## Project Overview

This repository contains **Claude Blog**, a Tier 4 Claude Code skill for blog content
creation, optimization, and management. It follows the Agent Skills open standard and the
3-layer architecture (directive, orchestration, execution). 19 sub-skills, 4 specialized
subagents, and 12 content templates are dual-optimized for Google rankings (December 2025
Core Update, E-E-A-T) and AI citations (GEO/AEO).

## Architecture

```
claude-blog/
  CLAUDE.md                          # Project instructions (this file)
  .claude-plugin/plugin.json         # Plugin manifest (v1.5.0)
  .mcp.json                          # MCP server configuration (nanobanana-mcp)
  pyproject.toml                     # Python packaging (3.11+)
  skills/                            # 19 sub-skills (blog/ is the orchestrator)
    blog/SKILL.md                   # Main orchestrator, routing, scoring
      references/                   # 12 on-demand knowledge files
      templates/                    # 12 content templates
      scripts/                     # Python analysis scripts
    blog-write/SKILL.md            # Write new articles from scratch
    blog-rewrite/SKILL.md         # Optimize existing blog posts
    blog-analyze/SKILL.md         # 5-category 100-point scoring
    blog-brief/SKILL.md           # Detailed content briefs
    blog-outline/SKILL.md         # SERP-informed outlines
    blog-calendar/SKILL.md        # Editorial calendars
    blog-strategy/SKILL.md        # Blog positioning and planning
    blog-seo-check/SKILL.md      # Post-writing SEO validation
    blog-schema/SKILL.md          # JSON-LD schema generation
    blog-chart/SKILL.md           # Inline SVG data visualizations
    blog-repurpose/SKILL.md       # Multi-platform repurposing
    blog-geo/SKILL.md             # AI citation optimization
    blog-audit/SKILL.md           # Full-site blog health assessment
    blog-image/                    # AI image generation via Gemini
      SKILL.md                    # Image generation sub-skill
      references/                 # 3 reference docs (models, tools, prompts)
      scripts/                    # MCP setup and validation scripts
    blog-cannibalization/SKILL.md # Keyword overlap detection
    blog-factcheck/SKILL.md       # Statistics verification
    blog-persona/SKILL.md         # Writing persona management
    blog-taxonomy/SKILL.md        # CMS taxonomy management
  agents/                            # 4 specialized subagents
    blog-researcher.md              # Statistics and source research
    blog-writer.md                  # Content generation
    blog-seo.md                     # SEO validation
    blog-reviewer.md                # Quality scoring
  tests/                             # 44 pytest tests + CI config
```

## Commands

| Command | Purpose |
|---------|---------|
| `/blog write` | Write new articles optimized for rankings + AI citations |
| `/blog rewrite` | Optimize existing posts with sourced statistics |
| `/blog analyze` | 5-category 100-point scoring with AI detection |
| `/blog brief` | Detailed content briefs with competitive analysis |
| `/blog outline` | SERP-informed outlines with heading hierarchy |
| `/blog calendar` | Editorial calendars with topic clusters |
| `/blog strategy` | Blog positioning and content planning |
| `/blog seo-check` | Post-writing SEO validation checklist |
| `/blog schema` | JSON-LD schema markup generation |
| `/blog chart` | Inline SVG data visualization charts |
| `/blog repurpose` | Multi-platform content repurposing |
| `/blog geo` | AI citation optimization audit |
| `/blog image` | AI image generation and editing via Gemini |
| `/blog audit` | Full-site blog health assessment |
| `/blog cannibalization` | Detect keyword overlap across posts |
| `/blog factcheck` | Verify statistics against cited sources |
| `/blog persona` | Manage writing personas and voice profiles |
| `/blog taxonomy` | Tag/category CMS management |

## Development Rules

- Keep SKILL.md files under 500 lines / 5000 tokens
- Reference files should be focused and under 200 lines
- Scripts must have docstrings, CLI interface, and JSON output
- Follow kebab-case naming for all skill directories
- Agents invoked via Task tool with `context: fork`, never via Bash
- Python 3.11+ required; dependencies in pyproject.toml
- Test with `python -m pytest tests/` after changes
