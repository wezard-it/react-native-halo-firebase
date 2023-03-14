import * as React from 'react'
import { Alert, Button, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import type { StackScreenProps } from '@react-navigation/stack'
import { halo, Types } from '@wezard/halo-core'
import { TextInput } from '../components/TextInput'
import { useAuth } from '../providers/AuthProvider'
import { useLoading } from '../providers/LoadingProvider'
import { AuthenticatedStackParamList, useNavigation } from '../providers/NavigationProvider'

type ContactsScreenProp = StackScreenProps<AuthenticatedStackParamList, 'Contacts'>

export const ContactsScreen: React.FC<ContactsScreenProp> = ({ route }) => {
  const { user: currentUser } = useAuth()
  const { setIsLoading } = useLoading()
  const navigation = useNavigation()

  const { group } = route.params

  const [groupName, setGroupName] = React.useState<string>()
  const [groupMembers, setGroupMembers] = React.useState<string[]>()

  const [users, setUsers] = React.useState<Types.UserDetails[]>()

  React.useEffect(() => {
    halo.fetchUsers(
      (_users) => {
        setUsers(
          _users
            .filter((u) => u.id !== currentUser?.id)
            .sort((u1, u2) => {
              if (u1.lastName === null || u1.firstName === null) return -1
              else if (u2.lastName === null || u2.firstName === null) return 1
              else if (u1.lastName > u2.lastName) return 1
              else if (u1.lastName < u2.lastName) return -1
              else if (u1.firstName > u2.firstName) return 1
              else if (u1.firstName < u2.firstName) return -1
              else return 0
            }),
        )
      },
      (_error) => {
        Alert.alert('Something went wrong')
      },
    )
  }, [currentUser?.id])

  const handleCreateChat = React.useCallback(
    async (user: Types.UserDetails) => {
      try {
        setIsLoading(true)
        const room = await halo.createRoomWithUsers([user.id])
        navigation.replace('Chat', { room })
      } catch (_error) {
        Alert.alert('Something went wrong')
      } finally {
        setIsLoading(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setIsLoading, halo],
  )

  const handleCreateGroup = React.useCallback(async () => {
    try {
      setIsLoading(true)
      const room = await halo.createRoomWithUsers(groupMembers!, 'GROUP', groupName!)
      navigation.replace('Chat', { room })
    } catch (error) {
      console.warn(error)
      Alert.alert('Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }, [groupMembers, groupName, navigation, setIsLoading])

  const handleSelectMember = React.useCallback((user: Types.UserDetails) => {
    setGroupMembers((curr) =>
      curr?.includes(user.id) ? curr.filter((uid) => uid !== user.id) : [...(curr ?? []), user.id],
    )
  }, [])

  const canCreateGroup = React.useMemo(() => {
    return (
      groupName !== undefined && groupName.trim().length > 3 && groupMembers !== undefined && groupMembers.length > 0
    )
  }, [groupMembers, groupName])

  const renderUser = React.useCallback(
    ({ item }: { item: Types.UserDetails }) => {
      return (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => (group ? handleSelectMember(item) : handleCreateChat(item))}>
          <View style={styles.userItem}>
            {item.image ? (
              <Image source={{ uri: item.image }} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>
                  {item.lastName?.[0]}
                  {item.firstName?.[0]}
                </Text>
              </View>
            )}
            <View style={styles.userInfoContainer}>
              <Text style={groupMembers?.includes(item.id) ? styles.selectedUserName : undefined}>
                {item.lastName} {item.firstName}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      )
    },
    [group, groupMembers, handleCreateChat, handleSelectMember],
  )

  return (
    <View style={styles.container}>
      {group ? (
        <TextInput
          placeholder="group name"
          style={styles.groupNameInput}
          value={groupName}
          onChangeText={setGroupName}
          maxLength={25}
        />
      ) : null}
      <FlatList data={users} renderItem={renderUser} contentContainerStyle={styles.list} />
      {group ? <Button onPress={handleCreateGroup} title={'create group'} disabled={!canCreateGroup} /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  list: {
    paddingTop: 24,
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
  userItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  userInfoContainer: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
    borderBottomColor: '#2d6096',
    borderBottomWidth: 0.5,
  },
  groupNameInput: {
    marginTop: 24,
  },
  selectedUserName: {
    color: '#2d6096',
    fontWeight: '700',
  },
})
