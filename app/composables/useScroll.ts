export const useScroll = (targetId: string) => {  
  const el = document.getElementById(targetId);

  if (el) {
    el.scrollIntoView({ behavior: "smooth" });
  }
}