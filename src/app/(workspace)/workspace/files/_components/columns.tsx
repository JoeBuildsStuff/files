"use client"

import { useState } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header"
import { 
  File, 
  FileText, 
  Calendar, 
  HardDrive, 
  Type,
  ImageIcon,
  Headphones,
  Clapperboard,
  Presentation,
  Table2,
  Text,
  Image,
  Code,
  Braces,
  Book
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { UserFile } from "@/types"
import { FileThumbnail } from "@/components/ui/file-thumbnail"
import { ImageDialog } from "@/components/ui/image-dialog"
import FileNameInput from "@/components/supabase/_components/file-name-input"

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
  if (mimeType.includes('json')) return 'JSON'
  if (mimeType.includes('javascript') || mimeType.includes('typescript') || mimeType.includes('python') || mimeType.includes('java') || mimeType.includes('cpp') || mimeType.includes('csharp') || mimeType.includes('php') || mimeType.includes('ruby') || mimeType.includes('go') || mimeType.includes('rust') || mimeType.includes('swift') || mimeType.includes('kotlin') || mimeType.includes('html') || mimeType.includes('css') || mimeType.includes('xml') || mimeType.includes('yaml') || mimeType.includes('markdown') || mimeType.includes('sql')) return 'Code'
  if (mimeType.includes('epub') || mimeType.includes('mobi') || mimeType.includes('azw') || mimeType.includes('fb2') || mimeType.includes('djvu')) return 'eBook'
  return 'File'
}

// Helper function to get badge variant for file type
function getFileTypeBadgeVariant(mimeType: string): "red" | "blue" | "green" | "amber" | "purple" | "gray" {
  if (mimeType.startsWith('image/')) return 'red'
  if (mimeType.startsWith('video/')) return 'red'
  if (mimeType.startsWith('audio/')) return 'red'
  if (mimeType.startsWith('text/')) return 'blue'
  if (mimeType.includes('pdf')) return 'red'
  if (mimeType.includes('word') || mimeType.includes('document')) return 'blue'
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'green'
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'amber'
  if (mimeType.includes('zip') || mimeType.includes('archive')) return 'gray'
  if (mimeType.includes('json')) return 'purple'
  if (mimeType.includes('javascript') || mimeType.includes('typescript') || mimeType.includes('python') || mimeType.includes('java') || mimeType.includes('cpp') || mimeType.includes('csharp') || mimeType.includes('php') || mimeType.includes('ruby') || mimeType.includes('go') || mimeType.includes('rust') || mimeType.includes('swift') || mimeType.includes('kotlin') || mimeType.includes('html') || mimeType.includes('css') || mimeType.includes('xml') || mimeType.includes('yaml') || mimeType.includes('markdown') || mimeType.includes('sql')) return 'purple'
  if (mimeType.includes('epub') || mimeType.includes('mobi') || mimeType.includes('azw') || mimeType.includes('fb2') || mimeType.includes('djvu')) return 'blue'
  return 'gray'
}


