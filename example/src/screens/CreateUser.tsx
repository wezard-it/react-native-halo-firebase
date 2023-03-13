import * as React from 'react'
import { Alert, Button, StyleSheet, TextInput, View } from 'react-native'
import auth from '@react-native-firebase/auth'
import { halo } from '@wezard/halo-core'
import { useAuth } from '../providers/AuthProvider'
import { useLoading } from '../providers/LoadingProvider'

export const CreateUserScreen: React.FC = () => {
  const { setIsLoading } = useLoading()
  const { setUser } = useAuth()

  const [firstName, setFirstName] = React.useState<string>()
  const [lastName, setLastName] = React.useState<string>()

  const handleLogout = React.useCallback(async () => {
    setIsLoading(true)
    try {
      await auth().signOut()
    } catch (error) {
      console.warn(error)
      Alert.alert('Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }, [setIsLoading])

  const handleCreateUser = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const _user = await halo.createUser({
        firstName: firstName!,
        lastName: lastName!,
      })
      setUser(_user)
    } catch (error) {
      console.warn((error as Error).stack)
      Alert.alert('Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }, [firstName, lastName, setIsLoading, setUser])

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="first name"
        value={firstName}
        onChangeText={setFirstName}
        style={styles.input}
        autoCapitalize="words"
      />
      <TextInput
        placeholder="last name"
        value={lastName}
        onChangeText={setLastName}
        style={styles.input}
        autoCapitalize="words"
      />
      <Button title="create user" onPress={handleCreateUser} />
      <Button title="logout" onPress={handleLogout} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 62,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  input: {
    marginBottom: 12,
  },
  box: {
    marginVertical: 20,
  },
})
