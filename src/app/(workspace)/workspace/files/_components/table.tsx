import { columns } from "./columns"
import { DataTable } from "@/components/data-table/data-table"
import { parseSearchParams, SearchParams } from "@/lib/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { TableWithPageContext } from "@/components/chat/table-with-context"
import { getFiles, deleteFiles, updateFile } from "@/actions/files"
import { UserFile } from "@/types"

interface DataTableFilesProps {
  searchParams?: SearchParams
}

export default async function DataTableFiles({ 
  searchParams = {} 
}: DataTableFilesProps) {
  const { data, count, error } = await getFiles(searchParams)
  const { pagination } = parseSearchParams(searchParams)

  if (error) {
    // TODO: Add a toast notification
    console.error(error)
  }

  const pageCount = Math.ceil((count ?? 0) / (pagination?.pageSize ?? 10))
  const initialState = {
    ...parseSearchParams(searchParams),
    columnVisibility: {
      // You can hide certain columns by default if needed
    },
  }

  // Cast the data and actions to match DataTable's expected types
  const tableData = (data || []) as unknown as Record<string, unknown>[]
  const tableColumns = columns as ColumnDef<Record<string, unknown>, unknown>[]
  
  const tableDeleteAction = deleteFiles as (ids: string[]) => Promise<{ success: boolean; error?: string; deletedCount?: number }>
  const tableUpdateActionSingle = updateFile as unknown as (id: string, data: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>
  
  // Note: We don't include createAction for files since file creation is handled via upload
  // and we don't have custom forms for files in this implementation

  return (
    <TableWithPageContext data={tableData} count={count ?? 0}>
      <DataTable 
        columns={tableColumns} 
        data={tableData} 
        pageCount={pageCount}
        initialState={initialState}
        deleteAction={tableDeleteAction}
        updateActionSingle={tableUpdateActionSingle}
        // No createAction - files are created via upload
        // No custom forms - using default data table forms
      />
    </TableWithPageContext>
  )
}
