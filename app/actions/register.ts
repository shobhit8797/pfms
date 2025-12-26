"use server"

import { z } from "zod"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"
import { redirect } from "next/navigation"

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

export type RegisterState = {
  error?: string
  success?: string
}

export async function registerAction(prevState: RegisterState | undefined, formData: FormData): Promise<RegisterState> {
  const data = Object.fromEntries(formData.entries())
  
  const validated = registerSchema.safeParse({
    name: data.name,
    email: data.email,
    password: data.password,
  })

  if (!validated.success) {
    return { error: "Invalid input data" }
  }

  const { name, email, password } = validated.data

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return { error: "Email already in use" }
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    })
  } catch (error) {
    console.error("Registration error:", error)
    return { error: "Something went wrong. Please try again." }
  }

  // Redirect needs to be outside try-catch as it throws an error internally
  redirect("/login?registered=true")
}

