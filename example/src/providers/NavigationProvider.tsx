import * as React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import { CreateUserScreen } from '../screens/CreateUser'
import { HomeScreen } from '../screens/Home'
import { LoginScreen } from '../screens/Login'
import { useAuth } from './AuthProvider'

const LoginStackNavigator = createStackNavigator()

const LoginStack = () => {
  return (
    <LoginStackNavigator.Navigator>
      <LoginStackNavigator.Screen name={'Login'} component={LoginScreen} />
    </LoginStackNavigator.Navigator>
  )
}

const UserCreationStackNavigator = createStackNavigator()

const UserCreationStack = () => {
  return (
    <UserCreationStackNavigator.Navigator>
      <UserCreationStackNavigator.Screen name={'CreateUser'} component={CreateUserScreen} />
    </UserCreationStackNavigator.Navigator>
  )
}

const AuthenticatedStackNavigator = createStackNavigator()

const AuthenticatedStack = () => {
  return (
    <AuthenticatedStackNavigator.Navigator>
      <AuthenticatedStackNavigator.Screen name={'Home'} component={HomeScreen} />
    </AuthenticatedStackNavigator.Navigator>
  )
}

export const NavigationProvider: React.FC = () => {
  const { isAuthenticated, user } = useAuth()

  const stack = React.useMemo(() => {
    if (!isAuthenticated) return <LoginStack />

    if (user === null) {
      return <UserCreationStack />
    } else {
      return <AuthenticatedStack />
    }
  }, [isAuthenticated, user])

  return <NavigationContainer>{stack}</NavigationContainer>
}
