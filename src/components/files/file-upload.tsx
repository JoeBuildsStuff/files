'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Upload, X, File, CheckCircle, AlertCircle } from 'lucide-react'
import { uploadFile } from '@/actions/files'
import { UserFile, FileUploadProgress } from '@/types'
import { toast } from 'sonner'

interface FileUploadProps {
  onUploadSuccess?: (file: UserFile) => void
  onUploadError?: (error: string) => void
  maxFiles?: number
  maxSize?: number
  acceptedFileTypes?: Record<string, string[]>
}

export function FileUpload({
  onUploadSuccess,
  onUploadError,
  maxFiles = 10,
  maxSize = 10 * 1024 * 1024, // 10MB
  acceptedFileTypes = {
    'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    'application/pdf': ['.pdf'],
    'text/*': ['.txt', '.md', '.csv'],
    'application/vnd.openxmlformats-officedocument.*': ['.docx', '.xlsx', '.pptx']
  }
}: FileUploadProps) {
  const [uploadProgress, setUploadProgress] = useState<FileUploadProgress[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return

    setIsUploading(true)
    const newProgress: FileUploadProgress[] = acceptedFiles.map(file => ({
      file,
      progress: 0,
      status: 'uploading'
    }))
    setUploadProgress(newProgress)

    try {
      const uploadPromises = acceptedFiles.map(async (file, index) => {
        try {
          const formData = new FormData()
          formData.append('file', file)

          const result = await uploadFile(formData)
          
          if (result.success && result.data) {
            setUploadProgress(prev => 
              prev.map((item, i) => 
                i === index 
                  ? { ...item, progress: 100, status: 'completed' as const }
                  : item
              )
            )
            onUploadSuccess?.(result.data)
            toast.success(`${file.name} uploaded successfully`)
            return result.data
          } else {
            setUploadProgress(prev => 
              prev.map((item, i) => 
                i === index 
                  ? { ...item, status: 'error' as const, error: result.error }
                  : item
              )
            )
            onUploadError?.(result.error || 'Upload failed')
            toast.error(`Failed to upload ${file.name}: ${result.error}`)
            return null
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
          onUploadError?.(errorMessage)
          toast.error(`Failed to upload ${file.name}: ${errorMessage}`)
          return null
        }
      })

      await Promise.all(uploadPromises)
    } finally {
      setIsUploading(false)
      // Clear progress after 3 seconds
      setTimeout(() => setUploadProgress([]), 3000)
    }
  }, [onUploadSuccess, onUploadError])

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    maxFiles,
    maxSize,
    accept: acceptedFileTypes,
    disabled: isUploading
  })

  const removeProgressItem = (index: number) => {
    setUploadProgress(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
          ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary hover:bg-primary/5'}
        `}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
        <div className="space-y-2">
          <p className="text-base font-medium">
            {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
          </p>
          <p className="text-sm text-muted-foreground">
            or click to select files
          </p>
          <p className="text-xs text-muted-foreground">
            Max {maxFiles} files, up to {Math.round(maxSize / 1024 / 1024)}MB each
          </p>
        </div>
      </div>

      {fileRejections.length > 0 && (
        <div className="border border-destructive rounded-lg p-4">
          <div className="flex items-center gap-2 text-destructive mb-2">
            <AlertCircle className="h-4 w-4" />
            <span className="font-medium">Some files were rejected:</span>
          </div>
          <ul className="text-sm text-destructive space-y-1">
            {fileRejections.map(({ file, errors }, index) => (
              <li key={index}>
                {file.name}: {errors.map(e => e.message).join(', ')}
              </li>
            ))}
          </ul>
        </div>
      )}

      {uploadProgress.length > 0 && (
        <div className="border rounded-lg p-4">
          <h3 className="font-medium mb-3">Upload Progress</h3>
          <div className="space-y-3">
            {uploadProgress.map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  {item.status === 'completed' ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : item.status === 'error' ? (
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  ) : (
                    <File className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.file.name}</p>
                  {item.status === 'uploading' && (
                    <Progress value={item.progress} className="mt-1" />
                  )}
                  {item.status === 'error' && item.error && (
                    <p className="text-xs text-destructive mt-1">{item.error}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeProgressItem(index)}
                  className="flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
