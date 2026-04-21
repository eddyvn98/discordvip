# MRU + Search Selection UX Pattern

## Problem
In the Cinema management interface, selecting a Telegram channel or a specific movie from a list of hundreds of items is slow and creates a poor user experience.

## The Pattern: "The Smart Selector"

### 1. Most Recently Used (MRU)
Store the interaction history for the user. When opening a selection list, show the top 5 most recently or frequently used items first under a "Gần đây" (Recent) heading.

### 2. Search-Integrated Dropdown
Instead of a standard HTML `<select>`, use a searchable component (like Select2, TomSelect, or a custom React/Vue component) that:
- Filters items in real-time.
- Highlights matching text.
- Supports keyboard navigation.

### 3. Creation as a Fallback
If the search query yields no results, provide an "Add New [Resource]" action directly at the end of the list to avoid forcing the user to navigate to a different page.

## Implementation Details
- **Backend**: Track `last_used_at` in the resource table.
- **Frontend**: Fetch the MRU list separately or slice it from the main payload.
- **Debouncing**: Ensure search queries to the backend are debounced by at least 200-300ms to reduce server load.
