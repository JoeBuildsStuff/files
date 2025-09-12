"use client"

import { Input } from "@/components/ui/input"
import { useFileNameInput } from "@/components/supabase/_hooks/use-file-name-input"
import { cn } from "@/lib/utils"

interface FileNameInputProps {
  filePath: string
  initialValue: string
  placeholder?: string
  className?: string
}

export default function FileNameInput({ 
  filePath, 
  initialValue, 
  placeholder, 
  className 
}: FileNameInputProps) {
  const { value, handleChange, handleBlur, updating, savedValue } = useFileNameInput({
    filePath,
    initialValue
  })

  // Check if the value has changed from saved (unsaved)
  const isUnsaved = value !== savedValue

  return (
    <Input 
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={handleBlur}
      disabled={updating}
      placeholder={placeholder || "Enter file name..."}
      className={cn(
        isUnsaved && "text-blue-700 dark:text-blue-400",
        className
      )}
    />
  )
}
