import auth from '@react-native-firebase/auth'
import firestore from '@react-native-firebase/firestore'
import {
  agentToAgentDetails,
  CreateFileMessageFromUrlPayload,
  CreateFileMessagePayload,
  CreateTextMessagePayload,
  IRoom,
  Types,
  userToUserDetails,
} from '@wezard/halo-core'
import { CollectionName } from './utils'

export class Room implements IRoom {
  public async getRoomDetails(roomId: string): Promise<Types.RoomDetails> {
    const roomDoc = await firestore().collection(CollectionName.rooms).doc(roomId).get()
    if (!roomDoc.exists) {
      throw new Error('[Halo@getRoomDetails] room not found')
    }

    const roomData = roomDoc.data() as Types.Room

    const users = (
      await firestore().collection(CollectionName.users).where('id', 'in', roomData.usersIds).get()
    ).docs.map((u) => userToUserDetails(u.data() as Types.User))

    const agents =
      roomData.agentsIds !== null && roomData.agentsIds.length > 0
        ? (await firestore().collection(CollectionName.agents).where('id', 'in', roomData.agentsIds).get()).docs.map(
            (a) => agentToAgentDetails(a.data() as Types.Agent),
          )
        : []

    return {
      ...roomData,
      users,
      agents,
    }
  }

  public async createRoomWithUsers(users: string[], name?: string | undefined): Promise<Types.RoomDetails> {
    const currentFirebaseUser = auth().currentUser
    if (currentFirebaseUser === null) {
      throw new Error('[Halo@createRoomWithUsers] Firebase user not authenticated')
    }

    const creatorDoc = await firestore().collection(CollectionName.users).doc(currentFirebaseUser.uid).get()
    if (!creatorDoc.exists) {
      throw new Error('[Halo@createRoomWithUsers] user not found')
    }
    const creatorData = creatorDoc.data() as Types.User

    if (users.length === 0) {
      throw new Error('[Halo@createRoomWithUsers] users array empty')
    }

    // if room is private, check if already exists
    if (users.length === 1) {
      const snapshot = await firestore()
        .collection(CollectionName.rooms)
        .where('scope', '==', 'PRIVATE')
        .where('users_ids', 'array-contains', currentFirebaseUser.uid)
        .get()
      const existingRoom = snapshot.docs.find((d) => (d.data() as Types.Room).usersIds.some((uid) => uid === users[0]))

      if (existingRoom) {
        const existingRoomData = existingRoom.data() as Types.Room

        const usersDetails = (
          await firestore().collection(CollectionName.users).where('id', 'in', existingRoomData.usersIds).get()
        ).docs.map((u) => userToUserDetails(u.data() as Types.User))

        const agentsDetails =
          existingRoomData.agentsIds !== null && existingRoomData.agentsIds.length > 0
            ? (
                await firestore().collection(CollectionName.agents).where('id', 'in', existingRoomData.agentsIds).get()
              ).docs.map((a) => agentToAgentDetails(a.data() as Types.Agent))
            : []

        return { ...(existingRoom.data() as Types.Room), users: usersDetails, agents: agentsDetails }
      }

      const doc = firestore().collection(CollectionName.rooms).doc()

      const room: Types.Room = {
        id: doc.id,
        createdBy: creatorData.id,
        createdAt: firestore.Timestamp.now().toDate().toISOString(),
        name: name ?? null,
        usersIds: [creatorData.id, ...users],
        removedUsersIds: [],
        scope: users.length === 1 ? 'PRIVATE' : 'GROUP',
        metadata: null,
        lastMessage: null,
        agentsIds: null,
        tag: null,
      }

      await doc.set(room)

      const usersDetails = (
        await firestore().collection(CollectionName.users).where('id', 'in', room.usersIds).get()
      ).docs.map((u) => userToUserDetails(u.data() as Types.User))

      return {
        ...room,
        users: usersDetails,
        agents: [],
      }
    }

    throw new Error('Method not implemented.')
  }
  createRoomForAgents(tag: string): Promise<Types.RoomDetails> {
    throw new Error('Method not implemented.')
  }
  joinUser(userId: string, roomId: string): Promise<Types.RoomDetails> {
    throw new Error('Method not implemented.')
  }
  joinAgent(agentId: string, roomId: string): Promise<Types.RoomDetails> {
    throw new Error('Method not implemented.')
  }
  removeUser(userId: string, roomId: string): Promise<Types.RoomDetails> {
    throw new Error('Method not implemented.')
  }
  sendTextMessage(data: CreateTextMessagePayload): Promise<Types.MessageType.Any> {
    throw new Error('Method not implemented.')
  }
  sendFileMessage(data: CreateFileMessagePayload): Promise<Types.MessageType.Any> {
    throw new Error('Method not implemented.')
  }
  sendFileMessageFromUrl(data: CreateFileMessageFromUrlPayload): Promise<Types.MessageType.Any> {
    throw new Error('Method not implemented.')
  }
  getRoomMedia(roomId: string, contentType: Types.MessageType.ContentType[]): Promise<Types.MessageType.MediaInfo[]> {
    throw new Error('Method not implemented.')
  }
  fetchRooms(onRoomsUpdate: (rooms: Types.RoomDetails[]) => void, onError: (error: Error) => void): void {
    throw new Error('Method not implemented.')
  }
  fetchRoomsByAgent(
    agentId: string,
    onRoomsUpdate: (rooms: Types.RoomDetails[]) => void,
    onError: (error: Error) => void,
  ): void {
    throw new Error('Method not implemented.')
  }
  fetchMessages(
    roomId: string,
    onMessagesUpdate: (messages: Types.MessageType.Any[]) => void,
    onError: (error: Error) => void,
  ): void {
    throw new Error('Method not implemented.')
  }
  readMessage(userId: string, roomId: string, messageId: string): Promise<void> {
    throw new Error('Method not implemented.')
  }
  deleteMessage(userId: string, roomId: string, messageId: string): Promise<void> {
    throw new Error('Method not implemented.')
  }
}
