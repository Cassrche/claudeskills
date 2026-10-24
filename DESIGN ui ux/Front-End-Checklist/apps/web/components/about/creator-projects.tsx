'use client'

import { SOCIAL } from '@repo/config'
import { GitHubBrandIcon } from '@repo/design-system/brand-icons'
import { ExternalLink, Star, User } from '@repo/design-system/icons'
import { Button } from '@repo/design-system/ui/button'
import { cn } from '@repo/utils'
import type { StaticImageData } from 'next/image'
import Image from 'next/image'
import indieDevToolkitThumb from '@/public/projects/indie-dev-toolkit/indie-dev-toolkit.webp'
// Import thumbnails statically
import llmsTxtHubThumb from '@/public/projects/llms-txt-hub/llms-txt-hub.webp'
import uxPatternsThumb from '@/public/projects/ux-patterns-developers/ux-patterns-developers.webp'

// Creator's other notable projects
const PROJECTS = [
  {
    name: 'llms.txt Hub',
    description: 'A curated directory of websites with llms.txt files for AI-friendly content.',
    websiteUrl: 'https://llmstxthub.com',
    repoPath: 'thedaviddias/llms-txt-hub',
    thumbnail: llmsTxtHubThumb,
    stars: '650+'
  },
  {
    name: 'UX Patterns for Devs',
    description:
      'A collection of UX patterns and best practices for building better user experiences.',
    websiteUrl: 'https://uxpatterns.dev',
    repoPath: 'thedaviddias/ux-patterns-for-developers',
    thumbnail: uxPatternsThumb,
    stars: '150+'
  },
  {
    name: 'Indie Dev Toolkit',
    description:
      'A curated collection of tools and resources for indie developers and solopreneurs.',
    websiteUrl: null,
    repoPath: 'thedaviddias/indie-dev-toolkit',
    thumbnail: indieDevToolkitThumb,
    stars: '220+'
  }
]

interface ProjectCardProps {
  name: string
  description: string
  websiteUrl: string | null
  repoPath: string | null
  thumbnail: StaticImageData
  stars: string | null
}

/**
 * ProjectCard function.
 */
function ProjectCard({
  name,
  description,
  websiteUrl,
  repoPath,
  thumbnail,
  stars
}: ProjectCardProps) {
  const githubUrl = repoPath ? `https://github.com/${repoPath}` : null
  // Main link: website if exists, otherwise GitHub
  const mainUrl = websiteUrl || githubUrl
  // Secondary link: GitHub only if website is the main link
  const showGithubSecondary = websiteUrl && githubUrl

  return (
    <article
      className={cn(
        'group relative overflow-hidden rounded-xl',
        'border border-border bg-card',
        'hover:border-border-focus hover:shadow-md',
        'transition-all duration-200'
      )}
    >
      {/* Thumbnail */}
      <div className="aspect-video overflow-hidden bg-background-subtle">
        <Image
          src={thumbnail}
          alt={`${name} preview`}
          fill
          className="object-cover object-top transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      </div>

      {/* Content */}
      <div className="p-5 pb-4">
        <h3 className="mb-1.5 font-medium text-base text-foreground transition-colors group-hover:text-accent">
          <a
            href={mainUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'after:absolute after:inset-0 after:content-[""]',
              'focus-visible:outline-none focus-visible:after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-ring'
            )}
          >
            {name}
          </a>
        </h3>
        <p className="mb-4 line-clamp-2 text-foreground-muted text-sm">{description}</p>
        <span className="inline-flex items-center gap-1.5 font-medium text-foreground-muted text-sm">
          {websiteUrl ? (
            <>
              <ExternalLink className="size-4" aria-hidden="true" />
              Website
            </>
          ) : (
            <>
              <GitHubBrandIcon className="size-4" aria-hidden="true" />
              GitHub
            </>
          )}
        </span>
      </div>

      <div className="flex items-center justify-between px-5 pb-5">
        <div className="flex items-center gap-3">
          {showGithubSecondary && githubUrl && (
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="relative z-10 inline-flex items-center gap-1.5 rounded-sm font-medium text-foreground-muted text-sm transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <GitHubBrandIcon className="size-4" aria-hidden="true" />
              GitHub
            </a>
          )}
        </div>

        {stars && (
          <div className="flex items-center gap-1 text-foreground-muted text-sm">
            <Star className="size-4 fill-current text-yellow-500" aria-hidden="true" />
            {stars}
          </div>
        )}
      </div>
    </article>
  )
}

/**
 * CreatorProjects function.
 */
export function CreatorProjects() {
  return (
    <section aria-labelledby="creator-projects-heading" className="py-16 sm:py-20 lg:py-24">
      <div className="container-content">
        {/* Section Header */}
        <div className="mb-10">
          <div className="mb-2 flex items-center gap-2">
            <User className="size-5 text-accent" />
            <span className="font-medium text-accent text-sm uppercase tracking-wider">
              Creator
            </span>
          </div>
          <h2 id="creator-projects-heading" className="font-semibold text-3xl text-foreground">
            More by the Creator
          </h2>
          <p className="mt-2 text-foreground-muted">
            Other open source projects by{' '}
            <Button variant="link" asChild className="h-auto p-0">
              <a href={SOCIAL.twitter} target="_blank" rel="noopener noreferrer">
                David Dias
              </a>
            </Button>
          </p>
        </div>

        {/* Projects Grid */}
        <div className="grid items-start gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {PROJECTS.map(project => (
            <ProjectCard
              key={project.name}
              name={project.name}
              description={project.description}
              websiteUrl={project.websiteUrl}
              repoPath={project.repoPath}
              thumbnail={project.thumbnail}
              stars={project.stars}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
