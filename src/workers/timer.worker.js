let interval = null
let remaining = 0

self.onmessage = ({ data }) => {
  if (data.type === 'START') {
    remaining = data.seconds
    interval = setInterval(() => {
      remaining--
      self.postMessage({ type: 'TICK', remaining })
      if (remaining <= 0) {
        clearInterval(interval)
        self.postMessage({ type: 'DONE' })
      }
    }, 1000)
  }
  if (data.type === 'STOP') {
    clearInterval(interval)
  }
}