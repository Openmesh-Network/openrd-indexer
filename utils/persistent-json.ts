import storage from "node-persist"

import { replacer, reviver } from "./json"

export class PersistentJson<T> {
  private storageKey: string
  private value: any

  constructor(storageKey: string) {
    this.storageKey = storageKey
    this.value = undefined
  }

  public async get(): Promise<T> {
    if (this.value === undefined) {
      this.value = JSON.parse(
        (await storage.getItem(this.storageKey)) ?? JSON.stringify({}),
        reviver
      )
    }

    return this.value
  }

  public async update(update: (currentValue: T) => void): Promise<void> {
    const value = await this.get()
    // Edit the same object to prevent concurrency issues
    update(value)
    await storage.setItem(this.storageKey, JSON.stringify(value, replacer))
  }
}
