import { appSchema, Database as WatermelonDB } from '@nozbe/watermelondb'
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite'

import { models, schemas } from './schemas'

class Storage {
    _db

    constructor (options) {
        this._db = new WatermelonDB(options)
    }

    async action (func) {
        return this._db.action(func)
    }

    async batch (actions) {
        return this.action(async () => this._db.batch(...actions))
    }

    getCollection (collection) {
        return this._db.collections.get(collection)
    }

    async getItem (key) {
        return this._db.adapter.getLocal(key)
    }

    async setItem (key, value) {
        return this._db.adapter.setLocal(key, value)
    }

    async reset () {
        return this.action(async () => this._db.unsafeResetDatabase())
    }
}

const schema = appSchema({
    version: 2,
    tables: [...schemas]
})
const adapter = new SQLiteAdapter({
    schema
})

const storage = new Storage({
    adapter,
    modelClasses: [...models],
    actionsEnabled: true
})
export default storage
