import { Q } from '@nozbe/watermelondb'
import { MatrixEvent, MemoryStore, SyncAccumulator, User } from 'matrix-js-sdk'
import { InteractionManager } from 'react-native'

import storage from './storage'

const WRITE_DELAY_MS = 1000 * 60 // once every minute

export default class Store extends MemoryStore {

    async startup () {
        if (this.startedUp) {
            return
        }

        try {
            await InteractionManager.runAfterInteractions({
                name: `SqlStore.load.data`,
                gen: async () => {
                    const jsonAccountData = await storage.getItem('account_data')
                    const accountData = jsonAccountData ? JSON.parse(jsonAccountData) : null
                    const jsonSyncData = await storage.getItem('sync')
                    const syncData = jsonSyncData ? JSON.parse(jsonSyncData) : {
                        nextBatch: null,
                        groupsData: null
                    }
                    if (!jsonSyncData) this._isNewlyCreated = true

                    const roomsData = { join: {}, invite: {}, leave: {} }
                    const dbRooms = await storage.getCollection('rooms').query().fetch()
                    for (const dbRoom of dbRooms) {
                        roomsData[dbRoom.membership][dbRoom.id] = dbRoom.data
                    }

                    this._syncAccumulator.accumulate({
                        next_batch: syncData.nextBatch,
                        rooms: roomsData,
                        groups: syncData.groupsData,
                        account_data: {
                            events: accountData
                        }
                    })

                    const dbUsers = await storage.getCollection('users').query().fetch()
                    for (const user of dbUsers) {
                        const u = new User(user.userId)
                        if (user.event) {
                            u.setPresenceEvent(new MatrixEvent(user.event))
                        }
                        this._userModifiedMap[u.userId] = u.getLastModifiedTime()
                        this.storeUser(u)
                    }
                }
            })
        } catch (e) {

        }
    }

    async getSavedSync () {
        const data = this._syncAccumulator.getJSON()
        if (!data.nextBatch) return null
        return JSON.parse(JSON.stringify(data))
    }

    isNewlyCreated () {
        return this._isNewlyCreated
    }

    async getSavedSyncToken () {
        return this._syncAccumulator.getNextBatchToken()
    }

    async deleteAllData () {
        return storage.reset
    }

    wantsSave () {
        const now = Date.now()
        return now - this._syncTs > WRITE_DELAY_MS
    }

    save (force) {
        return new Promise((resolve) => {
            if (!this._isSaving && (force || this.wantsSave())) {
                this._isSaving = true
                InteractionManager.runAfterInteractions(async () => {
                    this._syncTs = Date.now()
                    await this._syncToStorage()
                    this._isSaving = false
                    resolve()
                })
            } else {
                resolve()
            }
        })
    }

    async _syncToStorage () {
        try {
            const syncData = this._syncAccumulator.getJSON()

            const updatedUserPresences = []
            for (const u of this.getUsers()) {
                if (this._userModifiedMap[u.userId] === u.getLastModifiedTime()) continue
                if (!u.events.presence) continue

                updatedUserPresences.push({
                    userId: u.userId,
                    event: u.events.presence.event
                })
                this._userModifiedMap[u.userId] = u.getLastModifiedTime()
            }

            const usersSync = []
            await InteractionManager.runAfterInteractions({
                name: `SqlStore.build.users`,
                gen: async () => {
                    if (updatedUserPresences.length > 0) {
                        const dbUsers = await storage.getCollection('users').query().fetch()
                        for (const userPresence of updatedUserPresences) {
                            const dbUser = dbUsers.find((user) => user.id === userPresence.userId)
                            if (dbUser) {
                                const updatedUser = dbUser.prepareUpdate(user => {
                                    user.value = userPresence
                                })
                                usersSync.push(updatedUser)
                            } else {
                                const newUser = storage.getCollection('users').prepareCreate(user => {
                                    user._raw.id = userPresence.userId
                                    user.value = userPresence
                                })
                                usersSync.push(newUser)
                            }
                        }
                    }
                }
            })

            const roomsSync = []
            await InteractionManager.runAfterInteractions({
                name: `SqlStore.build.rooms`,
                gen: async () => {
                    const dbRooms = await storage.getCollection('rooms').query().fetch()
                    for (const [membership, syncRooms] of Object.entries(syncData.roomsData)) {
                        for (const [roomId, roomData] of Object.entries(syncRooms)) {
                            const roomIndex = dbRooms.findIndex(room => room.id === roomId)
                            if (roomIndex === -1) {
                                const newRoom = storage.getCollection('rooms').prepareCreate(room => {
                                    room._raw.id = roomId
                                    room.membership = membership
                                    room.data = roomData
                                })
                                roomsSync.push(newRoom)
                            } else {
                                const updatedRoom = dbRooms[roomIndex].prepareUpdate(room => {
                                    room.membership = membership
                                    room.data = roomData
                                })
                                roomsSync.push(updatedRoom)
                                dbRooms.splice(roomIndex, 1)
                            }
                        }
                    }
                    if (dbRooms.length > 0) {
                        for (const dbRoom of dbRooms) {
                            roomsSync.push(dbRoom.prepareDestroyPermanently())
                        }
                    }
                }
            })

            if (usersSync.length > 0 || roomsSync.length > 0) {
                await InteractionManager.runAfterInteractions({
                    name: `SqlStore.store.rooms_users`,
                    gen: async () => {
                        await storage.batch([...usersSync, ...roomsSync])
                    }
                })
            }

            await InteractionManager.runAfterInteractions({
                name: `SqlStore.store.account_data`,
                gen: async () => {
                    await storage.setItem(
                        'account_data',
                        JSON.stringify(syncData.accountData)
                    )
                }
            })

            await InteractionManager.runAfterInteractions({
                name: `SqlStore.store.sync`,
                gen: async () => {
                    await storage.setItem(
                        'sync',
                        JSON.stringify({
                            nextBatch: syncData.nextBatch,
                            groupsData: syncData.groupsData
                        })
                    )
                }
            })
        } catch (e) {

        }
    }

