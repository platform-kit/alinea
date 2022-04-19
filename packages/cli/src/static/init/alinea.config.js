import {
  createConfig,
  MediaSchema,
  path,
  schema,
  text,
  type,
  Welcome,
  workspace
} from 'alinea'
import {MdInsertDriveFile, MdOutlinePermMedia} from 'react-icons/md'

export const config = createConfig({
  workspaces: {
    main: workspace('Example', {
      source: './content',
      schema: schema({
        ...MediaSchema,
        Page: type(
          'Page',
          {
            title: text('Title'),
            path: path('Path')
          },
          <Welcome />
        ).configure({isContainer: true})
      }),
      roots: {
        data: {
          icon: MdInsertDriveFile,
          contains: ['Page']
        },
        media: {
          icon: MdOutlinePermMedia,
          contains: ['MediaLibrary']
        }
      }
    })
  }
})