import dynamic from 'next/dynamic'

interface RichEditorProps {
  content: string
  onChange: (html: string) => void
}

const RichEditorClient = dynamic(() => import('./RichEditorClient'), {
  ssr: false,
  loading: () => <div className="h-10 bg-gray-100 animate-pulse rounded-lg" />,
})

export default function RichEditor(props: RichEditorProps) {
  return <RichEditorClient {...props} />
}
