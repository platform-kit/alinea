import {
  accumulate,
  Auth,
  createError,
  createId,
  Entry,
  future,
  Future,
  Hub,
  Media,
  outcome,
  Schema
} from '@alinea/core'
import {encode} from 'base64-arraybuffer'
import crypto from 'crypto'
import express from 'express'
import {Cursor, Functions, Store} from 'helder.store'
import {createServer, IncomingMessage, ServerResponse} from 'http'
import {posix as path} from 'path'
import {Cache} from './Cache'
import {Data} from './Data'
import {Drafts} from './Drafts'
import {createServerRouter} from './router/ServerRouter'
import {finishResponse} from './util/FinishResponse'

export type ServerOptions<T> = {
  schema: Schema<T>
  store: Store
  drafts: Drafts
  target: Data.Target
  media: Data.Media
  auth?: Auth.Server
  dashboardUrl: string
}

export class Server<T = any> implements Hub<T> {
  schema: Schema<T>
  app = express()

  constructor(public options: ServerOptions<T>) {
    this.schema = options.schema
    this.app.use(createServerRouter(this))
  }

  async entry(
    id: string,
    stateVector?: Uint8Array
  ): Future<Entry.Detail | null> {
    const {schema, store, drafts} = this.options
    function parents(entry: Entry): Array<string> {
      if (!entry.$parent) return []
      const parent = store.first(Entry.where(Entry.id.is(entry.$parent)))
      return parent ? [parent.id, ...parents(parent)] : []
    }
    const draft = await drafts.get(id, stateVector)
    return future(
      queryWithDrafts(schema, store, drafts, () => {
        const entry = store.first(Entry.where(Entry.id.is(id)))
        return (
          entry && {
            entry,
            parents: parents(entry),
            draft: draft && encode(draft)
          }
        )
      })
    )
  }

  async list(parentId?: string): Future<Array<Entry.Summary>> {
    const {schema, store, drafts} = this.options
    const Parent = Entry.as('Parent')
    return future(
      queryWithDrafts(schema, store, drafts, () => {
        return store.all(
          Entry.where(
            parentId ? Entry.$parent.is(parentId) : Entry.$parent.isNull()
          ).select({
            id: Entry.id,
            type: Entry.type,
            title: Entry.title,
            url: Entry.url,
            $parent: Entry.$parent,
            preview: Entry.get('preview'),
            $isContainer: Entry.$isContainer,
            childrenCount: Parent.where(Parent.$parent.is(Entry.id))
              .select(Functions.count())
              .first()
          })
        )
      })
    )
  }

  async query<T>(cursor: Cursor<T>): Future<Array<T>> {
    const {schema, store, drafts} = this.options
    return outcome(() => {
      return store.all(cursor)
    })
  }

  updateDraft(id: string, update: Uint8Array): Future<void> {
    const {drafts} = this.options
    return future(drafts.update(id, update))
  }

  deleteDraft(id: string): Future<void> {
    const {drafts} = this.options
    return future(drafts.delete([id]))
  }

  publishEntries(entries: Array<Entry>): Future<void> {
    const {store, drafts, target} = this.options
    return outcome(async () => {
      await target.publish(entries)
      // Todo: This makes updates instantly available but should be configurable
      // Todo: if there's another instance running it won't have the drafts or
      // these changes so it would show the old data, so maybe we should always
      // hang on to drafts?
      Cache.applyPublish(store, entries)
      await drafts.delete(entries.map(entry => entry.id))
    })
  }

  async uploadFile(file: Data.Media.Upload): Future<Media.File> {
    const {store, drafts, target} = this.options
    return outcome(async () => {
      const id = createId()
      const {media} = this.options
      const parentUrl = path.dirname(file.path)
      const parent = store.first(Entry.where(Entry.url.is(parentUrl)))
      if (!parent) throw createError(400, `Parent not found: "${parentUrl}"`)
      const location = await media.upload(file)
      const extension = path.extname(location)
      const entry: Media.File = {
        id,
        type: 'File',
        $parent: parent.id,
        title: path.basename(file.path, extension),
        url: file.path,
        location,
        extension: extension,
        size: file.buffer.byteLength,
        hash: crypto
          .createHash('md5')
          .update(Buffer.from(file.buffer))
          .digest('hex'),
        preview: file.preview
      }
      await this.publishEntries([entry])
      return entry
    })
  }

  respond = (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    this.app(req, res)
    // Next.js expects us to return a promise that resolves when we're finished
    // with the response.
    return finishResponse(res)
  }

  listen(port: number) {
    return createServer(this.respond).listen(port)
  }
}

async function queryWithDrafts<T>(
  schema: Schema,
  store: Store,
  drafts: Drafts,
  run: () => T
): Promise<T> {
  const updates = await accumulate(drafts.updates())
  let result: T | undefined
  try {
    return store.transaction(() => {
      Cache.applyUpdates(store, schema, updates)
      result = run()
      throw 'rollback'
    })
  } catch (e) {
    if (e === 'rollback') return result!
    throw e
  }
}
