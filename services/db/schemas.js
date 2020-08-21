import { Model, tableSchema } from '@nozbe/watermelondb'
import { field, json } from '@nozbe/watermelondb/decorators'

const membershipSchema = tableSchema({
    name: 'memberships',
    columns: [
        { name: 'room_id', type: 'string', isIndexed: true },
        { name: 'value', type: 'string' }
    ]
})
class MembershipModel extends Model {
    static table = 'memberships'

    @field('room_id') roomId
    @json('value', json => json) value
}

const roomSchema = tableSchema({
    name: 'rooms',
    columns: [
        { name: 'membership', type: 'string' },
        { name: 'data', type: 'string' }
    ]
})
class RoomModel extends Model {
    static table = 'rooms'

    @field('membership') membership
    @json('data', json => json) data
}

const userSchema = tableSchema({
    name: 'users',
    columns: [
        { name: 'value', type: 'string' }
    ]
})
class UserModel extends Model {
    static table = 'users'

    @json('value', json => json) value
}

export const schemas = [membershipSchema, roomSchema, userSchema]
export const models = [MembershipModel, RoomModel, UserModel]
