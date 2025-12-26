"use server"

import { signIn, signOut } from "@/auth"
import { AuthError } from "next-auth"

export async function loginAction(prevState: string | undefined, formData: FormData) {
  try {
    // Note: signIn throws an error on redirect, so we need to catch it or let it pass if it's a redirect
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/dashboard",
    })
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return "Invalid credentials."
        default:
          return "Something went wrong."
      }
    }
    throw error
  }
}

export async function logout() {
  await signOut({ redirectTo: "/login" })
}
