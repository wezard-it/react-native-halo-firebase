import { Platform } from 'react-native'
import auth from '@react-native-firebase/auth'
import firestore from '@react-native-firebase/firestore'
import storage from '@react-native-firebase/storage'
import {
  agentToAgentDetails,
  CreateFileMessageFromUrlPayload,
  CreateFileMessagePayload,
  CreateSurveyMessagePayload,
  CreateTextMessagePayload,
  IRoom,
  Types,
  userToUserDetails,
  UpdateSurveyPayload,
} from '@wezard/halo-core'
import RNFetchBlob from 'rn-fetch-blob'
import { CollectionName } from './utils'

export class Room implements IRoom {
  public async getRooms(next?: string): Promise<{ rooms: Types.RoomDetails[]; next: string; hasNext: boolean }> {
    const currentFirebaseUser = auth().currentUser
    if (currentFirebaseUser === null) {
      throw new Error('[Halo@createRoomWithUsers] Firebase user not authenticated')
    }

    const nextDoc = firestore().collection(CollectionName.rooms).doc(next)

    const rooms = await firestore()
      .collection(CollectionName.rooms)
      .where('usersIds', 'array-contains', currentFirebaseUser.uid)
      .orderBy('lastMessage.sentAt', 'desc')
      .startAfter(nextDoc)
      .limit(10)
      .get()

    const result: Types.RoomDetails[] = []

    for (const room of rooms.docs) {
      const { usersIds, removedUsersIds, agentsIds } = room.data() as Types.Room
      const ids: string[] = [...usersIds, ...removedUsersIds]
      const users: Types.UserDetails[] = []
      while (ids.length !== 0) {
        const batch = ids.splice(0, 10)
        users.push(
          ...(
            await firestore()
              .collection(CollectionName.users)
              .where('id', 'in', [...batch])
              .get()
          ).docs.map((u) => u.data() as Types.UserDetails),
        )
      }

      const agents =
        agentsIds !== null && agentsIds.length > 0
          ? (await firestore().collection(CollectionName.agents).where('id', 'in', agentsIds).get()).docs.map(
              (u) => u.data() as Types.AgentDetails,
            )
          : []
      result.push({
        ...(room.data() as Types.Room),
        users,
        agents,
      })
    }

    const _next = rooms.docs[rooms.size - 1]?.id ?? ''

    const hasNext =
      (
        await firestore()
          .collection(CollectionName.rooms)
          .where('usersIds', 'array-contains', currentFirebaseUser.uid)
          .orderBy('lastMessage.sentAt', 'desc')
          .startAfter(firestore().collection(CollectionName.rooms).doc(_next))
          .limit(1)
          .get()
      ).size !== 0

    return { rooms: result, next: _next, hasNext }
  }

