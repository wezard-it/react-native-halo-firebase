import * as React from 'react'
import { Alert, Button, StyleSheet, View } from 'react-native'
import auth from '@react-native-firebase/auth'
import { TextInput } from '../components/TextInput'
import { useLoading } from '../providers/LoadingProvider'

export const LoginScreen: React.FC = () => {
  const { setIsLoading } = useLoading()

  const [email, setEmail] = React.useState<string>()
  const [password, setPassword] = React.useState<string>()

  const isSignUpDisabled = React.useMemo(
    () =>
      email === undefined ||
      email.match(/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/i) === null ||
      password === undefined ||
      password.length < 6,
    [email, password],
  )

  const handleSignUp = React.useCallback(async () => {
    setIsLoading(true)
    try {
      await auth().createUserWithEmailAndPassword(email!, password!)
    } catch (error) {
      console.warn(error)
      Alert.alert('Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }, [email, password, setIsLoading])

  const handleSignIn = React.useCallback(async () => {
    setIsLoading(true)
    try {
      await auth().signInWithEmailAndPassword(email!, password!)
      setEmail(undefined)
      setPassword(undefined)
    } catch (error) {
      Alert.alert('Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }, [email, password, setIsLoading])

  return (
    <View style={styles.container}>
      <TextInput placeholder="email" value={email} style={styles.input} onChangeText={setEmail} autoCapitalize="none" />
      <TextInput
        placeholder="password"
        value={password}
        secureTextEntry
        style={styles.input}
        onChangeText={setPassword}
      />
      <Button title="sign up" disabled={isSignUpDisabled} onPress={handleSignUp} />
      <Button title="sign in" disabled={isSignUpDisabled} onPress={handleSignIn} />
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
