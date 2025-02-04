import {createExample} from 'alinea/backend/test/Example'
import {
  queryClientAtom,
  useSetDashboardOptions
} from 'alinea/dashboard/atoms/DashboardAtoms'
import {UIStory} from 'alinea/ui/UIStory'
import {useAtomValue} from 'jotai'
import {useState} from 'react'
import {QueryClientProvider} from 'react-query'
import {EntryPickerModal} from './EntryPicker.browser.js'

const example = createExample()
const client = await example.connection()

export function ImagePicker() {
  const queryClient = useAtomValue(queryClientAtom)
  useSetDashboardOptions({
    config: example,
    client: client,
    dev: true
  })
  const [open, setOpen] = useState(true)
  return (
    <QueryClientProvider client={queryClient}>
      <UIStory>
        {open ? (
          <EntryPickerModal
            type="image"
            selection={[]}
            options={{
              hint: undefined!,
              selection: undefined!,
              showMedia: true
            }}
            onConfirm={console.log}
            onCancel={() => setOpen(false)}
          />
        ) : (
          <button onClick={() => setOpen(true)}>Open</button>
        )}
      </UIStory>
    </QueryClientProvider>
  )
}

export function EntryPicker() {
  const queryClient = useAtomValue(queryClientAtom)
  useSetDashboardOptions({
    config: example,
    client: client,
    dev: true
  })
  const [open, setOpen] = useState(true)
  return (
    <QueryClientProvider client={queryClient}>
      <UIStory>
        {open ? (
          <EntryPickerModal
            type="entry"
            selection={[]}
            options={{
              hint: undefined!,
              selection: undefined!
            }}
            onConfirm={console.log}
            onCancel={() => setOpen(false)}
          />
        ) : (
          <button onClick={() => setOpen(true)}>Open</button>
        )}
      </UIStory>
    </QueryClientProvider>
  )
}
