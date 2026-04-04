# LCARS Quick Reference Card

## Button Classes
| Class | Shape | Use Case |
|-------|-------|----------|
| button-small | Square | Grid layouts |
| button-large | Large rounded | Main actions |
| button-lozenge-left/right | Pill | Navigation |
| button-bullet-left/right | Half-round | Toggle buttons |
| button-capped-left/right | Capped | Entity buttons |
| button-barrel-left/right | Rectangle | Wide buttons |
| button-bar-left/right | Bar-style | Status displays |

## Section Classes
| Class | Position |
|-------|----------|
| header-left | Blue bar, left aligned |
| header-right | Blue bar, right aligned |
| header-contained | Blue bar, centered |
| middle-left | Red/purple left side |
| middle-right | Red/purple right side |
| middle-contained | Centered content |
| footer-left | Gray bar, left |
| footer-right | Gray bar, right |
| footer-contained | Gray bar, centered |

## Colors
- Orange: #FF9900 (Primary)
- Peach: #FFAA90 (Secondary)
- Purple: #CC99FF (Accent)
- Blue: #8899FF (Info)
- Red: #CC4444 (Alert)
- Black: #000000 (Background)
- White: #F5F6FA (Text)

## Example Card
```yaml
type: button
entity: light.living_room
name: Living Room
card_mod:
  class: button-lozenge-left
```

## Resources
- HA-LCARS: https://github.com/th3jesta/ha-lcars
- TheLCARS.com: https://www.thelcars.com
- Community: https://community.home-assistant.io/t/star-trek-lcars-theme/511391
