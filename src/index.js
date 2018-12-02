//
// ImmortalDB - A resilient key-value store for browsers.
//
// Ansgar Grunseid
// grunseid.com
// grunseid@gmail.com
//
// License: MIT
//

import { CookieStore } from './cookie-store'
import { IndexedDbStore } from './indexed-db'
import { LocalStorageStore, SessionStorageStore } from './web-storage'

// Stores must implement asynchronous constructor, get(), set(), and remove()
// methods.
const DEFAULT_STORES = []
if (typeof window !== 'undefined') {
  DEFAULT_STORES.push(CookieStore)
  if (window.indexedDB) {
    DEFAULT_STORES.push(IndexedDbStore)
  }
  if (window.localStorage) {
    DEFAULT_STORES.push(LocalStorageStore)
  }
  if (window.sessionStorage) {
    DEFAULT_STORES.push(SessionStorageStore)
  }
}

const cl = console.log
const DEFAULT_KEY_PREFIX = '_immortal|'

function arrrayGet (arr, index, _default = null) {
  if (index in arr) {
    return arr[index]
  }
  return _default
}

function countUniques (iterable) {
  // A Map must be used instead of an Object because JavaScript is a buttshit
  // language and all Object keys are serialized to strings. Thus undefined
  // becomes 'undefined', null becomes 'null', etc and in turn null can't be
  // differentiated from 'null', 'undefined' from undefined, etc. E.g.
  // countUniques([null, 'null']) would incorrectly return {'null': 2} instead
  // of the correct {null: 1, 'null': 1}.
  //
  // Unfortunately this Object behavior precludes the use of lodash.countBy()
  // and similar methods which count with Objects instead of Maps.
  const m = new Map()
  let eles = iterable.slice()

  for (const ele of eles) {
    let count = 0
    for (const obj of eles) {
      if (ele === obj) {
        count += 1
      }
    }

    if (count > 0) {
      m.set(ele, count)
      eles = eles.filter(obj => obj !== ele)
    }
  }

  return m
}

class ImmortalStorage {
  constructor (stores = DEFAULT_STORES) {
    this.stores = []

    // Initialize stores asynchronously.
    this.onReady = (async () => {
      this.stores = (await Promise.all(stores.map(async Store => {
          try {
            return await new Store()
          } catch (err) {
            // TODO(grun): Log (where?) that the <Store> constructor failed.
            return null
          }
      }))).filter(Boolean)
    })()
  }

  async get (key, _default = null) {
    await this.onReady

    const prefixedKey = `${DEFAULT_KEY_PREFIX}${key}`

    const values = await Promise.all(
      this.stores.map(async store => {
        try {
          return await store.get(prefixedKey)
        } catch (err) {
          cl(err)
        }
      }),
    )

    const counted = Array.from(countUniques(values).entries())
    counted.sort((a, b) => a[1] <= b[1])

    let value
    const [firstValue, firstCount] = arrrayGet(counted, 0, [undefined, 0])
    const [secondValue, secondCount] = arrrayGet(counted, 1, [undefined, 0])
    if (firstCount > secondCount ||
        (firstCount === secondCount && firstValue !== undefined)) {
      value = firstValue
    } else {
      value = secondValue
    }

    if (value !== undefined) {
      await this.set(key, value)
      return value
    } else {
      await this.remove(key)
      return _default
    }
  }

  async set (key, value) {
    await this.onReady

    key = `${DEFAULT_KEY_PREFIX}${key}`

    await Promise.all(
      this.stores.map(async store => {
        try {
          await store.set(key, value)
        } catch (err) {
          cl(err)
        }
      }),
    )

    return value
  }

  async remove (key) {
    await this.onReady

    key = `${DEFAULT_KEY_PREFIX}${key}`

    await Promise.all(
      this.stores.map(async store => {
        try {
          await store.remove(key)
        } catch (err) {
          cl(err)
        }
      }),
    )
  }
}

const ImmortalDB = new ImmortalStorage()

export {
  ImmortalDB,
  ImmortalStorage,
  CookieStore,
  IndexedDbStore,
  LocalStorageStore,
  SessionStorageStore,
  DEFAULT_STORES,
  DEFAULT_KEY_PREFIX,
}
