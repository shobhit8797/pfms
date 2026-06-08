"use server"

import { auth } from "@/auth"
import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

export async function askFinancialAdvisor(query: string, contextData: any) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  if (!process.env.GEMINI_API_KEY) {
      return { error: "Gemini API Key not configured" }
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const prompt = `
      You are a personal finance advisor.
      User Context:
      - Name: ${session.user.name}
      - Financial Data Summary: ${JSON.stringify(contextData)}
      
      User Query: ${query}
      
      Provide a helpful, concise, and actionable response specifically for the Indian context (using ₹).
      Focus on tax saving (80C, 80D), investment growth, and budget management.
    `

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    return { success: text }
  } catch (error) {
    console.error("AI Error:", error)
    return { error: "Failed to generate AI response" }
  }
}

export async function processAndAnalyzeStatement(formData: FormData) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    if (!process.env.GEMINI_API_KEY) {
        return { error: "Gemini API Key not configured" }
    }

    const file = formData.get("file") as File
    if (!file) return { error: "No file uploaded" }

    let textContent = ""

    try {
        if (file.type === "application/pdf") {
            const arrayBuffer = await file.arrayBuffer()
            const buffer = Buffer.from(arrayBuffer)
            // Dynamic import to use server-only pdf-parse library
            const { PDFParse } = await import("pdf-parse")
            const parser = new PDFParse({ data: buffer })
            const result = await parser.getText()
            textContent = result.text
        } else {
            // Assume text/csv
            textContent = await file.text()
        }
    } catch (e) {
        console.error("File parse error:", e)
        return { error: "Failed to read file. Please upload a valid PDF or CSV." }
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

        const prompt = `
            Extract financial transactions from the following bank statement text.
            Return ONLY a valid JSON array of objects. Do not wrap in markdown code blocks.
            Each object should have:
            - date (YYYY-MM-DD)
            - description (string)
            - amount (number, positive for income, negative for expense)
            - category (guess based on description from list: Food, Transport, Utilities, Housing, Shopping, Entertainment, Transfer, Salary, Investment, Other)
            
            Statement Text:
            ${textContent.substring(0, 30000)} // Limit context window
        `

        const result = await model.generateContent(prompt)
        const response = await result.response
        let text = response.text()
        
        // Cleanup markdown if present
        text = text.replace(/```json/g, "").replace(/```/g, "").trim()
        
        const transactions = JSON.parse(text)
        return { success: transactions }
    } catch (error) {
        console.error("AI Parse Error:", error)
        return { error: "Failed to parse statement" }
    }
}
