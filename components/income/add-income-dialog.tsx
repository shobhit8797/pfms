"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { CalendarIcon, PlusCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { createIncome } from "@/app/actions/income"
import { BankAccount } from "@prisma/client"

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
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

const formSchema = z.object({
  source: z.string().min(1, "Source is required"),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  incomeDate: z.date(),
  type: z.enum(["SALARY", "FREELANCE", "RENTAL", "INTEREST", "BONUS", "GIFT", "OTHER"]),
  isRecurring: z.boolean().default(false),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"]).optional(),
  isTaxable: z.boolean().default(true),
  bankAccountId: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  notes: z.string().optional(),
}).refine((data) => {
  if (data.isRecurring && !data.frequency) return false
  return true
}, {
  message: "Frequency is required for recurring income",
  path: ["frequency"],
})

interface AddIncomeDialogProps {
  accounts: BankAccount[]
}

export function AddIncomeDialog({ accounts }: AddIncomeDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      source: "",
      amount: 0,
      incomeDate: new Date(),
      type: "SALARY",
      isRecurring: false,
      isTaxable: true,
      category: "Salary",
      notes: "",
    },
  })

  const watchIsRecurring = form.watch("isRecurring")

  async function onSubmit(values: z.infer<typeof formSchema>) {
    startTransition(async () => {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/330bc31a-43db-4108-82f1-804b7395875f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'add-income-dialog.tsx:93',message:'onSubmit called',data:{notes:values.notes,notesType:typeof values.notes,notesTruthy:!!values.notes},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      const formData = new FormData()
      formData.append("source", values.source)
      formData.append("amount", values.amount.toString())
      formData.append("incomeDate", values.incomeDate.toISOString())
      formData.append("type", values.type)
      if (values.isRecurring) formData.append("isRecurring", "on")
      if (values.frequency) formData.append("frequency", values.frequency)
      if (values.isTaxable) formData.append("isTaxable", "on")
      if (values.bankAccountId) formData.append("bankAccountId", values.bankAccountId)
      formData.append("category", values.category)
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/330bc31a-43db-4108-82f1-804b7395875f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'add-income-dialog.tsx:105',message:'Before notes append check',data:{notesValue:values.notes,willAppend:!!values.notes},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      if (values.notes) formData.append("notes", values.notes)
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/330bc31a-43db-4108-82f1-804b7395875f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'add-income-dialog.tsx:106',message:'After notes append',data:{hasNotesInFormData:formData.has('notes'),notesFromFormData:formData.get('notes')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      const result = await createIncome(undefined, formData)
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/330bc31a-43db-4108-82f1-804b7395875f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'add-income-dialog.tsx:108',message:'createIncome result',data:{success:result.success,error:result.error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      if (result.success) {
        toast.success(result.success)
        setOpen(false)
        form.reset()
      } else {
        toast.error(result.error || "Failed to add income")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Income
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Income</DialogTitle>
          <DialogDescription>
            Record a new income entry.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source / Payer</FormLabel>
                    <FormControl>
                      <Input placeholder="Employer Name" {...field} />
                    </FormControl>
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
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="SALARY">Salary</SelectItem>
                        <SelectItem value="FREELANCE">Freelance</SelectItem>
                        <SelectItem value="RENTAL">Rental</SelectItem>
                        <SelectItem value="INTEREST">Interest</SelectItem>
                        <SelectItem value="BONUS">Bonus</SelectItem>
                        <SelectItem value="GIFT">Gift</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="incomeDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Primary Job" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bankAccountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deposit To Account (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select bank account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.accountName} - {acc.bankName} (₹{Number(acc.currentBalance).toFixed(2)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Automatically updates the account balance.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isRecurring"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Recurring Income
                    </FormLabel>
                    <FormDescription>
                      Is this a regular income source?
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {watchIsRecurring && (
              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="WEEKLY">Weekly</SelectItem>
                        <SelectItem value="MONTHLY">Monthly</SelectItem>
                        <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                        <SelectItem value="YEARLY">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="isTaxable"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Taxable Income
                    </FormLabel>
                    <FormDescription>
                      This income is subject to tax.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional details..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Adding..." : "Add Income"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
