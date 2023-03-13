import * as React from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'

const LoadingContext = React.createContext<{ isLoading: boolean; setIsLoading: (value: boolean) => void }>({
  isLoading: false,
  setIsLoading: () => {},
})

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = React.useState<boolean>(false)
  return (
    <LoadingContext.Provider value={{ isLoading, setIsLoading }}>
      <>
        {children}
        {isLoading ? (
          <View style={styles.loaderWrapper}>
            <ActivityIndicator />
          </View>
        ) : null}
      </>
    </LoadingContext.Provider>
  )
}

export const useLoading = (): { setIsLoading: (value: boolean) => void } => {
  const { setIsLoading } = React.useContext(LoadingContext)
  return { setIsLoading }
}

const styles = StyleSheet.create({
  loaderWrapper: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    opacity: 0.75,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
