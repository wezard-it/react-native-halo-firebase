import * as React from 'react'
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import auth from '@react-native-firebase/auth'
import { halo, Types } from '@wezard/halo-core'
import moment from 'moment'
import { ArrowLeftOnRectangleIcon, ChatBubbleBottomCenterTextIcon, UserGroupIcon } from 'react-native-heroicons/outline'
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
        console.warn('error@getRooms', error)
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
      const otherUser =
        item.scope === 'GROUP' && item.lastMessage
          ? item.users.find((u) => u.id === item.lastMessage?.sentBy)
          : item.users.find((u) => u.id !== user!.id)
      return (
        <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('Chat', { room: item })}>
          <View style={styles.roomItem}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarPlaceholderText}>
                {item.scope === 'GROUP'
                  ? item.name?.substring(0, 2)?.toUpperCase()
                  : `${otherUser!.lastName![0]}${otherUser!.firstName![0]}`}
              </Text>
            </View>

            <View style={styles.userInfoContainer}>
              <Text style={styles.roomName}>
                {item.scope === 'GROUP' ? item.name : `${otherUser!.lastName} ${otherUser!.firstName}`}
              </Text>
              <Text style={styles.roomInfo} numberOfLines={2}>
                {moment(item.lastMessage!.sentAt).calendar({
                  sameDay: 'HH:mm',
                  lastWeek: 'dddd',
                  sameElse: 'DD/MM/YYYY',
                })}{' '}
                {item.scope === 'GROUP' && otherUser ? otherUser.firstName : ''}{' '}
                <Text style={styles.lastMessage}>{item.lastMessage !== null ? item.lastMessage.text : ''}</Text>
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
        Benvenutə {user!.firstName} {user!.lastName}
      </Text>
      <FlatList
        data={rooms}
        renderItem={renderRoomItem}
        refreshControl={<RefreshControl onRefresh={() => getRooms(true, true)} refreshing={refreshing} />}
        contentContainerStyle={styles.list}
      />

      <View style={styles.buttonsRow}>
        <Pressable style={styles.iconButton} onPress={handleLogout}>
          <ArrowLeftOnRectangleIcon color={'#fff'} />
        </Pressable>
        <View style={styles.buttonsRowRightSection}>
          <Pressable style={styles.iconButton} onPress={() => navigation.navigate('Contacts', { group: false })}>
            <ChatBubbleBottomCenterTextIcon color={'#fff'} />
          </Pressable>
          <Pressable
            style={[styles.iconButton, styles.groupIconButton]}
            onPress={() => navigation.navigate('Contacts', { group: true })}>
            <UserGroupIcon color={'#fff'} />
          </Pressable>
        </View>
      </View>
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
  roomInfo: { fontSize: 12, fontWeight: '400' },
  lastMessage: { fontSize: 12, fontWeight: '300' },
  iconButton: {
    height: 40,
    width: 40,
    borderRadius: 20,
    backgroundColor: '#2d6096',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupIconButton: {
    marginLeft: 8,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  buttonsRowRightSection: {
    flexDirection: 'row',
  },
})
