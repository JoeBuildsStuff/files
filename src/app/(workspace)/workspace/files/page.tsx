import DataTableFiles from "./_components/table"
import { DragDropWrapper } from "./_components/drag-drop-wrapper"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams

  return (
    <main className="h-full">
      <DragDropWrapper>
        <DataTableFiles searchParams={params} />
      </DragDropWrapper>
    </main>
  )
}