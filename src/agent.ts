import auth from '@react-native-firebase/auth'
import firestore from '@react-native-firebase/firestore'
import { agentToAgentDetails, CreateAgentPayload, IAgent, Types } from '@wezard/halo-core'
import { CollectionName } from './utils'

export class Agent implements IAgent {
  public async getAgent(agentId: string): Promise<Types.AgentDetails> {
    const currentFirebaseUser = auth().currentUser
    if (currentFirebaseUser === null) {
      throw new Error('[Halo@createAgent] Firebase user not authenticated')
    }

    const doc = await firestore().collection(CollectionName.agents).doc(agentId).get()

    if (!doc.exists) {
      throw new Error('[Halo@getAgent] agent not found')
    }

    return agentToAgentDetails(doc.data() as Types.Agent)
  }

  public async createAgent(data: CreateAgentPayload): Promise<Types.AgentDetails> {
    const currentFirebaseUser = auth().currentUser
    if (currentFirebaseUser === null) {
      throw new Error('[Halo@createAgent] Firebase user not authenticated')
    }

    const agent: Types.Agent = {
      id: currentFirebaseUser.uid,
      firstName: data.firstName,
      lastName: data.lastName,
      image: data.image ?? null,
      createdAt: firestore.Timestamp.now().toDate().toISOString(),
      deviceToken: null,
      tags: data.tags,
    }

    await firestore().collection(CollectionName.agents).doc(currentFirebaseUser.uid).set(agent)

    return agentToAgentDetails(agent)
  }

  public async updateAgent(data: Partial<CreateAgentPayload>): Promise<Types.AgentDetails> {
    const currentFirebaseUser = auth().currentUser
    if (currentFirebaseUser === null) {
      throw new Error('[Halo@updateAgent] Firebase user not authenticated')
    }

    const doc = firestore().collection(CollectionName.agents).doc(currentFirebaseUser.uid)
    if (!(await doc.get()).exists) {
      throw new Error('[Halo@updateAgent] agent not found')
    }

    await doc.update({ ...data })
    const agent = (await doc.get()).data() as Types.Agent

    return agentToAgentDetails(agent)
  }

  public async updateAgentDeviceToken(agentId: string, token: string): Promise<void> {
    const currentFirebaseUser = auth().currentUser
    if (currentFirebaseUser === null) {
      throw new Error('[Halo@updateAgentDeviceToken] Firebase user not authenticated')
    }

    const doc = firestore().collection(CollectionName.agents).doc(agentId)

    if (!(await doc.get()).exists) {
      throw new Error('[Halo@updateAgentDeviceToken] agent not found')
    }

    await doc.update({ deviceToken: token })
  }
}