    async setSyncData (syncData) {
        return this._syncAccumulator.accumulate(syncData)
    }

    async getOutOfBandMembers (roomId) {
        const memberships = []
        let oobWritten = false
        const dbMemberships = await storage.getCollection('memberships')
            .query(Q.where('room_id', roomId))
            .fetch()
        for (const membership of dbMemberships) {
            if (membership.oob_written) {
                oobWritten = true
            } else {
                memberships.push(membership)
            }
        }
        if (memberships.length > 0 || oobWritten) {
            return memberships
        }
    }

    async setOutOfBandMembers (roomId, membershipEvents) {
        MemoryStore.prototype.setOutOfBandMembers.call(this, roomId, membershipEvents)

        const dbMemberships = await storage.getCollection('memberships')
            .query(Q.where('room_id', roomId))
            .fetch()
        const membershipsSync = []
        for (const membershipEvent of membershipEvents) {
            const dbMembership = dbMemberships.find((membership) =>
                membership.id === `${roomId}:${membershipEvent.state_key}`
            )
            if (dbMembership) {
                const updatedMembership = dbMembership.prepareUpdate(membership => {
                    membership.value = membershipEvent
                })
                membershipsSync.push(updatedMembership)
            } else {
                const newMembership = storage.getCollection('memberships').prepareCreate(membership => {
                    membership._raw.id = `${roomId}:${membershipEvent.state_key}`
                    membership.roomId = roomId
                    membership.value = membershipEvent
                })
                membershipsSync.push(newMembership)
            }
        }
        // aside from all the events, we also write a marker object to the store
        // to mark the fact that OOB members have been written for this room.
        // It's possible that 0 members need to be written as all where previously know
        // but we still need to know whether to return null or [] from getOutOfBandMembers
        // where null means out of band members haven't been stored yet for this room
        const dbMarker = dbMemberships.find((membership) => membership.id === roomId)
        if (!dbMarker) {
            const newMembership = storage.getCollection('memberships').prepareCreate((membership) => {
                membership._raw.id = roomId
                membership.roomId = roomId
                membership.value = { oob_written: true }
            })
            membershipsSync.push(newMembership)
        }
        await storage.batch(membershipsSync)
    }

    async clearOutOfBandMembers (roomId) {
        MemoryStore.prototype.clearOutOfBandMembers.call(this)

        return storage.action(async () => {
            await storage.getCollection('memberships')
                .query(Q.where('room_id', roomId))
                .destroyAllPermanently()
        })
    }

    async getClientOptions () {
        const jsonClientOptions = await storage.getItem('client_options')
        return JSON.parse(jsonClientOptions)
    }

    async storeClientOptions (options) {
        MemoryStore.prototype.storeClientOptions.call(this, options)

        return storage.setItem('client_options', JSON.stringify(options))
    }
}
