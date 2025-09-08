"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header"
import { 
  File, 
  FileText, 
  Calendar, 
  HardDrive, 
  FileImage, 
  FileVideo, 
  FileAudio, 
  FileSpreadsheet, 
  FileBarChart, 
  Archive,
  Type,
  ImageIcon
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { UserFile } from "@/types"
import { FileThumbnail } from "@/components/ui/file-thumbnail"

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// Helper function to get file type from mime type
function getFileType(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'Image'
  if (mimeType.startsWith('video/')) return 'Video'
  if (mimeType.startsWith('audio/')) return 'Audio'
  if (mimeType.startsWith('text/')) return 'Text'
  if (mimeType.includes('pdf')) return 'PDF'
  if (mimeType.includes('word') || mimeType.includes('document')) return 'Document'
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'Spreadsheet'
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'Presentation'
  if (mimeType.includes('zip') || mimeType.includes('archive')) return 'Archive'
  return 'File'
}

// Helper function to get the appropriate Lucide icon for file type
function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return FileImage
  if (mimeType.startsWith('video/')) return FileVideo
  if (mimeType.startsWith('audio/')) return FileAudio
  if (mimeType.startsWith('text/')) return FileText
  if (mimeType.includes('pdf')) return FileText
  if (mimeType.includes('word') || mimeType.includes('document')) return FileText
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return FileSpreadsheet
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return FileBarChart
  if (mimeType.includes('zip') || mimeType.includes('archive')) return Archive
  return File
}

// Helper function to get file type color
function getFileTypeColor(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
  if (mimeType.startsWith('video/')) return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
  if (mimeType.startsWith('audio/')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
  if (mimeType.startsWith('text/')) return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
  if (mimeType.includes('pdf')) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
  if (mimeType.includes('word') || mimeType.includes('document')) return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300'
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
  if (mimeType.includes('zip') || mimeType.includes('archive')) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
  return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
}

export const columns: ColumnDef<UserFile>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    meta: {
      excludeFromForm: true,
    },
  },
  {
    accessorKey: "thumbnail",
    header: ({ column }) => (
      <DataTableColumnHeader 
        column={column} 
        title="Thumbnail" 
        icon={<ImageIcon className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />}
      />
    ),
    cell: ({ row }) => {
      const file = row.original
      
      return (
        <FileThumbnail
          filePath={file.path}
          mimeType={file.mime_type}
          fileName={file.name}
          className="w-10 h-10"
        />
      )
    },
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader 
        column={column} 
        title="Name" 
        icon={<Type className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />}
      />
    ),
    cell: ({ row }) => {
      const file = row.original
      const fileType = getFileType(file.mime_type)
      const typeColor = getFileTypeColor(file.mime_type)
      const FileIcon = getFileIcon(file.mime_type)
      
      return (
        <div className="flex items-center gap-3">
          <div className={`flex items-center justify-center w-8 h-8 rounded-md ${typeColor}`}>
            <FileIcon className="size-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-sm">{file.name}</span>
            <span className="text-xs text-muted-foreground">{fileType}</span>
          </div>
        </div>
      )
    },
    meta: {
      label: "Name",
      variant: "text",
      placeholder: "Enter file name...",
    },
    enableColumnFilter: true,
  },
  {
    accessorKey: "size",
    header: ({ column }) => (
      <DataTableColumnHeader 
        column={column} 
        title="Size" 
        icon={<HardDrive className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />}
      />
    ),
    cell: ({ row }) => {
      const size = row.getValue("size") as number
      return (
        <div className="text-sm text-muted-foreground">
          {formatFileSize(size)}
        </div>
      )
    },
    meta: {
      label: "Size",
      variant: "number",
      readOnly: true,
    },
    enableColumnFilter: true,
  },
  {
    accessorKey: "mime_type",
    header: ({ column }) => (
      <DataTableColumnHeader 
        column={column} 
        title="Type" 
        icon={<FileText className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />}
      />
    ),
    cell: ({ row }) => {
      const mimeType = row.getValue("mime_type") as string
      const fileType = getFileType(mimeType)
      const typeColor = getFileTypeColor(mimeType)
      const FileIcon = getFileIcon(mimeType)
      
      return (
        <Badge 
          variant="secondary" 
          className={`text-xs font-normal ${typeColor} flex items-center gap-1`}
        >
          <FileIcon className="size-3" />
          {fileType}
        </Badge>
      )
    },
    meta: {
      label: "Type",
      variant: "select",
      options: [
        { label: "Image", value: "image" },
        { label: "Video", value: "video" },
        { label: "Audio", value: "audio" },
        { label: "Text", value: "text" },
        { label: "PDF", value: "pdf" },
        { label: "Document", value: "document" },
        { label: "Spreadsheet", value: "spreadsheet" },
        { label: "Presentation", value: "presentation" },
        { label: "Archive", value: "archive" },
        { label: "Other", value: "other" },
      ],
    },
    enableColumnFilter: true,
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <DataTableColumnHeader 
        column={column} 
        title="Created" 
        icon={<Calendar className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />}
      />
    ),
    cell: ({ row }) => {
      const createdAt = row.getValue("created_at") as string
      if (!createdAt) return <div className="text-muted-foreground">—</div>
      
      const date = new Date(createdAt)
      const formatted = new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date)
      
      return <div className="text-sm text-muted-foreground">{formatted}</div>
    },
    meta: {
      label: "Created",
      variant: "date",
      readOnly: true,
    },
    enableColumnFilter: true,
  },
  {
    accessorKey: "updated_at",
    header: ({ column }) => (
      <DataTableColumnHeader 
        column={column} 
        title="Modified" 
        icon={<Calendar className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />}
      />
    ),
    cell: ({ row }) => {
      const updatedAt = row.getValue("updated_at") as string
      if (!updatedAt) return <div className="text-muted-foreground">—</div>
      
      const date = new Date(updatedAt)
      const formatted = new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date)
      
      return <div className="text-sm text-muted-foreground">{formatted}</div>
    },
    meta: {
      label: "Modified",
      variant: "date",
      readOnly: true,
    },
    enableColumnFilter: true,
  },
]
