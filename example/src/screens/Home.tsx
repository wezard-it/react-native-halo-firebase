import * as React from 'react'
import { Alert, Button, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import auth from '@react-native-firebase/auth'
import { halo, Types } from '@wezard/halo-core'
import moment from 'moment'
import { useAuth } from '../providers/AuthProvider'
import { useLoading } from '../providers/LoadingProvider'
import { AuthenticatedStackParamList, useNavigation } from '../providers/NavigationProvider'

export const HomeScreen: React.FC = () => {
  const { user } = useAuth()
  const { setIsLoading } = useLoading()
  const navigation = useNavigation<AuthenticatedStackParamList>()

  const [refreshing, setRefreshing] = React.useState<boolean>(false)

  const [rooms, setRooms] = React.useState<Types.RoomDetails[]>()
  const [next, setNext] = React.useState<string>()
  const [hasNext, setHasNext] = React.useState<boolean>(false)

  const getRooms = React.useCallback(
    async (forced = false, refresh = false) => {
      if (!forced && !hasNext) return
      if (refresh) setRefreshing(true)
      try {
        const res = await halo.getRooms(forced ? undefined : next)
        setRooms((curr) => (forced || next === undefined ? res.rooms : [...(curr ?? []), ...res.rooms]))
        setNext(res.next)
        setHasNext(res.hasNext)
      } catch (error) {
        console.warn('error', error)
        Alert.alert('Something went wrong!')
      } finally {
        setRefreshing(false)
      }
    },
    [hasNext, next],
  )

  React.useEffect(() => {
    getRooms(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLogout = React.useCallback(async () => {
    setIsLoading(true)
    try {
      await auth().signOut()
    } catch (error) {
      Alert.alert('Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }, [setIsLoading])

  const renderRoomItem = React.useCallback(
    ({ item }: { item: Types.RoomDetails }) => {
      const otherUser = item.users.find((u) => u.id !== user!.id)
      return (
        <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('Chat', { room: item })}>
          <View style={styles.roomItem}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarPlaceholderText}>
                {otherUser!.lastName![0]}
                {otherUser!.firstName![0]}
              </Text>
            </View>

            <View style={styles.userInfoContainer}>
              <Text style={styles.roomName}>
                {otherUser!.lastName} {otherUser!.firstName}
              </Text>
              <Text style={styles.roomInfo}>
                {moment(item.lastMessage!.sentAt).calendar({
                  sameDay: 'HH:mm',
                  lastWeek: 'dddd',
                  sameElse: 'DD/MM/YYYY',
                })}{' '}
                {item.lastMessage !== null ? item.lastMessage.text : ''}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      )
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user],
  )

  return (
    <View style={styles.container}>
      <Text style={styles.welcomeTitle}>
        Benvenuto {user!.firstName} {user!.lastName}
      </Text>
      <FlatList
        data={rooms}
        renderItem={renderRoomItem}
        refreshControl={<RefreshControl onRefresh={() => getRooms(true, true)} refreshing={refreshing} />}
        contentContainerStyle={styles.list}
      />

      <Button title="new chat" onPress={() => navigation.navigate('Contacts')} />
      <Button title="logout" onPress={handleLogout} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  welcomeTitle: {
    fontSize: 26,
    textAlign: 'center',
    marginBottom: 12,
  },
  list: { flex: 1 },
  avatarPlaceholder: {
    height: 40,
    width: 40,
    backgroundColor: '#2d6096',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    color: '#fff',
    fontWeight: '700',
  },
  roomItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userInfoContainer: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
    borderBottomColor: '#2d6096',
    borderBottomWidth: 0.5,
    paddingVertical: 8,
  },
  roomName: { fontSize: 22, fontWeight: '500' },
  roomInfo: { fontSize: 12, fontWeight: '300' },
})
