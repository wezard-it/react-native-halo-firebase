import auth from '@react-native-firebase/auth'
import firestore from '@react-native-firebase/firestore'
import { CreateUserPayload, IUser, Types, userToUserDetails } from '@wezard/halo-core'
import { CollectionName } from './utils'

export class User implements IUser {
  async getUser(userId: string): Promise<Types.UserDetails> {
    const doc = await firestore().collection(CollectionName.users).doc(userId).get()

    if (!doc.exists) {
      throw new Error('[Halo@getUser] user not found')
    }

    return userToUserDetails(doc.data() as Types.User)
  }

  async createUser(data: CreateUserPayload): Promise<Types.UserDetails> {
    const currentFirebaseUser = auth().currentUser
    if (currentFirebaseUser === null) {
      throw new Error('[Halo@createUser] Firebase user not authenticated')
    }

    const user: Types.User = {
      id: currentFirebaseUser.uid,
      firstName: data.firstName,
      lastName: data.lastName,
      createdAt: firestore.Timestamp.now().toDate().toISOString(),
      deviceToken: null,
      image: data.image ?? null,
      nickname: data.nickname ?? null,
    }

    await firestore().collection(CollectionName.users).doc(currentFirebaseUser.uid).set(user)

    return userToUserDetails(user)
  }

  async updateUser(data: Partial<CreateUserPayload>): Promise<Types.UserDetails> {
    const currentFirebaseUser = auth().currentUser
    if (currentFirebaseUser === null) {
      throw new Error('[Halo@createUser] Firebase user not authenticated')
    }

    const doc = firestore().collection(CollectionName.users).doc(currentFirebaseUser.uid)

    if (!(await doc.get()).exists) {
      throw new Error('[Halo@updateUser] user not found')
    }

    await doc.update({ ...data })

    const user = (await doc.get()).data() as Types.User

    return userToUserDetails(user)
  }

  async updateUserDeviceToken(userId: string, token: string): Promise<void> {
    const doc = firestore().collection(CollectionName.users).doc(userId)

    if (!(await doc.get()).exists) {
      throw new Error('[Halo@updateUserDeviceToken] user not found')
    }

    await doc.update({ deviceToken: token })
  }

  fetchUsers(onUsersUpdate: (users: Types.UserDetails[]) => void, onError: (error: Error) => void): void {
    firestore()
      .collection(CollectionName.users)
      .onSnapshot((snapshot) => {
        onUsersUpdate(
          snapshot.docs.map((u) => {
            return userToUserDetails(u.data() as Types.User)
          }),
        )
      }, onError)
  }
}
