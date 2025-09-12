"use client"

import { Input } from "@/components/ui/input"
import { useSupabaseInput } from "@/components/supabase/_hooks/use-supabase-input"
import { cn } from "@/lib/utils"

interface InputSupabaseProps {
  table: string
  field: string
  id: string
  initialValue: string
  placeholder?: string
  onNoteCreated?: (id: string) => void
  className?: string
}

export default function InputSupabase({ table, field, id, initialValue, placeholder, onNoteCreated, className }: InputSupabaseProps) {
  const { value, handleChange, handleBlur, updating, savedValue } = useSupabaseInput({
    table,
    field,
    id,
    initialValue,
    onCreateSuccess: onNoteCreated
  })

  // Check if the value has changed from saved (unsaved)
  const isUnsaved = value !== savedValue

  return (
    <Input 
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={handleBlur}
      disabled={updating}
      placeholder={placeholder || `Enter ${field.replace('_', ' ')}...`}
      className={cn(
        isUnsaved && "text-blue-700 dark:text-blue-400",
        className
      )}
    />
  )
}