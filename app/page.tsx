import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2 bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <main className="flex flex-col items-center justify-center w-full flex-1 px-20 text-center">
        <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-8">
          Personal Finance <span className="text-blue-600">Mastered</span>
        </h1>

        <p className="mt-3 text-2xl text-gray-600 dark:text-gray-300 max-w-2xl mb-12">
          Track your income, expenses, investments, and taxes in one place.
          India-focused financial management for the modern era.
        </p>

        <div className="flex gap-4">
          <Link href="/login">
            <Button size="lg" className="text-lg px-8">
              Login
            </Button>
          </Link>
          <Link href="/register">
            <Button variant="outline" size="lg" className="text-lg px-8">
              Register
            </Button>
          </Link>
        </div>
      </main>

      <footer className="flex items-center justify-center w-full h-24 border-t dark:border-gray-700">
        <p className="text-gray-500 dark:text-gray-400">
          Built with Next.js 14+, Prisma, and Tailwind CSS
        </p>
      </footer>
    </div>
  )
}
