import { z } from "zod"

export const upiHandleCreateSchema = z.object({
  name: z.string().min(1, "Display name is required").max(50),
  handle: z.string().min(3, "UPI handle is required").max(100).regex(
    /^[\w.\-+]+@[\w.\-]+$/,
    "Enter a valid UPI handle (e.g. user@ybl)"
  ),
  isDefault: z.boolean().optional().default(false),
})

export type UpiHandleCreateInput = z.infer<typeof upiHandleCreateSchema>
