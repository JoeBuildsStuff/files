"use client"

import { useState, useEffect } from "react"
import { getThumbnailUrl } from "@/actions/files"
import { FileImage, File } from "lucide-react"
import { cn } from "@/lib/utils"

interface FileThumbnailProps {
  filePath: string
  mimeType: string
  fileName: string
  className?: string
}

export function FileThumbnail({ filePath, mimeType, fileName, className }: FileThumbnailProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Only try to get thumbnail for image files
    if (!mimeType.startsWith('image/')) {
      return
    }

    async function fetchThumbnail() {
      setIsLoading(true)
      setError(null)
      
      try {
        const result = await getThumbnailUrl(filePath, mimeType)
        if (result.success && result.url) {
          setThumbnailUrl(result.url)
        } else {
          setError(result.error || 'Failed to load thumbnail')
        }
      } catch (err) {
        setError('Failed to load thumbnail')
        console.error('Thumbnail fetch error:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchThumbnail()
  }, [filePath, mimeType])

  // For non-image files, show file icon
  if (!mimeType.startsWith('image/')) {
    return (
      <div className={cn(
        "flex items-center justify-center w-10 h-10 rounded-md bg-muted",
        className
      )}>
        <File className="size-5 text-muted-foreground" />
      </div>
    )
  }

  // For image files
  return (
    <div className={cn(
      "flex items-center justify-center w-10 h-10 rounded-md bg-muted overflow-hidden",
      className
    )}>
      {isLoading ? (
        <div className="animate-pulse bg-gray-200 dark:bg-gray-700 w-full h-full rounded-md" />
      ) : error || !thumbnailUrl ? (
        <FileImage className="size-5 text-muted-foreground" />
      ) : (
        <img
          src={thumbnailUrl}
          alt={`Thumbnail of ${fileName}`}
          className="w-full h-full object-cover rounded-md"
          onError={() => {
            setError('Failed to load image')
            setThumbnailUrl(null)
          }}
        />
      )}
    </div>
  )
}
