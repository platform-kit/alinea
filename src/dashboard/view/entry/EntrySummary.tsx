import {Entry, Type, view} from 'alinea/core'
import {Projection} from 'alinea/core/pages/Projection'
import {Chip, HStack, TextLabel, Typo, VStack, fromModule} from 'alinea/ui'
import {Ellipsis} from 'alinea/ui/Ellipsis'
import {IcRoundKeyboardArrowRight} from 'alinea/ui/icons/IcRoundKeyboardArrowRight'
import {Fragment, ReactNode} from 'react'
import {useDashboard} from '../../hook/UseDashboard.js'
import {useNav} from '../../hook/UseNav.js'
import css from './EntrySummary.module.scss'

const styles = fromModule(css)

export function entrySummaryQuery() {
  return {
    entryId: Entry.entryId,
    i18nId: Entry.i18nId,
    type: Entry.type,
    workspace: Entry.workspace,
    root: Entry.root,
    title: Entry.title,
    parents({parents}) {
      return parents(Entry).select({
        entryId: Entry.entryId,
        i18nId: Entry.i18nId,
        title: Entry.title
      })
    },
    childrenAmount({children}) {
      return children(Entry).count()
    }
  } satisfies Projection
}

type SummaryProps = Projection.Infer<ReturnType<typeof entrySummaryQuery>>

export const EntrySummaryRow = view(
  entrySummaryQuery,
  function EntrySummaryRow({
    entryId,
    title,
    type: typeName,
    parents
  }: SummaryProps) {
    const nav = useNav()
    const {schema} = useDashboard().config
    const type = schema[typeName]
    if (!type) return null
    return (
      <HStack center full gap={10} className={styles.row()}>
        <VStack>
          {parents.length > 0 && (
            <Ellipsis>
              <Typo.Small>
                <HStack center gap={3}>
                  {parents
                    .map<ReactNode>(({entryId, title}) => (
                      <Fragment key={entryId}>{title}</Fragment>
                    ))
                    .reduce((prev, curr, i) => [
                      prev,
                      <IcRoundKeyboardArrowRight key={`s${i}`} />,
                      curr
                    ])}
                </HStack>
              </Typo.Small>
            </Ellipsis>
          )}
          <Ellipsis>
            <TextLabel label={title} />
          </Ellipsis>
        </VStack>
        <Chip style={{marginLeft: 'auto'}}>
          <TextLabel label={Type.label(type)} />
        </Chip>
      </HStack>
    )
  }
)

export const EntrySummaryThumb = view(
  entrySummaryQuery,
  function EntrySummaryThumb({
    entryId,
    title,
    type: typeName,
    parents
  }: SummaryProps) {
    const {schema} = useDashboard().config
    const type = schema[typeName]!
    return (
      <div className={styles.thumb()}>
        {parents.length > 0 && (
          <header className={styles.thumb.header()}>
            <Typo.Small>
              <HStack center gap={3}>
                {parents
                  .map<ReactNode>(({entryId, title}) => (
                    <Fragment key={entryId}>{title}</Fragment>
                  ))
                  .reduce((prev, curr, i) => [
                    prev,
                    <IcRoundKeyboardArrowRight key={`s${i}`} />,
                    curr
                  ])}
              </HStack>
            </Typo.Small>
          </header>
        )}
        <div className={styles.thumb.title()}>
          <TextLabel label={title} />
        </div>
        <div className={styles.thumb.footer()}>
          <Chip style={{marginLeft: 'auto'}}>
            <TextLabel label={Type.label(type)} />
          </Chip>
        </div>
      </div>
    )
  }
)
