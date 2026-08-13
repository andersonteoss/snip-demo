# Snip Design Tokens

## Color system
- Background: `#080b11` (page), `#0e131d` (hero shell), `#111827` (cards)
- Surface border: `rgba(255,255,255,0.12)`
- Text: `#f5f7ff`
- Muted text: `#a4afc4`
- Positive: `#84f0b6`
- Error: `#ff9aa8`
- Accent gradient: `radial-gradient(circle at 50% 0%, rgba(255,141,112,0.45), rgba(255,109,162,0.28) 34%, rgba(255,137,79,0.16) 55%, transparent 72%)`

## Type
- Font stack: `'Space Grotesk', 'Manrope', 'Trebuchet MS', sans-serif`
- Hero title: `clamp(2.2rem, 4.4vw, 4rem)`, `700`, tight tracking
- Body: `1rem` with `1.55` line height
- UI labels/buttons: `0.95rem` to `1rem`, medium weight

## Spacing and shape
- Max content width: `1080px`
- Vertical rhythm: `clamp(1rem, 2vw, 1.5rem)` steps
- Hero top spacing: `clamp(3rem, 10vw, 7rem)`
- Radii: `999px` for chat input shell, `1rem` for cards, `0.75rem` for table cells

## Borders, depth, glow
- Card border: `1px solid rgba(255,255,255,0.12)`
- Card shadow: `0 22px 45px rgba(0,0,0,0.38)`
- Hero shell shadow: `0 18px 40px rgba(0,0,0,0.45)`
- Glow implementation: fixed full-width top band, `position: fixed; left: 0; right: 0; pointer-events: none;`

## Snip mapping
- Hero: centered title + muted subline over the glow band
- URL form: large pill chat-style shell with attached primary action
- Result/error: compact notice card under hero
- Links list: rounded, bordered table card with soft separators
