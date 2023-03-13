import * as React from 'react'
import { halo } from '@wezard/halo-core'
import { LoadingProvider } from './providers//LoadingProvider'
import { NavigationProvider } from './providers//NavigationProvider'
import { AuthProvider } from './providers/AuthProvider'

export default function App() {
  React.useEffect(() => {
    halo.initialize('firebase')
  }, [])

  return (
    <LoadingProvider>
      <AuthProvider>
        <NavigationProvider />
      </AuthProvider>
    </LoadingProvider>
  )
}
