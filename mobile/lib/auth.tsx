import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react"
import { PfmsClient, type AuthUser } from "@pfms/shared"
import { API_BASE_URL } from "./config"
import { clearToken, loadToken, saveToken } from "./secure-store"

type AuthState = {
  loading: boolean
  user: AuthUser | null
  client: PfmsClient
  /** Current bearer token (for direct uploads that bypass the JSON client). */
  getToken: () => string | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<AuthUser | null>(null)
  // Hold the token in a ref so the single client instance always reads the latest.
  const tokenRef = useRef<string | null>(null)

  const client = useMemo(
    () => new PfmsClient({ baseUrl: API_BASE_URL, getToken: () => tokenRef.current }),
    []
  )

  useEffect(() => {
    loadToken().then((t) => {
      tokenRef.current = t
      // We don't have a /me endpoint yet; presence of a token = logged in.
      if (t) setUser({ id: "", name: null, email: "" })
      setLoading(false)
    })
  }, [])

  const signIn = async (email: string, password: string) => {
    const res = await client.login(email, password, "Mobile app")
    tokenRef.current = res.token
    await saveToken(res.token)
    setUser(res.user)
  }

  const signOut = async () => {
    tokenRef.current = null
    await clearToken()
    setUser(null)
  }

  const getToken = () => tokenRef.current

  return (
    <AuthContext.Provider value={{ loading, user, client, getToken, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
