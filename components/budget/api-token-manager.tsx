"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2, Copy, KeyRound } from "lucide-react"
import { createApiToken, deleteApiToken } from "@/app/actions/budget/token"

type TokenRow = {
  id: string
  name: string | null
  lastUsedAt: string | null
  createdAt: string
}

export function ApiTokenManager({ tokens }: { tokens: TokenRow[] }) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [newToken, setNewToken] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function create() {
    startTransition(async () => {
      const result = await createApiToken(name)
      if (result.error) toast.error(result.error)
      else {
        const data = result.data as { token: string }
        setNewToken(data.token)
        setName("")
        toast.success("Token created — copy it now")
        router.refresh()
      }
    })
  }

  function revoke(id: string) {
    startTransition(async () => {
      const result = await deleteApiToken(id)
      if (result.error) toast.error(result.error)
      else {
        toast.success("Token revoked")
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Bearer tokens let the iPhone app sync with this account. The token is shown once on creation.
      </p>

      {newToken && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
          <p className="text-xs font-medium text-primary">Copy this token now — it won&apos;t be shown again:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono break-all bg-background rounded px-2 py-1.5 border border-border">
              {newToken}
            </code>
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8 shrink-0"
              onClick={() => {
                navigator.clipboard.writeText(newToken)
                toast.success("Copied")
              }}
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Input
          placeholder="Token name (e.g. iPhone)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button onClick={create} disabled={isPending}>
          <KeyRound className="w-4 h-4 mr-2" /> Create
        </Button>
      </div>

      {tokens.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {tokens.map((t) => (
            <li key={t.id} className="flex items-center gap-3 p-3">
              <KeyRound className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="font-medium truncate">{t.name ?? "Token"}</p>
                <p className="text-xs text-muted-foreground">
                  Created {format(new Date(t.createdAt), "MMM d, yyyy")}
                  {t.lastUsedAt && ` · last used ${format(new Date(t.lastUsedAt), "MMM d")}`}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 ml-auto text-destructive"
                disabled={isPending}
                onClick={() => revoke(t.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
