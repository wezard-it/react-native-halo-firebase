import * as React from 'react'
import auth from '@react-native-firebase/auth'
import { halo, Types } from '@wezard/halo-core'

export const AuthContext = React.createContext<{
  isAuthenticated: boolean
  user: Types.UserDetails | null
  setUser: (user: Types.UserDetails) => void
}>({
  isAuthenticated: false,
  user: null,
  setUser: () => {},
})

export const AuthProvider: React.FC<{
  children: React.ReactNode
}> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean>(false)
  const [user, setUser] = React.useState<Types.UserDetails | null>(null)

  React.useEffect(() => {
    auth().onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser === null) {
        setIsAuthenticated(false)
      } else {
        try {
          const _user = await halo.getUser(firebaseUser.uid)
          setUser(_user)
        } catch (error) {
          setUser(null)
        } finally {
          setIsAuthenticated(true)
        }
      }
    })
  }, [])

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user: user,
        setUser: setUser,
      }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): {
  isAuthenticated: boolean
  user: Types.UserDetails | null
  setUser: (user: Types.UserDetails) => void
} => {
  const { isAuthenticated, user, setUser } = React.useContext(AuthContext)
  return {
    isAuthenticated,
    user,
    setUser,
  }
}
