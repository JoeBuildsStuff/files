"use client"

import { useState, useEffect } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { getFullImageUrl } from "@/actions/files"
import { FileImage, Download, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import Spinner from "./spinner"
import { XIcon } from "../icons/x"
import { DownloadIcon } from "../icons/download"

interface ImageDialogProps {
  filePath: string
  mimeType: string
  fileName: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function ImageDialog({ filePath, mimeType, fileName, isOpen, onOpenChange }: ImageDialogProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !mimeType.startsWith('image/')) {
      return
    }

    async function fetchImage() {
      setIsLoading(true)
      setError(null)
      
      try {
        const result = await getFullImageUrl(filePath, mimeType)
        if (result.success && result.url) {
          setImageUrl(result.url)
        } else {
          setError(result.error || 'Failed to load image')
        }
      } catch (err) {
        setError('Failed to load image')
        console.error('Image fetch error:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchImage()
  }, [filePath, mimeType, isOpen])

  const handleDownload = async () => {
    if (!imageUrl) return
    
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Download failed:', err)
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-4xl max-h-[90vh]">
        <AlertDialogHeader className="flex-row items-center justify-end">
        
        {/* <AlertDialogAction onClick={handleDownload} className="size-8">
              <DownloadIcon className="size-4" />
            </AlertDialogAction> */}
            <AlertDialogCancel className="size-8"><X className="size-4" /></AlertDialogCancel>
        </AlertDialogHeader>
        
        <div className="flex items-center justify-center min-h-[400px] bg-muted rounded-lg overflow-hidden">
          {isLoading ? (
              <Spinner className="size-12" />
          ) : error || !imageUrl ? (
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <FileImage className="size-12 mb-2" />
              <p className="text-sm">{error || 'Failed to load image'}</p>
            </div>
          ) : (
            <img
              src={imageUrl}
              alt={fileName}
              className="max-w-full max-h-[70vh] object-contain rounded-lg"
              onError={() => {
                setError('Failed to load image')
                setImageUrl(null)
              }}
            />
          )}
        </div>
        <AlertDialogDescription className="text-center">
          {fileName}
          </AlertDialogDescription>

        <AlertDialogFooter>
          {imageUrl && (
            <AlertDialogAction onClick={handleDownload} className="w-full">
              Download
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
