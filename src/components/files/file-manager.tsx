'use client'

import { useState, useEffect } from 'react'
import { FileUpload } from './file-upload'
import { FileList } from './file-list'
import { UserFile } from '@/types'
import { getUserFiles } from '@/actions/files'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { RefreshCw, CloudUpload } from 'lucide-react'
import { toast } from 'sonner'

export function FileManager() {
  const [files, setFiles] = useState<UserFile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)

  const loadFiles = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await getUserFiles()
      if (result.success && result.data) {
        setFiles(result.data)
      } else {
        setError(result.error || 'Failed to load files')
        toast.error(result.error || 'Failed to load files')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load files'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadFiles()
  }, [])

  const handleUploadSuccess = (newFile: UserFile) => {
    setFiles(prev => [newFile, ...prev])
    setIsUploadDialogOpen(false)
  }

  const handleFileDeleted = (fileId: string) => {
    setFiles(prev => prev.filter(file => file.id !== fileId))
  }

  const handleFileUpdated = (updatedFile: UserFile) => {
    setFiles(prev => 
      prev.map(file => 
        file.id === updatedFile.id ? updatedFile : file
      )
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading files...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <p className="text-destructive">{error}</p>
        <Button onClick={loadFiles} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">File Manager</h1>
          <p className="text-muted-foreground">
            Upload, organize, and manage your files
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
                <CloudUpload className="size-4 shrink-0" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Upload Files</DialogTitle>
              </DialogHeader>
              <FileUpload 
                onUploadSuccess={handleUploadSuccess}
                onUploadError={(error) => toast.error(error)}
              />
            </DialogContent>
          </Dialog>
          <Button onClick={loadFiles} variant="outline" size="icon">
            <RefreshCw className="size-4 shrink-0" />
          </Button>
        </div>
      </div>

      <FileList 
        files={files}
        onFileDeleted={handleFileDeleted}
        onFileUpdated={handleFileUpdated}
      />
    </div>
  )
}
