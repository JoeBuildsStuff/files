export default async function ImagePage({
    params,
  }: {
    params: Promise<{ id: string }>
  }) {
    const {id} = await params

    return (
        <div>
            {id}
        </div>
    )
  }