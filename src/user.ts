import auth from '@react-native-firebase/auth'
import firestore from '@react-native-firebase/firestore'
import type { CreateUserPayload, IUser, Types } from '@wezard/halo-core'
import { CollectionName } from './utils'

export class User implements IUser {
  async getUser(userId: string): Promise<Types.UserDetails> {
    const doc = await firestore().collection(CollectionName.users).doc(userId).get()

    if (!doc.exists) {
      throw new Error('[Halo@getUser] user not found')
    }

    return doc.data() as Types.UserDetails
  }

  async createUser(data: CreateUserPayload): Promise<Types.UserDetails> {
    console.log('mannaggia in create user in firebase module 2')
    const currentFirebaseUser = auth().currentUser
    console.log('mannaggia in create user in firebase module 3')
    if (currentFirebaseUser === null) {
      throw new Error('[Halo@createUser] Firebase user not authenticated')
    }
    console.log('mannaggia in create user in firebase module 4', firestore.Timestamp.now().toDate().toISOString())

    const user: Types.User = {
      id: currentFirebaseUser.uid,
      firstName: data.firstName,
      lastName: data.lastName,
      createdAt: firestore.Timestamp.now().toDate().toISOString(),
      deviceToken: null,
      image: data.image ?? null,
      nickname: data.nickname ?? null,
    }

    console.log('mannaggia in create user in firebase module 5')

    await firestore().collection(CollectionName.users).doc(currentFirebaseUser.uid).set(user)

    return {
      id: user.id,
      image: user.image,
      firstName: user.firstName,
      lastName: user.lastName,
      nickname: user.nickname,
    }
  }

  async updateUser(data: Partial<CreateUserPayload>): Promise<Types.UserDetails> {
    const currentFirebaseUser = auth().currentUser
    if (currentFirebaseUser === null) {
      throw new Error('[Halo@createUser] Firebase user not authenticated')
    }

    const doc = firestore().collection(CollectionName.users).doc(currentFirebaseUser.uid)

    if (!(await doc.get()).exists) {
      throw new Error('[Halo@updateUser] Firebase user not authenticated')
    }

    await doc.update({ ...data })

    const user = (await doc.get()).data() as Types.User

    return {
      id: user.id,
      image: user.image,
      firstName: user.firstName,
      lastName: user.lastName,
      nickname: user.nickname,
    }
  }

  async updateUserDeviceToken(userId: string, token: string): Promise<void> {
    const doc = firestore().collection(CollectionName.users).doc(userId)

    if (!(await doc.get()).exists) {
      throw new Error('[Halo@updateUserDeviceToken] Firebase user not authenticated')
    }

    await doc.update({ deviceToken: token })
  }

  fetchUsers(onUsersUpdate: (users: Types.UserDetails[]) => void, onError: (error: Error) => void): void {
    firestore()
      .collection(CollectionName.users)
      .onSnapshot((snapshot) => {
        onUsersUpdate(
          snapshot.docs.map((u) => {
            const user = u.data() as Types.User
            return {
              id: user.id,
              image: user.image,
              firstName: user.firstName,
              lastName: user.lastName,
              nickname: user.nickname,
            }
          }),
        )
      }, onError)
  }
}
