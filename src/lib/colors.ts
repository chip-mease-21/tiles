// Deterministic color per tag, so a tag looks the same everywhere.
export function tagColor(tag: string): { bg: string; fg: string; solid: string } {
  let h = 0
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) % 360
  return {
    bg: `hsl(${h} 70% 93%)`, // soft tint for chip background
    fg: `hsl(${h} 55% 32%)`, // readable text
    solid: `hsl(${h} 55% 40%)` // selected / filled state
  }
}
