import React from 'react'

export const useClipboard = (text: string) => {
  const [hasCopied, setHasCopied] = React.useState(false)
  const [timerID, setTimerID] = React.useState<NodeJS.Timeout>()
  return {
    hasCopied,
    text,
    copyToClipboard: () => {
      setHasCopied(false)
      window.navigator.clipboard.writeText(text)
      setHasCopied(true)
      clearTimeout(timerID)
      const newTimerID = setTimeout(() => setHasCopied(false), 3000)
      setTimerID(newTimerID)
    },
  }
}
