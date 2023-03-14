import * as React from 'react'
import { NavigationContainer, ParamListBase, useNavigation as useReactNavigation } from '@react-navigation/native'
import { createStackNavigator, StackNavigationProp } from '@react-navigation/stack'
import type { Types } from '@wezard/halo-core'
import { ChatScreen } from '../screens/Chat'
import { ContactsScreen } from '../screens/Contacts'
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

const AuthenticatedStackNavigator = createStackNavigator<AuthenticatedStackParamList>()

const AuthenticatedStack = () => {
  return (
    <AuthenticatedStackNavigator.Navigator>
      <AuthenticatedStackNavigator.Screen name={'Home'} component={HomeScreen} />
      <AuthenticatedStackNavigator.Screen
        name={'Contacts'}
        component={ContactsScreen}
        options={{
          presentation: 'modal',
        }}
      />
      <AuthenticatedStackNavigator.Screen name={'Chat'} component={ChatScreen} options={{ headerShown: false }} />
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

export type AuthenticatedStackParamList = {
  Home: undefined
  Contacts: undefined
  Chat: { room: Types.RoomDetails }
}

export const useNavigation = <T extends ParamListBase>() => {
  return useReactNavigation<StackNavigationProp<T>>()
}
