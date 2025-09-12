import { useState, useCallback } from "react"
import { updateFileName } from "@/actions/files"

interface UseFileNameInputOptions {
  filePath: string
  initialValue: string
  onError?: (error: unknown) => void
  onSuccess?: (value: string) => void
}

export function useFileNameInput({
  filePath,
  initialValue,
  onError,
  onSuccess
}: UseFileNameInputOptions) {
  const [value, setValue] = useState(initialValue)
  const [savedValue, setSavedValue] = useState(initialValue)
  const [updating, setUpdating] = useState(false)

  // Handle input change (only updates local state)
  const handleChange = useCallback((newValue: string) => {
    setValue(newValue)
  }, [])

  // Handle blur - update file name when user exits the field
  const handleBlur = useCallback(async () => {
    // Only update if the value has actually changed from the saved value
    if (value === savedValue || value.trim() === '') return

    setUpdating(true)
    try {
      const result = await updateFileName(filePath, value.trim())
      
      if (result.success) {
        setSavedValue(value.trim())
        onSuccess?.(value.trim())
      } else {
        // Revert to saved value on error
        setValue(savedValue)
        onError?.(result.error || 'Failed to update file name')
      }
    } catch (error) {
      // Revert to saved value on error
      setValue(savedValue)
      onError?.(error)
    } finally {
      setUpdating(false)
    }
  }, [value, savedValue, filePath, onError, onSuccess])

  const reset = useCallback(() => {
    setValue(initialValue)
    setSavedValue(initialValue)
  }, [initialValue])

  return {
    value,
    handleChange,
    handleBlur,
    updating,
    reset,
    savedValue
  }
}
