import * as React from 'react'
import { Alert, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { halo, Types } from '@wezard/halo-core'
import { useAuth } from '../providers/AuthProvider'
import { useLoading } from '../providers/LoadingProvider'
import { useNavigation } from '../providers/NavigationProvider'
export const ContactsScreen: React.FC = () => {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = React.useState<Types.UserDetails[]>()
  const { setIsLoading } = useLoading()

  const navigation = useNavigation()

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

  const renderUser = React.useCallback(
    ({ item }: { item: Types.UserDetails }) => {
      return (
        <TouchableOpacity activeOpacity={0.7} onPress={() => handleCreateChat(item)}>
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
              <Text>
                {item.lastName} {item.firstName}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      )
    },
    [handleCreateChat],
  )

  return (
    <View style={styles.container}>
      <FlatList data={users} renderItem={renderUser} contentContainerStyle={styles.list} />
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
})
