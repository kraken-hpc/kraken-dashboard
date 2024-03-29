// Import the core angular services.
import { BehaviorSubject } from 'rxjs'
import { distinctUntilChanged } from 'rxjs/operators'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import _, { pick, isEqual, isEqualWith } from 'lodash'

export class SimpleStore<StateType = any> {
  private stateSubject: BehaviorSubject<StateType>

  // Initialize the simple store with the given initial state value.
  constructor(initialState: StateType) {
    this.stateSubject = new BehaviorSubject(initialState)
  }

  // Get the current state as a stream (will always emit the current state value as
  // the first item in the stream).
  public getState(): Observable<StateType> {
    return this.stateSubject.pipe(distinctUntilChanged())
  }

  // Get the current state snapshot.
  public getStateSnapshot(): StateType {
    return this.stateSubject.getValue()
  }

  // Return the given top-level state key as a stream (will always emit the current
  // key value as the first item in the stream).
  public select<K extends keyof StateType>(key: K): Observable<StateType[K]> {
    var selectStream = this.stateSubject.pipe(
      map((state: StateType) => {
        return state[key]
      }),
      distinctUntilChanged((a, b) => isEqual(a, b))
    )

    return selectStream
  }

  // Select multiple keys to subscribe to
  public selectMany<KA extends (keyof StateType)[], K extends keyof StateType>(
    keys: KA
  ): Observable<Array<StateType[K]>> {
    var selectStream = this.stateSubject.pipe(
      map((state: StateType) => {
        const retVal = Object.values(pick(state, keys)) as Array<StateType[K]>
        // console.log('select many: ', retVal)
        return retVal
        // return state[keys]
      }),
      distinctUntilChanged((objA, objB) => {
        const equal = isEqual(objA, objB)
        // if (!equal) {
        //   console.log(objA, objB)
        // }
        return equal
      })
    )

    return selectStream
  }

  // Move the store to a new state by merging the given partial state into the
  // existing state (creating a new state object).
  // --
  // CAUTION: Partial<T> does not currently project against "undefined" values. This is
  // a known type safety issue in TypeScript.
  public setState(partialState: Partial<StateType>): void {
    var currentState = this.getStateSnapshot()
    var nextState = Object.assign({}, currentState, partialState)

    this.stateSubject.next(nextState)
  }
}
