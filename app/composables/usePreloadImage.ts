export const preloadImage = (src: string) => {
  return new Promise<void>((resolve) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = () => resolve()
    img.src = src
  })
}

export const preloadImages = (srcs: string[]) => {
  return Promise.all(srcs.map(preloadImage))
}
