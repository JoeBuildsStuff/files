'use client'

import { useCallback, useState, useEffect } from 'react'
import { UserFile } from '@/types'
import { useRouter } from 'next/navigation'
import { Upload, CheckCircle, AlertCircle, X } from 'lucide-react'
import { toast } from 'sonner'

interface DragDropWrapperProps {
  children: React.ReactNode
  onUploadSuccess?: (file: UserFile) => void
}

interface UploadProgress {
  file: File
  progress: number
  status: 'uploading' | 'completed' | 'error'
  error?: string
}

export function DragDropWrapper({ children, onUploadSuccess }: DragDropWrapperProps) {
  const [isDragActive, setIsDragActive] = useState(false)
  const [showUploadProgress, setShowUploadProgress] = useState(false)
  const [dragCounter, setDragCounter] = useState(0)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([])
  const router = useRouter()

  const handleUploadSuccess = useCallback((file: UserFile) => {
    onUploadSuccess?.(file)
    // Refresh the page to show the new file
    router.refresh()
  }, [onUploadSuccess, router])

  const uploadFile = useCallback(async (file: File, index: number) => {
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/storage', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Upload failed')
      }
      
      if (result.success && result.data) {
        setUploadProgress(prev => 
          prev.map((item, i) => 
            i === index 
              ? { ...item, progress: 100, status: 'completed' as const }
              : item
          )
        )
        handleUploadSuccess(result.data)
        toast.success(`${file.name} uploaded successfully`)
        return result.data
      } else {
        throw new Error(result.error || 'Upload failed')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      setUploadProgress(prev => 
        prev.map((item, i) => 
          i === index 
            ? { ...item, status: 'error' as const, error: errorMessage }
            : item
        )
      )
      toast.error(`Failed to upload ${file.name}: ${errorMessage}`)
      return null
    }
  }, [handleUploadSuccess])

  const uploadFiles = useCallback(async (files: File[]) => {
    setShowUploadProgress(true)
    
    const progress: UploadProgress[] = files.map(file => ({
      file,
      progress: 0,
      status: 'uploading'
    }))
    setUploadProgress(progress)

    try {
      await Promise.all(files.map((file, index) => uploadFile(file, index)))
    } finally {
      // Clear progress after 3 seconds
      setTimeout(() => {
        setUploadProgress([])
        setShowUploadProgress(false)
      }, 3000)
    }
  }, [uploadFile])

  // Prevent default drag behaviors on the entire document
  useEffect(() => {
    const preventDefaults = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
    }

    const handleDragEnter = (e: DragEvent) => {
      preventDefaults(e)
      setDragCounter(prev => prev + 1)
      if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
        setIsDragActive(true)
      }
    }

    const handleDragLeave = (e: DragEvent) => {
      preventDefaults(e)
      setDragCounter(prev => {
        const newCount = prev - 1
        if (newCount <= 0) {
          setIsDragActive(false)
        }
        return newCount
      })
    }

    const handleDragOver = (e: DragEvent) => {
      preventDefaults(e)
    }

    const handleDrop = (e: DragEvent) => {
      preventDefaults(e)
      setDragCounter(0)
      setIsDragActive(false)
      
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        const files = Array.from(e.dataTransfer.files)
        uploadFiles(files)
      }
    }

    // Add event listeners to document
    document.addEventListener('dragenter', handleDragEnter)
    document.addEventListener('dragleave', handleDragLeave)
    document.addEventListener('dragover', handleDragOver)
    document.addEventListener('drop', handleDrop)

    return () => {
      document.removeEventListener('dragenter', handleDragEnter)
      document.removeEventListener('dragleave', handleDragLeave)
      document.removeEventListener('dragover', handleDragOver)
      document.removeEventListener('drop', handleDrop)
    }
  }, [dragCounter, uploadFiles])

  return (
    <div className="relative h-full">
      
      {/* Drag overlay */}
      {isDragActive && (
        <div className="absolute inset-0 z-50 bg-primary/10 border-1 border-dashed border-muted-foreground rounded-lg flex items-center justify-center backdrop-blur-sm">
            <div className="text-center">
                <Upload className="mx-auto size-16 text-muted-foreground mb-4" strokeWidth={1}/>
                <p className="text-lg font-light text-muted-foreground ">Drop files here to upload</p>
                <p className="text-sm font-light text-muted-foreground mt-2">
                Release to upload your files
                </p>
            </div>
        </div>
      )}

      {/* Main content */}
      <div className="h-full">
        {children}
      </div>

      {/* Upload progress modal */}
      {showUploadProgress && uploadProgress.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Uploading Files</h2>
              <button
                onClick={() => {
                  setShowUploadProgress(false)
                  setUploadProgress([])
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              {uploadProgress.map((item, index) => (
                <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="flex-shrink-0">
                    {item.status === 'completed' ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : item.status === 'error' ? (
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    ) : (
                      <Upload className="h-5 w-5 text-muted-foreground animate-pulse" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.status === 'uploading' && 'Uploading...'}
                      {item.status === 'completed' && 'Upload complete'}
                      {item.status === 'error' && item.error}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
