import {createId} from 'alinea/core/Id'
import {Callable} from 'rado/util/Callable'
import {createExprData} from './CreateExprData.js'
import {Cursor} from './Cursor.js'
import {EV, Expr, and} from './Expr.js'
import {BinaryOp, ExprData} from './ExprData.js'
import {Fields} from './Fields.js'
import {TargetData} from './TargetData.js'

const {create, entries} = Object

export declare class TargetI<Row = object> {
  get [Target.IsTarget](): true
  get [Target.Data](): TargetData
}

export interface TargetI<Row = object> extends Callable {
  (conditions?: {
    [K in keyof Row]?: EV<Row[K]>
  }): Cursor.Find<Row>
}

export type Target<Row> = Target.Definition<Row> & TargetI<Row>

export namespace Target {
  export type Definition<Row> = {
    [K in keyof Row as K extends string ? K : never]: Fields<Row[K]>
  }
}

export const Target = class {
  static readonly Data = Symbol.for('@alinea/Target.Data')
  static readonly IsTarget = Symbol.for('@alinea/Target.IsTarget')
  cache = create(null)

  constructor(public data: TargetData) {}

  static isTarget<T>(target: any): target is TargetI<T> {
    return target && target[Target.IsTarget]
  }

  call(...input: Array<any>) {
    return new Cursor.Find({
      target: this.data,
      where: this.condition(input)
    })
  }

  condition(input: Array<any>): ExprData | undefined {
    if (input.length === 0) return undefined
    const isConditionalRecord = input.length === 1 && !Expr.isExpr(input[0])
    const conditions = isConditionalRecord
      ? entries(input[0]).map(([key, value]) => {
          const field = Expr(ExprData.Field(this.data, key))
          return Expr(
            ExprData.BinOp(
              field[Expr.Data],
              BinaryOp.Equals,
              createExprData(value)
            )
          )
        })
      : input.map(ev => Expr(createExprData(ev)))
    return and(...conditions)[Expr.Data]
  }

  get(field: string) {
    if (field in this.cache) return this.cache[field]
    return (this.cache[field] = Expr(ExprData.Field(this.data, field)))
  }

  static create<T>(data: TargetData): Target<T> {
    const impl = new this(data)
    const name = data.name || 'target'
    const call = {[name]: (...args: Array<any>) => impl.call(...args)}[name]
    const rowId = `@@@${createId()}`
    return new Proxy<any>(call, {
      ownKeys() {
        return [rowId]
      },
      getOwnPropertyDescriptor() {
        return {enumerable: true, configurable: true}
      },
      get: (_, prop) => {
        if (typeof prop === 'string') {
          if (prop === rowId) return data
          return impl.get(prop)
        }
        switch (prop) {
          case Target.IsTarget:
            return true
          case Target.Data:
            return data
        }
      }
    })
  }
}
