"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { PlusCircle } from "lucide-react"
import { addDeduction } from "@/app/actions/tax"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

const formSchema = z.object({
  section: z.string().min(1, "Section is required"),
  amount: z.coerce.number().min(1),
  description: z.string().optional(),
})

export function AddDeductionDialog() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      section: "80C",
      amount: 0,
      description: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    startTransition(async () => {
      const formData = new FormData()
      formData.append("section", values.section)
      formData.append("amount", values.amount.toString())
      if (values.description) formData.append("description", values.description)

      const result = await addDeduction(formData)

      if (result.success) {
        toast.success(result.success)
        setOpen(false)
        form.reset()
      } else {
        toast.error(result.error || "Failed to add deduction")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Deduction
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Tax Deduction</DialogTitle>
          <DialogDescription>
            Record investments or expenses for tax saving.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="section"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Section</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select section" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="80C">80C (LIC, PPF, ELSS)</SelectItem>
                      <SelectItem value="80D">80D (Health Insurance)</SelectItem>
                      <SelectItem value="80G">80G (Donations)</SelectItem>
                      <SelectItem value="HRA">HRA</SelectItem>
                      <SelectItem value="80CCD">80CCD (NPS)</SelectItem>
                      <SelectItem value="24b">24b (Home Loan Interest)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="Policy No / Details" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                Save Deduction
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
