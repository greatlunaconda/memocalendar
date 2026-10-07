import MemoEditor from '@/app/edit/MemoEditor'

// Next 15 以降、params は Promise
export default async function EditPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params
  return <MemoEditor date={date} />
}
