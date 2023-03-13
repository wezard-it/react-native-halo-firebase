import * as React from 'react'
import { Alert, Button, StyleSheet, Text, View } from 'react-native'
import auth from '@react-native-firebase/auth'
import { useAuth } from '../providers/AuthProvider'
import { useLoading } from '../providers/LoadingProvider'

export const HomeScreen: React.FC = () => {
  const { user } = useAuth()
  const { setIsLoading } = useLoading()

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

  return (
    <View style={styles.container}>
      <View style={styles.welcomeBox}>
        <Text style={styles.welcomeTitle}>
          Benvenuto {user!.firstName} {user!.lastName}
        </Text>
      </View>

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

  welcomeBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 26,
    textAlign: 'center',
  },
})
