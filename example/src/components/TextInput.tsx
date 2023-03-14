import * as React from 'react'
import { StyleSheet, TextInput as RNTextInput, TextInputProps } from 'react-native'

export const TextInput = React.forwardRef<RNTextInput, TextInputProps>(({ style, ...props }, ref) => {
  return <RNTextInput ref={ref} style={[styles.input, style]} {...props} />
})

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderColor: '#2d6096',
  },
})
