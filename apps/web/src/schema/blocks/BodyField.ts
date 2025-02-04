import alinea from 'alinea'
import {ChapterLinkBlock} from './ChapterLinkBlock'
import {CodeBlock} from './CodeBlock'
import {CodeVariantsBlock} from './CodeVariantsBlock'
import {ExampleBlock} from './ExampleBlock'
import {FrameworkBlock} from './FrameworkBlock'
import {ImageBlock} from './ImageBlock'
import {NoticeBlock} from './NoticeBlock'

export const BodyField = alinea.richText('Body', {
  schema: alinea.schema({
    CodeBlock,
    CodeVariantsBlock,
    ImageBlock,
    NoticeBlock,
    ChapterLinkBlock,
    ExampleBlock,
    FrameworkBlock
  }),
  inline: true
})

export const BodyBlock = alinea.type('Body text', {
  body: BodyField
})
