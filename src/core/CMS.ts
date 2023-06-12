import {Store} from 'alinea/backend/Store'
import {Config} from './Config.js'
import {Connection} from './Connection.js'
import {Graph, GraphApi} from './Graph.js'
import {Root} from './Root.js'
import {Workspace} from './Workspace.js'
import {entries} from './util/Objects.js'

type Attachment = Workspace | Root
const attached = new WeakMap<Attachment, CMS>()

export type Location = Root | Workspace

export interface CMSApi extends GraphApi {
  createStore(cwd: string): Promise<Store>
  connection(): Promise<Connection>
}

export abstract class CMS extends Graph implements Config {
  constructor(public config: Config) {
    super(config, async params => {
      const cnx = await this.connection()
      return cnx.resolve(params)
    })
    this.#attach(config)
  }

  abstract createStore(cwd: string): Promise<Store>
  abstract connection(): Promise<Connection>

  #attach(config: Config) {
    for (const [name, workspace] of entries(config.workspaces)) {
      if (attached.has(workspace))
        throw new Error(`Workspace is already attached to a CMS: ${name}`)
      attached.set(workspace, this)
      for (const [name, root] of entries(workspace)) {
        if (attached.has(root))
          throw new Error(`Root is already attached to a CMS: ${name}`)
        attached.set(root, this)
      }
    }
  }

  get schema() {
    return this.config.schema
  }

  get workspaces() {
    return this.config.workspaces
  }

  get backend() {
    return this.config.backend
  }

  get preview() {
    return this.config.preview
  }
}

export class DefaultCMS extends CMS {
  async createStore(cwd: string): Promise<Store> {
    const {default: BetterSqlite3} = await import('better-sqlite3')
    const {connect} = await import('rado/driver/better-sqlite3')
    const db = new BetterSqlite3(`${cwd}/.alinea/content.sqlite`)
    db.pragma('journal_mode = WAL')
    const cnx = connect(db)
    return cnx.toAsync()
  }

  async connection(): Promise<Connection> {
    // const isBrowser = typeof window !== 'undefined'
    // if (isBrowser) return new Client(this.config)
    throw new Error('Method not implemented.')
  }
}

export namespace CMS {
  export const Link = Symbol.for('@alinea/CMS.Link')

  export function instanceFor(attachment: Attachment): CMS {
    const cms = attached.get(attachment)
    if (!cms) throw new Error(`No CMS attached to ${attachment}`)
    return cms
  }
}

export function createCMS<Definition extends Config>(
  config: Definition
): Definition & CMSApi {
  return new DefaultCMS(config) as any
}