type SessionUser = {
  id?: string
  name?: string | null
  email?: string | null
  image?: string | null
  createdAt?: string | Date | null
}

const defaultSession: { data: { user?: SessionUser } | null; isPending: boolean } = {
  data: null,
  isPending: false
}

const emptyResult = { error: null }

export const authClient = {
  useSession: () => defaultSession,
  signIn: {
    social: async () => emptyResult
  },
  signOut: async () => emptyResult
}
