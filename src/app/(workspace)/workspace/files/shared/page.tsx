export default async function SharedPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams

  return (
    <main className="h-full">
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <h1 className="text-2xl font-semibold">Shared</h1>
        <p className="text-muted-foreground">Shared files will be displayed here</p>
      </div>
    </main>
  )
}

