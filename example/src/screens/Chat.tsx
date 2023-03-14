import * as React from 'react'
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import type { StackScreenProps } from '@react-navigation/stack'
import { halo, Types } from '@wezard/halo-core'
import moment from 'moment'
import { ChevronLeftIcon, PaperAirplaneIcon } from 'react-native-heroicons/outline'
import { useAuth } from '../providers/AuthProvider'
import type { AuthenticatedStackParamList } from '../providers/NavigationProvider'

type ChatScreenProp = StackScreenProps<AuthenticatedStackParamList, 'Chat'>

export const ChatScreen: React.FC<ChatScreenProp> = ({ route, navigation }) => {
  const { room } = route.params
  const [messages, setMessages] = React.useState<Types.MessageType.Any[]>()
  const { user } = useAuth()

  const [messageText, setMessageText] = React.useState<string>()

  const otherUser = React.useMemo(() => {
    return room.users.find((u) => u.id !== user!.id)
  }, [room.users, user])

  const canSend = React.useMemo(() => messageText !== undefined && messageText.trim().length > 0, [messageText])

  React.useEffect(() => {
    halo.fetchMessages(
      room.id,
      (_messages) =>
        setMessages(_messages.sort((m1, m2) => moment(m2.createdAt).valueOf() - moment(m1.createdAt).valueOf())),
      (_error) => {
        Alert.alert('Something went wrong')
      },
    )
  }, [room.id])

  const renderMessage = React.useCallback(
    ({ item }: { item: Types.MessageType.Any }) => {
      const isMine = item.createdBy === user?.id
      return (
        <View style={isMine ? styles.messageContainerRight : styles.messageContainerLeft}>
          <View style={[styles.bubble, isMine ? styles.bubbleRight : styles.bubbleLeft]}>
            <Text style={isMine ? styles.textRight : styles.textLeft}>{item.text}</Text>
            <Text style={[styles.textTime, isMine ? styles.textRight : styles.textLeft]}>
              {moment(item.createdAt).calendar({
                sameDay: 'HH:mm',
                lastWeek: 'dddd',
                sameElse: 'DD/MM/YYYY',
              })}
            </Text>
          </View>
        </View>
      )
    },
    [user?.id],
  )

  const handleSend = React.useCallback(async () => {
    try {
      await halo.sendTextMessage({
        userId: user!.id,
        roomId: room.id,
        text: messageText!.trim(),
      })
      setMessageText(undefined)
    } catch (error) {
      Alert.alert('Something went wrong!')
    }
  }, [messageText, room.id, user])

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <Pressable style={styles.iconWrapper} onPress={() => navigation.goBack()}>
          <ChevronLeftIcon size={32} />
        </Pressable>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarPlaceholderText}>
            {room.scope === 'GROUP'
              ? room.name?.substring(0, 2)?.toUpperCase()
              : `${otherUser!.lastName![0]}${otherUser!.firstName![0]}`}
          </Text>
        </View>
        <View style={styles.userInfoContainer}>
          <Text style={styles.headerTitle}>
            {room.scope === 'GROUP' ? room.name : `${otherUser!.lastName} ${otherUser!.firstName}`}
          </Text>
        </View>
      </View>
      <FlatList data={messages} renderItem={renderMessage} contentContainerStyle={styles.list} inverted />
      <View style={styles.inputWrapper}>
        <TextInput placeholder="Type message" style={styles.input} value={messageText} onChangeText={setMessageText} />
        <Pressable style={styles.iconSendWrapper} onPress={handleSend} disabled={!canSend}>
          <PaperAirplaneIcon color={canSend ? '#fff' : '#3d3d3d'} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    paddingTop: 24,
    paddingHorizontal: 24,
  },
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
  header: {
    flexDirection: 'row',
    paddingBottom: 12,
    paddingTop: 50,
  },
  userInfoContainer: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 28,
  },
  iconWrapper: {
    height: 40,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSendWrapper: {
    height: 40,
    width: 40,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrapper: {
    backgroundColor: '#2d6096',
    paddingTop: 8,
    paddingBottom: 24,
    paddingLeft: 24,
    paddingRight: 16,
    flexDirection: 'row',
  },
  input: {
    flex: 1,
    minHeight: 42,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderRadius: 10,
  },
  bubble: {
    padding: 8,
    borderRadius: 8,
    maxWidth: '75%',
    marginBottom: 4,
  },
  bubbleRight: {
    backgroundColor: '#90c1f5',
    alignItems: 'flex-end',
    borderTopRightRadius: 0,
  },
  bubbleLeft: {
    backgroundColor: '#3d5a78',
    alignItems: 'flex-start',
    borderTopLeftRadius: 0,
  },
  textRight: {
    color: '#000',
  },
  textLeft: {
    color: '#fff',
  },
  textTime: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: '200',
  },
  messageContainerLeft: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  messageContainerRight: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
})