// Helper function to get file type icon
function getFileTypeIcon(mimeType: string) {
  // PDF
  if (mimeType.includes('pdf')) {
    return (
      <div className="size-5 bg-red-50 text-red-700 dark:text-red-400 dark:bg-red-900/20 ring-1 ring-inset ring-red-600/10 dark:ring-red-600/30 rounded-xs flex items-center justify-center">
        <span className="text-[8px] font-bold">PDF</span>
      </div>
    )
  }

  // Document
  if (mimeType.includes('word') || mimeType.includes('document') || mimeType.startsWith('text/')) {
    return (
      <div className="size-5 bg-blue-50 text-blue-700 dark:text-blue-400 dark:bg-blue-900/20 ring-1 ring-inset ring-blue-700/10 dark:ring-blue-600/30 rounded-xs p-0.5 flex items-center justify-center">
        <Text className="size-4" />
      </div>
    )
  }

  // Sheets/Spreadsheet
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
    return (
      <div className="size-5 bg-green-50 text-green-700 dark:text-green-400 dark:bg-green-900/20 ring-1 ring-inset ring-green-600/20 dark:ring-green-600/30 rounded-xs p-0.5 flex items-center justify-center">
        <Table2 className="size-4" />
      </div>
    )
  }

  // Presentation
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
    return (
      <div className="size-5 bg-amber-50 text-amber-800 dark:text-amber-400 dark:bg-amber-900/20 ring-1 ring-inset ring-amber-600/20 dark:ring-amber-600/30 rounded-xs p-0.5 flex items-center justify-center">
        <Presentation className="size-4" />
      </div>
    )
  }

  // Image
  if (mimeType.startsWith('image/')) {
    return (
      <div className="size-5 bg-red-50 text-red-700 dark:text-red-400 dark:bg-red-900/20 ring-1 ring-inset ring-red-600/10 dark:ring-red-600/30 rounded-xs p-0.5 flex items-center justify-center">
        <Image className="size-4" />
      </div>
    )
  }

  // Video
  if (mimeType.startsWith('video/')) {
    return (
      <div className="size-5 bg-red-50 text-red-700 dark:text-red-400 dark:bg-red-900/20 ring-1 ring-inset ring-red-600/10 dark:ring-red-600/30 rounded-xs p-0.5 flex items-center justify-center">
        <Clapperboard className="size-4" />
      </div>
    )
  }

  // Audio
  if (mimeType.startsWith('audio/')) {
    return (
      <div className="size-5 bg-red-50 text-red-700 dark:text-red-400 dark:bg-red-900/20 ring-1 ring-inset ring-red-600/10 dark:ring-red-600/30 rounded-xs p-0.5 flex items-center justify-center">
        <Headphones className="size-4" />
      </div>
    )
  }

  // JSON
  if (mimeType.includes('json')) {
    return (
      <div className="size-5 bg-red-50 text-purple-700 dark:text-purple-400 dark:bg-purple-900/20 ring-1 ring-inset ring-purple-600/10 dark:ring-purple-600/30 rounded-xs p-0.5 flex items-center justify-center">
        <Braces className="size-4" />
      </div>
    )
  }

  // Code files
  if (mimeType.includes('javascript') || mimeType.includes('typescript') || mimeType.includes('python') || mimeType.includes('java') || mimeType.includes('cpp') || mimeType.includes('csharp') || mimeType.includes('php') || mimeType.includes('ruby') || mimeType.includes('go') || mimeType.includes('rust') || mimeType.includes('swift') || mimeType.includes('kotlin') || mimeType.includes('html') || mimeType.includes('css') || mimeType.includes('xml') || mimeType.includes('yaml') || mimeType.includes('markdown') || mimeType.includes('sql')) {
    return (
      <div className="size-5 bg-red-50 text-purple-700 dark:text-purple-400 dark:bg-purple-900/20 ring-1 ring-inset ring-purple-600/10 dark:ring-purple-600/30 rounded-xs p-0.5 flex items-center justify-center">
        <Code className="size-4" />
      </div>
    )
  }

  // eBooks
  if (mimeType.includes('epub') || mimeType.includes('mobi') || mimeType.includes('azw') || mimeType.includes('fb2') || mimeType.includes('djvu')) {
    return (
      <div className="size-5 bg-blue-50 text-blue-700 dark:text-blue-400 dark:bg-blue-900/20 ring-1 ring-inset ring-blue-700/10 dark:ring-blue-600/30 rounded-xs p-0.5 flex items-center justify-center">
        <Book className="size-4" />
      </div>
    )
  }

  // Default file icon
  return (
    <div className="size-5 bg-gray-50 text-gray-700 dark:text-gray-400 dark:bg-gray-900/20 ring-1 ring-inset ring-gray-600/10 dark:ring-gray-600/30 rounded-xs p-0.5 flex items-center justify-center">
      <File className="size-4" />
    </div>
  )
}

// Clickable thumbnail component
function ClickableThumbnail({ file }: { file: UserFile }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleClick = () => {
    if (file.mime_type.startsWith('image/')) {
      setIsDialogOpen(true)
    }
  }

  return (
    <>
      <div 
        className={file.mime_type.startsWith('image/') ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}
        onClick={handleClick}
      >
        <FileThumbnail
          filePath={file.path}
          mimeType={file.mime_type}
          fileName={file.name}
          className="w-10 h-10"
        />
      </div>
      {file.mime_type.startsWith('image/') && (
        <ImageDialog
          filePath={file.path}
          mimeType={file.mime_type}
          fileName={file.name}
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
        />
      )}
    </>
  )
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
      
      return <ClickableThumbnail file={file} />
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
      
      return (
        <FileNameInput
          filePath={file.path}
          initialValue={file.name}
          placeholder="Enter file name..."
          className="font-medium text-sm border-0 shadow-none focus-visible:ring-0 h-6"
        />
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
      const badgeVariant = getFileTypeBadgeVariant(mimeType)
      
      return (
        <div className="flex items-center gap-1">
          {getFileTypeIcon(mimeType)}
        <Badge 
          variant={badgeVariant}
          className="text-xs font-normal flex items-center gap-1"
        >

          {fileType}
        </Badge>
        </div>
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
        { label: "Code", value: "code" },
        { label: "JSON", value: "json" },
        { label: "eBook", value: "ebook" },
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
