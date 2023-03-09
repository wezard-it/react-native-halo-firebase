import * as React from 'react'

import { StyleSheet, View, Text, Button, TextInput, Alert, ActivityIndicator } from 'react-native'
import auth from '@react-native-firebase/auth'
import { halo, Types } from '@wezard/halo-core'

export default function App() {
  const [isLoading, setIsLoading] = React.useState<boolean>(false)
  const [step, setStep] = React.useState<'auth' | 'create_user' | 'main'>('auth')
  const [email, setEmail] = React.useState<string>()
  const [password, setPassword] = React.useState<string>()
  const [firstName, setFirstName] = React.useState<string>()
  const [lastName, setLastName] = React.useState<string>()

  const [user, setUser] = React.useState<Types.UserDetails>()

  React.useEffect(() => {
    halo.initialize('firebase')
  }, [])

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
      setStep('create_user')
    } catch (error) {
      console.warn(error)
      Alert.alert('Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }, [email, password])

  const handleSignIn = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const userCredentials = await auth().signInWithEmailAndPassword(email!, password!)
      const _user = await halo.getUser(userCredentials.user.uid)
      if (_user !== undefined) {
        setUser(_user)
        setStep('main')
      } else {
        setStep('create_user')
      }
      setEmail(undefined)
      setPassword(undefined)
    } catch (error) {
      console.warn(error)
      Alert.alert('Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }, [email, password])

  const handleLogout = React.useCallback(async () => {
    setIsLoading(true)
    try {
      await auth().signOut()
      setStep('auth')
    } catch (error) {
      console.warn(error)
      Alert.alert('Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleCreateUser = React.useCallback(async () => {
    setIsLoading(true)
    try {
      console.log('mannaggia', auth().currentUser)
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
  }, [firstName, lastName])

  const renderContent = React.useCallback(() => {
    switch (step) {
      case 'auth':
        return (
          <View style={styles.box}>
            <TextInput
              placeholder="email"
              value={email}
              style={styles.input}
              onChangeText={setEmail}
              autoCapitalize="none"
            />
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
      case 'create_user':
        return (
          <View style={styles.box}>
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
      case 'main':
        return (
          <View style={styles.main}>
            <View style={styles.welcomeBox}>
              <Text style={styles.welcomeTitle}>
                Benvenuto {user!.firstName} {user!.lastName}
              </Text>
            </View>

            <Button title="logout" onPress={handleLogout} />
          </View>
        )
      default:
        return null
    }
  }, [
    email,
    firstName,
    handleCreateUser,
    handleLogout,
    handleSignIn,
    handleSignUp,
    isSignUpDisabled,
    lastName,
    password,
    step,
    user,
  ])

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Halo Firebase Example</Text>
      </View>
      {renderContent()}
      {isLoading ? (
        <View style={styles.loaderWrapper}>
          <ActivityIndicator />
        </View>
      ) : null}
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
  header: {
    alignItems: 'center',
  },
  input: {
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
  },
  box: {
    marginVertical: 20,
  },
  main: {
    flex: 1,
    padding: 20,
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
  loaderWrapper: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    opacity: 0.75,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
