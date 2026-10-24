export interface ProfileData {
  username?: string
  githubUsername?: string
  headline?: string
  bio?: string
  githubUrl?: string
  xUrl?: string
  linkedinUrl?: string
  githubCompany?: string
  githubBlog?: string
  githubLocation?: string
  githubPublicRepos?: number
  githubFollowers?: number
  githubProfileImportedAt?: string
  isProfilePublic: boolean
  showProgress: boolean
  showChecklists: boolean
}

export interface ProfileUser {
  email?: string | null
  image?: string | null
  name?: string | null
}
