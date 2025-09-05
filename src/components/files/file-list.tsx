'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { 
  MoreVertical, 
  Download, 
  Trash2, 
  Edit, 
  File, 
  Image, 
  FileText,
  Calendar,
  HardDrive
} from 'lucide-react'
import { UserFile } from '@/types'
import { deleteFile, updateFileName, downloadFile } from '@/actions/files'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

interface FileListProps {
  files: UserFile[]
  onFileDeleted?: (fileId: string) => void
  onFileUpdated?: (file: UserFile) => void
}

export function FileList({ files, onFileDeleted, onFileUpdated }: FileListProps) {
  const [editingFile, setEditingFile] = useState<string | null>(null)
  const [newFileName, setNewFileName] = useState('')
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <Image className="h-5 w-5 text-blue-500" />
    } else if (mimeType === 'application/pdf') {
      return <FileText className="h-5 w-5 text-red-500" />
    } else {
      return <File className="h-5 w-5 text-gray-500" />
    }
  }

  const handleDelete = async (file: UserFile) => {
    if (!confirm(`Are you sure you want to delete "${file.name}"?`)) return

    setIsDeleting(file.id)
    try {
      const result = await deleteFile(file.path)
      if (result.success) {
        onFileDeleted?.(file.id)
        toast.success(`${file.name} deleted successfully`)
      } else {
        toast.error(`Failed to delete ${file.name}: ${result.error}`)
      }
    } catch (error) {
      toast.error(`Failed to delete ${file.name}`)
    } finally {
      setIsDeleting(null)
    }
  }

  const handleRename = async (file: UserFile) => {
    if (!newFileName.trim() || newFileName === file.name) {
      setEditingFile(null)
      setNewFileName('')
      return
    }

    try {
      const result = await updateFileName(file.path, newFileName.trim())
      if (result.success && result.data) {
        onFileUpdated?.(result.data)
        toast.success(`File renamed to "${newFileName}"`)
        setEditingFile(null)
        setNewFileName('')
      } else {
        toast.error(`Failed to rename file: ${result.error}`)
      }
    } catch (error) {
      toast.error('Failed to rename file')
    }
  }

  const handleDownload = async (file: UserFile) => {
    try {
      const result = await downloadFile(file.path)
      if (result.success && result.data) {
        const url = URL.createObjectURL(result.data)
        const a = document.createElement('a')
        a.href = url
        a.download = file.name
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success(`${file.name} downloaded successfully`)
      } else {
        toast.error(`Failed to download ${file.name}: ${result.error}`)
      }
    } catch (error) {
      toast.error('Failed to download file')
    }
  }

  const startEditing = (file: UserFile) => {
    setEditingFile(file.id)
    setNewFileName(file.name)
  }

  if (files.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <File className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No files yet</h3>
          <p className="text-muted-foreground">
            Upload your first file to get started
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="h-5 w-5" />
          Your Files ({files.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex-shrink-0">
                {getFileIcon(file.mime_type)}
              </div>
              
              <div className="flex-1 min-w-0">
                {editingFile === file.id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={newFileName}
                      onChange={(e) => setNewFileName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(file)
                        if (e.key === 'Escape') {
                          setEditingFile(null)
                          setNewFileName('')
                        }
                      }}
                      className="h-8"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      onClick={() => handleRename(file)}
                      disabled={!newFileName.trim()}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingFile(null)
                        setNewFileName('')
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div>
                    <p className="font-medium truncate">{file.name}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{formatFileSize(file.size)}</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDistanceToNow(new Date(file.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {file.mime_type.split('/')[0]}
                </Badge>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleDownload(file)}>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => startEditing(file)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDelete(file)}
                      className="text-destructive"
                      disabled={isDeleting === file.id}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {isDeleting === file.id ? 'Deleting...' : 'Delete'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
