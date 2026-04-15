# Design System Document: The Cinematic Editorial

## 1. Overview & Creative North Star: "The Noir Curator"
This design system moves away from the cluttered, "utility-first" layouts of traditional video portals to embrace the aesthetic of high-end cinematic editorial. Our Creative North Star is **"The Noir Curator."** 

We are not building a library; we are building a private gallery. The design breaks the "template" look by using intentional asymmetry—such as overlapping display text over vertical thumbnails—and high-contrast typography scales. We prioritize breathing room (negative space) and tonal depth over rigid lines, creating a digital experience that feels as premium as a luxury watch boutique or a private screening room.

## 2. Colors: Tonal Depth & Luminous Accents
Our palette is rooted in the absence of light, using subtle shifts in dark tones to create a sense of physical space.

### The "No-Line" Rule
**Explicit Instruction:** Prohibit 1px solid borders for sectioning. Boundaries must be defined solely through background color shifts or tonal transitions. Use `surface-container-low` sections sitting on a `surface` background to denote change in context.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—like stacked sheets of obsidian or frosted glass.
*   **Base Layer (`surface` / `#131313`):** The foundation of the application.
*   **Nested Containers:** Use `surface-container-lowest` (#0E0E0E) for cards to create a "recessed" look, or `surface-container-high` (#2A2A2A) to bring an element forward.
*   **The "Glass & Gradient" Rule:** Floating elements (Modals, Navigation Bars, Hover States) must use Glassmorphism. Apply `surface-variant` at 60% opacity with a `24px` backdrop blur.
*   **Signature Textures:** Main CTAs must use a subtle linear gradient from `primary` (#C3F5FF) to `primary-container` (#00E5FF) at a 135-degree angle to provide a "luminous" soul.

| Token | Value | Role |
| :--- | :--- | :--- |
| `background` | #131313 | Main application canvas |
| `primary` | #C3F5FF | Neon Cyan - Actionable energy & primary CTAs |
| `secondary` | #E9C349 | Soft Gold - VIP status, premium tiers, and excellence |
| `surface-container-lowest` | #0E0E0E | Recessed card backgrounds |
| `surface-container-highest` | #353534 | Elevated interaction states |

## 3. Typography: Authoritative Clarity
We use **Inter** to maintain a modern, technical precision that balances the provocative nature of the content with high-end sophistication.

*   **Display & Headlines:** Use `display-lg` and `headline-lg` with tight letter-spacing (-0.02em). These should act as "Art Pieces" on the page, often overlapping content or being used in asymmetrical hero sections.
*   **Hierarchy as Identity:** Large, bold headlines convey authority, while `label-sm` in `secondary` (Gold) is used for "Premium Only" metadata to instill a sense of exclusivity.
*   **Body Text:** Always use `on-surface-variant` (#BAC9CC) for long-form text to reduce eye strain against the pitch-black backgrounds.

## 4. Elevation & Depth: The Layering Principle
We convey hierarchy through **Tonal Layering** rather than traditional structural lines.

*   **The Layering Principle:** Place a `surface-container-lowest` card on a `surface-container-low` section to create a soft, natural lift.
*   **Ambient Shadows:** For floating elements, use extra-diffused shadows. 
    *   *Spec:* `0px 20px 40px rgba(0, 0, 0, 0.6)`. The shadow must feel like an ambient occlusion, not a hard drop shadow.
*   **The "Ghost Border" Fallback:** If containment is required for accessibility, use the `outline-variant` token at **15% opacity**. Never use 100% opaque borders.
*   **Glassmorphism:** Navigation headers should be fixed with a `surface` tint at 70% opacity and a `blur(12px)` to allow the vibrant 9:16 thumbnails to bleed through beautifully as the user scrolls.

## 5. Components

### Vertical Video Cards (9:16)
*   **Structure:** No dividers. Use `md` (12px) rounded corners.
*   **Interaction:** On hover, the card should scale (1.02x) and the `outline` should glow subtly with a 20% `primary` cyan tint.
*   **Metadata:** Use `label-md` for duration and `body-sm` for titles, tucked inside the glassmorphism bottom overlay.

### Buttons (The "Luminous" Variants)
*   **Primary:** Neon Cyan gradient background, `on-primary` text, `full` (pill) roundedness.
*   **Secondary (VIP):** Soft Gold (`secondary`) 1px "Ghost Border" with `on-secondary-fixed` text. Use for "Upgrade" or "Join Club."
*   **Tertiary:** Transparent background, `primary` text, no border. Used for "Cancel" or "Back."

### Chips (Filters)
*   **Selection:** Use `surface-container-highest` for unselected and `primary` with 10% opacity for selected states. Forbid hard boxes; use `full` roundedness.

### Input Fields
*   **Styling:** Fill with `surface-container-lowest`. On focus, transition the "Ghost Border" to 50% `primary` opacity. No hard white backgrounds.

### Glass Tooltips
*   **Styling:** Use `surface-bright` at 80% opacity with `blur(8px)`. Text must be `on-surface`.

## 6. Do's and Don'ts

### Do
*   **Do** use 9:16 aspect ratios strictly to maintain the "Editorial" feel.
*   **Do** allow titles to bleed across 2 columns in the grid for visual interest.
*   **Do** use "Soft Gold" sparingly—only for elements that involve payment, VIP status, or high-value curation.
*   **Do** prioritize vertical white space. If in doubt, add 16px more padding.

### Don't
*   **Don't** use a 1px solid white or grey border. It shatters the premium "Noir" illusion.
*   **Don't** use standard blue for links. Use Neon Cyan or nothing.
*   **Don't** use sharp 0px corners. Every interactive element must utilize the `md` (12px) or `full` corner radius to feel tactile and modern.
*   **Don't** clutter the thumbnails with icons. Keep the visual "soul" of the video as the hero.