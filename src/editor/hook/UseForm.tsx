import {ROOT_KEY} from 'alinea/core/Doc'
import {Field} from 'alinea/core/Field'
import {Type} from 'alinea/core/Type'
import {RecordMutator, RecordShape} from 'alinea/core/shape/RecordShape'
import {entries} from 'alinea/core/util/Objects'
import {Observable, observable} from 'alinea/ui/util/Observable'
import {useEffect, useMemo} from 'react'
import * as Y from 'yjs'
import {InputState} from '../InputState.js'
import {FieldState} from './UseField.js'

interface FormStateOptions<V, M> {
  shape: RecordShape<V>
  root: Y.Map<any>
  key: string
  attach?: (v: V) => void
}

export class FormState<V extends Record<string, any>, M>
  implements InputState<readonly [V, M]>
{
  constructor(private options: FormStateOptions<V, M>) {}

  parent() {
    return undefined
  }

  child(field: string): InputState<any> {
    // Todo: cache these
    const {root, shape, key} = this.options
    const current = root.get(key)
    return new FieldState({
      shape: shape.typeOfChild(current, field),
      root: current,
      key: field,
      parent: this
    })
  }

  use(): readonly [V, M] {
    const {root, shape, key, attach} = this.options
    const {current, mutator, observe} = useMemo(() => {
      const current = (): V => shape.fromY(root.get(key))
      const mutator = shape.mutator(root, key, false) as any
      const observe = (fun: () => void) => {
        const record = root.get(key)
        record.observeDeep(fun)
        return () => record.unobserveDeep(fun)
      }
      return {current, mutator, observe}
    }, [])
    const redraw = () => {
      if (attach) attach(current())
      // useForceUpdate()
    }
    useEffect(() => {
      return observe(redraw)
    }, [observe, redraw])
    return [current(), mutator] as const
  }
}

export interface ObservableForm<T extends Record<string, any>>
  extends Observable.Writable<Type.Infer<T>> {
  type: Type<T>
  state: FormState<T, RecordMutator<T>>
  field<K extends keyof T>(name: K): Observable<T[K]>
}

export type FormOptions<T> = {
  type: Type<T>
  initialValue?: Partial<Type.Infer<T>>
}

function createFormInput<T extends Record<string, any>>(
  options: FormOptions<T>
): ObservableForm<T> {
  const {type, initialValue = {}} = options
  const initial: Record<string, any> = initialValue
  const doc = new Y.Doc()
  const root = doc.getMap(ROOT_KEY)
  for (const [key, f] of entries(type)) {
    const field: Field = f
    if (!initial[key]) initial[key] = Field.shape(field).create()
    root.set(key, Field.shape(field).toY(initial[key]!))
  }
  function setValue(data: T) {
    for (const [key, value] of Object.entries(data)) {
      const field = Type.field(type, key)
      if (field) root.set(key, Field.shape(field).toY(value))
    }
  }
  const input = observable<T>(initial as T)
  const state = new FormState({
    shape: Type.shape(type),
    root: doc as any,
    key: ROOT_KEY,
    attach: input
  })
  const fields = new Map<string, any>()
  function field(name: string) {
    if (fields.has(name)) return fields.get(name)
    const fieldInput = input.select(data => {
      return data[name]
    })
    fields.set(name, fieldInput)
    return fieldInput
  }
  return Object.assign(
    function () {
      if (arguments.length === 1) return setValue(arguments[0])
      return input()
    },
    {type, state, field}
  ) as any
}

export function useForm<T extends Record<string, any>>(
  options: FormOptions<T>,
  deps: ReadonlyArray<unknown> = []
): ObservableForm<T> {
  const form = useMemo(() => createFormInput(options), deps)
  form.state.use()
  return form
}