  public async getRoomDetails(roomId: string): Promise<Types.RoomDetails> {
    const roomDoc = await firestore().collection(CollectionName.rooms).doc(roomId).get()
    if (!roomDoc.exists) {
      throw new Error('[Halo@getRoomDetails] room not found')
    }

    const roomData = roomDoc.data() as Types.Room

    const ids: string[] = [...roomData.usersIds, ...roomData.removedUsersIds]
    const users: Types.UserDetails[] = []
    while (ids.length !== 0) {
      const batch = ids.splice(0, 10)
      users.push(
        ...(
          await firestore()
            .collection(CollectionName.users)
            .where('id', 'in', [...batch])
            .get()
        ).docs.map((u) => u.data() as Types.UserDetails),
      )
    }

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

  public async createRoomWithUsers(users: string[], scope = 'PRIVATE', name?: string): Promise<Types.RoomDetails> {
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

    if (users.length > 1 && scope === 'PRIVATE') {
      throw new Error('[Halo@createRoomWithUsers] PRIVATE rooms cannot have more tha two users')
    }

    // if room is private, check if already exists
    if (scope === 'PRIVATE') {
      const snapshot = await firestore()
        .collection(CollectionName.rooms)
        .where('scope', '==', 'PRIVATE')
        .where('usersIds', 'array-contains', currentFirebaseUser.uid)
        .get()
      const existingRoom = snapshot.docs.find((d) => (d.data() as Types.Room).usersIds.some((uid) => uid === users[0]))

      if (existingRoom) {
        const existingRoomData = existingRoom.data() as Types.Room

        const ids: string[] = [...existingRoomData.usersIds, ...existingRoomData.removedUsersIds]
        const usersDetails: Types.UserDetails[] = []
        while (ids.length !== 0) {
          const batch = ids.splice(0, 10)
          usersDetails.push(
            ...(
              await firestore()
                .collection(CollectionName.users)
                .where('id', 'in', [...batch])
                .get()
            ).docs.map((u) => u.data() as Types.UserDetails),
          )
        }

        const agentsDetails =
          existingRoomData.agentsIds !== null && existingRoomData.agentsIds.length > 0
            ? (
                await firestore().collection(CollectionName.agents).where('id', 'in', existingRoomData.agentsIds).get()
              ).docs.map((a) => agentToAgentDetails(a.data() as Types.Agent))
            : []

        return { ...(existingRoom.data() as Types.Room), users: usersDetails, agents: agentsDetails }
      }
    }

    const doc = firestore().collection(CollectionName.rooms).doc()

    const createdAt = firestore.Timestamp.now().toDate().toISOString()
    const room: Types.Room = {
      id: doc.id,
      createdBy: creatorData.id,
      createdAt: createdAt,
      name: name ?? null,
      usersIds: [creatorData.id, ...users],
      removedUsersIds: [],
      scope: scope as Types.RoomScope,
      metadata: null,
      lastMessage: {
        id: null,
        sentAt: createdAt,
        sentBy: null,
        text: null,
        type: null,
      },
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
      agents: null,
    }
  }

  public async createRoomForAgents(tag: string): Promise<Types.RoomDetails> {
    const currentFirebaseUser = auth().currentUser
    if (currentFirebaseUser === null) {
      throw new Error('[Halo@createRoomForAgents] Firebase user not authenticated')
    }

    const creatorDoc = await firestore().collection(CollectionName.users).doc(currentFirebaseUser.uid).get()
    if (!creatorDoc.exists) {
      throw new Error('[Halo@createRoomForAgents] user not found')
    }
    const creatorData = creatorDoc.data() as Types.User

    const doc = firestore().collection(CollectionName.rooms).doc()

    const createdAt = firestore.Timestamp.now().toDate().toISOString()
    const room: Types.Room = {
      id: doc.id,
      createdAt,
      agentsIds: [],
      createdBy: creatorData.id,
      lastMessage: {
        id: null,
        sentAt: createdAt,
        sentBy: null,
        text: null,
        type: null,
      },
      metadata: null,
      name: null,
      removedUsersIds: [],
      scope: 'AGENT',
      tag,
      usersIds: [creatorData.id],
    }

    await doc.set(room)

    return {
      ...room,
      users: [creatorData],
      agents: [],
    }
  }

  public async joinUser(userId: string, roomId: string): Promise<Types.RoomDetails> {
    const currentFirebaseUser = auth().currentUser
    if (currentFirebaseUser === null) {
      throw new Error('[Halo@joinUser] Firebase user not authenticated')
    }

    const user = await firestore().collection(CollectionName.users).doc(userId).get()
    if (!user.exists) {
      throw new Error('[Halo@joinUser] user not found')
    }

    const room = await firestore().collection(CollectionName.rooms).doc(roomId).get()
    if (!room.exists) {
      throw new Error('[Halo@joinUser] room not found')
    }

    const roomData = room.data() as Types.Room
    if (roomData.scope !== 'GROUP') {
      throw new Error('[Halo@joinUser] room scope must be GROUP')
    }
    if (roomData.usersIds.includes(userId)) {
      throw new Error('[Halo@joinUser] user already in the room')
    }

    const usersIds = [...roomData.usersIds, userId]
    const removedUsersIds = roomData.removedUsersIds.filter((uid) => uid !== userId)

    await firestore().collection(CollectionName.rooms).doc(roomId).update({ usersIds, removedUsersIds })

    const ids: string[] = [...usersIds, ...removedUsersIds]
    const users: Types.UserDetails[] = []
    while (ids.length !== 0) {
      const batch = ids.splice(0, 10)
      users.push(
        ...(
          await firestore()
            .collection(CollectionName.users)
            .where('id', 'in', [...batch])
            .get()
        ).docs.map((u) => u.data() as Types.UserDetails),
      )
    }

    return {
      ...roomData,
      usersIds,
      removedUsersIds,
      users,
      agents: null,
    }
  }

  public async joinAgent(agentId: string, roomId: string): Promise<Types.RoomDetails> {
    const currentFirebaseUser = auth().currentUser
    if (currentFirebaseUser === null) {
      throw new Error('[Halo@joinAgent] Firebase user not authenticated')
    }

    const agent = await firestore().collection(CollectionName.agents).doc(agentId).get()
    if (!agent.exists) {
      throw new Error('[Halo@joinAgent] agent not found')
    }

    const room = await firestore().collection(CollectionName.rooms).doc(roomId).get()
    if (!room.exists) {
      throw new Error('[Halo@joinAgent] room not found')
    }

    const roomData = room.data() as Types.Room
    if (roomData.scope !== 'AGENT') {
      throw new Error('[Halo@joinUser] room scope must be AGENT')
    }
    if (roomData.agentsIds?.includes(agentId)) {
      throw new Error('[Halo@joinUser] agent already in the room')
    }

    const agentsIds = [...(roomData.agentsIds ?? []), agentId]
    await firestore().collection(CollectionName.rooms).doc(roomId).update({ agentsIds })

    const ids: string[] = [...roomData.usersIds, ...roomData.removedUsersIds]
    const users: Types.UserDetails[] = []
    while (ids.length !== 0) {
      const batch = ids.splice(0, 10)
      users.push(
        ...(
          await firestore()
            .collection(CollectionName.users)
            .where('id', 'in', [...batch])
            .get()
        ).docs.map((u) => u.data() as Types.UserDetails),
      )
    }

    const agents = (await firestore().collection(CollectionName.agents).where('id', 'in', agentsIds).get()).docs.map(
      (u) => agentToAgentDetails(u.data() as Types.Agent),
    )

    return {
      ...roomData,
      agentsIds,
      users,
      agents,
    }
  }

  public async removeUser(userId: string, roomId: string): Promise<Types.RoomDetails> {
    const currentFirebaseUser = auth().currentUser
    if (currentFirebaseUser === null) {
      throw new Error('[Halo@removeUser] Firebase user not authenticated')
    }

    const user = await firestore().collection(CollectionName.users).doc(userId).get()
    if (!user.exists) {
      throw new Error('[Halo@removeUser] user not found')
    }

    const room = await firestore().collection(CollectionName.rooms).doc(roomId).get()
    if (!room.exists) {
      throw new Error('[Halo@removeUser] room not found')
    }

    const roomData = room.data() as Types.Room
    if (roomData.scope !== 'GROUP') {
      throw new Error('[Halo@removeUser] room scope must be GROUP')
    }
    if (!roomData.usersIds.includes(userId) || roomData.removedUsersIds.includes(userId)) {
      throw new Error('[Halo@removeUser] user not in the room')
    }

    const removedUsersIds = [...roomData.removedUsersIds, userId]
    const usersIds = roomData.usersIds.filter((uid) => uid !== userId)

    await firestore().collection(CollectionName.rooms).doc(roomId).update({ usersIds, removedUsersIds })

    const ids: string[] = [...usersIds, ...removedUsersIds]
    const users: Types.UserDetails[] = []
    while (ids.length !== 0) {
      const batch = ids.splice(0, 10)
      users.push(
        ...(
          await firestore()
            .collection(CollectionName.users)
            .where('id', 'in', [...batch])
            .get()
        ).docs.map((u) => u.data() as Types.UserDetails),
      )
    }

    return {
      ...roomData,
      usersIds,
      removedUsersIds,
      users,
      agents: null,
    }
  }

  private async finalizeSendMessage(roomId: string, messageData: any): Promise<Types.MessageType.Any> {
    const roomRef = firestore().collection(CollectionName.rooms).doc(roomId)
    const messageRef = roomRef.collection(CollectionName.messages).doc()
    const message: Types.MessageType.Any = {
      id: messageRef.id,
      ...messageData,
    }

    const messagePreview = {
      id: messageRef.id,
      type: message.contentType,
      text: message.text ?? null,
      sentAt: message.createdAt,
      sentBy: message.createdBy,
    }

    await firestore().runTransaction(async (transaction) => {
      await transaction.set(messageRef, message)
      await transaction.update(roomRef, {
        lastMessage: messagePreview,
      })
    })

    return message
  }

  public async sendTextMessage(data: CreateTextMessagePayload): Promise<Types.MessageType.Any> {
    const { userId, roomId, text, metadata, contentType = 'TEXT' } = data

    const currentFirebaseUser = auth().currentUser
    if (currentFirebaseUser === null) {
      throw new Error('[Halo@sendTextMessage] Firebase user not authenticated')
    }

    const room = await firestore().collection(CollectionName.rooms).doc(roomId).get()
    if (!room.exists) {
      throw new Error('[Halo@sendTextMessage] room not found')
    }

    const message = {
      text,
      createdAt: firestore.Timestamp.now().toDate().toISOString(),
      createdBy: userId,
      updatedAt: firestore.Timestamp.now().toDate().toISOString(),
      contentType: contentType,
      room: roomId,
      delivered: false,
      metadata: metadata || null,
      readBy: [],
    }

    return await this.finalizeSendMessage(roomId, message)
  }

  public async sendFileMessage(data: CreateFileMessagePayload): Promise<Types.MessageType.Any> {
    const { userId, roomId, file, text, metadata } = data

    const currentFirebaseUser = auth().currentUser
    if (currentFirebaseUser === null) {
      throw new Error('[Halo@sendFileMessage] Firebase user not authenticated')
    }

    const room = await firestore().collection(CollectionName.rooms).doc(roomId).get()
    if (!room.exists) {
      throw new Error('[Halo@sendFileMessage] room not found')
    }

    let contentType: 'AUDIO' | 'VIDEO' | 'IMAGE' | 'CUSTOM' = 'CUSTOM'

    if (file.mimeType.match(/^image\//)) {
      contentType = 'IMAGE'
    } else if (file.mimeType.match(/^video\//)) {
      contentType = 'VIDEO'
    } else if (file.mimeType.match(/^audio\//)) {
      contentType = 'AUDIO'
    }

    let docPath = file.filename
    switch (contentType) {
      case 'IMAGE':
        docPath = `/${roomId}/images/` + docPath
        break
      case 'VIDEO':
        docPath = `/${roomId}/videos/` + docPath
        break
      case 'AUDIO':
        docPath = `/${roomId}/audios/` + docPath
        break
    }

    const attachmentRef = storage().ref(docPath)

    const uri = Platform.OS === 'ios' ? file.uri : (await RNFetchBlob.fs.stat(file.uri)).path
    await attachmentRef.putFile(uri)

    const message = {
      text,
      createdAt: firestore.Timestamp.now().toDate().toISOString(),
      createdBy: userId,
      updatedAt: firestore.Timestamp.now().toDate().toISOString(),
      contentType,
      room: roomId,
      delivered: false,
      metadata: metadata || null,
      readBy: [],
      file: {
        mimeType: file.mimeType,
        name: file.filename,
        uri: await attachmentRef.getDownloadURL(),
      },
    }

    return await this.finalizeSendMessage(roomId, message)
  }

  public async sendFileMessageFromUrl(data: CreateFileMessageFromUrlPayload): Promise<Types.MessageType.Any> {
    const { userId, roomId, file, text, metadata } = data

    const currentFirebaseUser = auth().currentUser
    if (currentFirebaseUser === null) {
      throw new Error('[Halo@sendFileMessageFromUrl] Firebase user not authenticated')
    }

    const room = await firestore().collection(CollectionName.rooms).doc(roomId).get()
    if (!room.exists) {
      throw new Error('[Halo@sendFileMessageFromUrl] room not found')
    }

    let contentType: 'AUDIO' | 'VIDEO' | 'IMAGE' | 'CUSTOM' = 'CUSTOM'
    if (file.mimeType.match(/^image\//)) {
      contentType = 'IMAGE'
    } else if (file.mimeType.match(/^video\//)) {
      contentType = 'VIDEO'
    } else if (file.mimeType.match(/^audio\//)) {
      contentType = 'AUDIO'
    }

    const message = {
      text,
      createdAt: firestore.Timestamp.now().toDate().toISOString(),
      createdBy: userId,
      updatedAt: firestore.Timestamp.now().toDate().toISOString(),
      contentType,
      room: roomId,
      delivered: false,
      metadata: metadata || null,
      readBy: [],
      file: {
        mimeType: file.mimeType,
        name: file.filename,
        uri: file.url,
      },
    }

    return await this.finalizeSendMessage(roomId, message)
  }

  public async sendSurveyMessage(data: CreateSurveyMessagePayload): Promise<Types.MessageType.Any> {
    const { userId, roomId, survey, metadata } = data

    const currentFirebaseUser = auth().currentUser
    if (currentFirebaseUser === null) {
      throw new Error('[Halo@sendSurveyMessage] Firebase user not authenticated')
    }

    const room = await firestore().collection(CollectionName.rooms).doc(roomId).get()
    if (!room.exists) {
      throw new Error('[Halo@sendSurveyMessage] room not found')
    }

    // TODO: foreach element inside survey?.votes create a document {id: firebaseGenerated; title: string}

    const message = {
      createdAt: firestore.Timestamp.now().toDate().toISOString(),
      createdBy: userId,
      updatedAt: firestore.Timestamp.now().toDate().toISOString(),
      contentType: 'SURVEY',
      room: roomId,
      delivered: false,
      metadata: metadata || null,
      readBy: [],
      survey,
    }

    return await this.finalizeSendMessage(roomId, message)
  }

  // TODO: init updateSurvey
  public async updateSurvey(data: UpdateSurveyPayload): Promise<Types.MessageType.Any> {
    const { userId, roomId } = data

    const currentFirebaseUser = auth().currentUser
    if (currentFirebaseUser === null) {
      throw new Error('[Halo@sendSurveyMessage] Firebase user not authenticated')
    }

    const room = await firestore().collection(CollectionName.rooms).doc(roomId).get()
    if (!room.exists) {
      throw new Error('[Halo@sendSurveyMessage] room not found')
    }

    // TODO: foreach element inside survey?.votes create a document {id: firebaseGenerated; title: string}

    const message = {
      createdAt: firestore.Timestamp.now().toDate().toISOString(),
      createdBy: userId,
      updatedAt: firestore.Timestamp.now().toDate().toISOString(),
      contentType: 'SURVEY',
      room: roomId,
      delivered: false,
      // metadata: metadata || null,
      readBy: [],
      // survey,
    }

    return await this.finalizeSendMessage(roomId, message)
  }

  public async getRoomMedia(
    roomId: string,
    contentType: Types.MessageType.ContentType[],
  ): Promise<Types.MessageType.MediaInfo[]> {
    const currentFirebaseUser = auth().currentUser
    if (currentFirebaseUser === null) {
      throw new Error('[Halo@sendFileMessageFromUrl] Firebase user not authenticated')
    }

    const room = await firestore().collection(CollectionName.rooms).doc(roomId).get()
    if (!room.exists) {
      throw new Error('[Halo@sendFileMessageFromUrl] room not found')
    }

    const messagesSnapshots = await firestore()
      .collection(CollectionName.rooms)
      .doc(roomId)
      .collection(CollectionName.messages)
      .get()

    return messagesSnapshots.docs
      .filter((m) => contentType.includes((m.data() as Types.MessageType.Any).contentType))
      .sort(
        (m1, m2) =>
          new Date((m2.data() as Types.MessageType.Any).createdAt).getTime() -
          new Date((m1.data() as Types.MessageType.Any).createdAt).getTime(),
      )
      .map((m) => {
        const { id: messageId, createdBy, file } = m.data() as Types.MessageType.File
        return { messageId, createdBy, file }
      })
  }

  public async readMessage(userId: string, roomId: string, messageId: string): Promise<void> {
    const currentFirebaseUser = auth().currentUser
    if (currentFirebaseUser === null) {
      throw new Error('[Halo@readMessage] Firebase user not authenticated')
    }

    const doc = await firestore()
      .collection(CollectionName.rooms)
      .doc(roomId)
      .collection(CollectionName.messages)
      .doc(messageId)
      .get()

    if (!doc.exists) {
      throw new Error('[Halo@readMessage] message not found')
    }
    await firestore()
      .collection(CollectionName.rooms)
      .doc(roomId)
      .collection(CollectionName.messages)
      .doc(messageId)
      .update({
        readBy: [...(doc.data() as Types.MessageType.Any).readBy, userId],
      })
  }

  public async deleteMessage(userId: string, roomId: string, messageId: string): Promise<void> {
    const currentFirebaseUser = auth().currentUser
    if (currentFirebaseUser === null) {
      throw new Error('[Halo@deleteMessage] Firebase user not authenticated')
    }

    const message = await firestore()
      .collection(CollectionName.rooms)
      .doc(roomId)
      .collection(CollectionName.messages)
      .doc(messageId)
      .get()

    if (!message.exists) {
      throw new Error('[Halo@deleteMessage] message not found')
    }

    if ((message.data() as Types.MessageType.Any).createdBy !== userId) {
      throw new Error('[Halo@deleteMessage] user does not have permissions')
    }

    await firestore()
      .collection(CollectionName.rooms)
      .doc(roomId)
      .collection(CollectionName.messages)
      .doc(messageId)
      .update({ deleted: true })
  }

  public fetchRooms(onRoomsUpdate: (rooms: Types.Room[]) => void, onError: (error: Error) => void): void {
    const currentFirebaseUser = auth().currentUser
    if (currentFirebaseUser === null) {
      throw new Error('[Halo@fetchRooms] Firebase user not authenticated')
    }

    firestore()
      .collection(CollectionName.rooms)
      .where('usersIds', 'array-contains', currentFirebaseUser.uid)
      .onSnapshot((snapshot) => {
        const data = snapshot.docs.map((doc) => doc.data() as Types.Room)
        onRoomsUpdate(data)
      }, onError)
  }

  public fetchRoomsByAgent(
    tags: string[],
    onRoomsUpdate: (rooms: Types.Room[]) => void,
    onError: (error: Error) => void,
  ): void {
    const currentFirebaseUser = auth().currentUser
    if (currentFirebaseUser === null) {
      throw new Error('[Halo@fetchRoomsByAgent] Firebase user not authenticated')
    }

    firestore()
      .collection(CollectionName.rooms)
      .where('scope', '==', 'AGENT')
      .where('tag', 'in', tags)
      .onSnapshot((snapshot) => {
        const data = snapshot.docs.map((doc) => doc.data() as Types.Room)
        onRoomsUpdate(data)
      }, onError)
  }

  public fetchMessages(
    roomId: string,
    onMessagesUpdate: (messages: Types.MessageType.Any[]) => void,
    onError: (error: Error) => void,
  ): void {
    const currentFirebaseUser = auth().currentUser
    if (currentFirebaseUser === null) {
      throw new Error('[Halo@fetchMessages] Firebase user not authenticated')
    }

    firestore()
      .collection(CollectionName.rooms)
      .doc(roomId)
      .collection(CollectionName.messages)
      .onSnapshot(
        (snapshot) =>
          onMessagesUpdate(
            snapshot.docs
              .map((d) => d.data() as Types.MessageType.Any)
              .filter((m) => m.createdAt !== null)
              .sort((m1, m2) => new Date(m2.createdAt).getTime() - new Date(m1.createdAt).getTime()),
          ),
        onError,
      )
  }
}
