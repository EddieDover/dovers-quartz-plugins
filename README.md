# Dover's [Quartz](https://quartz.jzhao.xyz/) Plugins
Here you'll find [Quartz 4](https://quartz.jzhao.xyz/)  lugins for TTRPG content management: dead link removal and content hiding.

I DM a TTRPG game using an Obsidian vault for all of my note taking. My players have access to the Quartz site for that vault. As I prepare pages for public visibility on the site, I use these plugins to:

1. **Remove dead links** (`RemoveDeadLinks`) (transformer): Ensure that any links referencing still-hidden pages are obscured instead of redirecting to a 404 page or potentially giving away spoilers
2. **Hide DM content** (`RemoveSections`) (transformer): Remove entire sections of content that contain DM planning notes, secrets, or spoilers that players shouldn't see

## Installation

1. Download the plugin files you need:
   - `deadlinks.ts` - Dead link removal
   - `removesections.ts` - DM content hiding
2. Save them to your Quartz project under `quartz/plugins/transformers/`
3. Add exports to `quartz/plugins/transformers/index.ts`:

```typescript
// Add the plugins you're using
export { RemoveDeadLinks } from "./deadlinks"
export { RemoveSections } from "./removesections"
```

## Configuration

Add the plugins to your `quartz.config.ts` in the transformers array:

```typescript
import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"

const config: QuartzConfig = {
  configuration: {
    // ... your other configuration
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(), // Must come first
      
      // DM content removal (runs early, at markdown level)
      Plugin.RemoveSections(),
      
      Plugin.CreatedModifiedDate(),
      Plugin.SyntaxHighlighting(),
      Plugin.ObsidianFlavoredMarkdown(),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.TableOfContents(),
      Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }),
      Plugin.Description(),
      Plugin.Latex(),
      
      // Dead link removal (runs late, after link processing)
      Plugin.RemoveDeadLinks({
        removeLinkCompletely: true,
      }),
      
      // ... other transformers
    ],
    filters: [/* ... your filters */],
    emitters: [/* ... your emitters */],
  },
}

export default config
```

## Usage Examples

### Basic Usage (Both Plugins)
```markdown
---
title: "Adventure Location"
remove_sections: ["dm notes", "secrets"]
---

## Overview
The party can explore this [[Public Location]]. They might find clues about [[Hidden Plot Device]].

## Room Descriptions
Detailed descriptions players can see...

# DM Notes
This entire section will be removed from the published site!

## Secrets
- The hidden switch is behind the [[Secret Room]] painting
- If players ask about [[Missing NPC]], reveal the truth

## Combat Encounters
Stats and tactics the players shouldn't see...
```

**Results after processing:**
- `[[Hidden Plot Device]]` becomes `<span class="dead-link">Hidden Plot Device</span>` (if page doesn't exist)
- `[[Public Location]]` remains as working link (if page exists)
- Entire "DM Notes" section and everything after it is completely removed
- "Secrets" and "Combat Encounters" sections are also removed

### DM Content Only
```markdown
---
remove_sections: ["planning", "spoilers", "notes"]
---

## Session Summary
Players discovered the ancient temple.

## Planning
### Next Session Prep
- Prepare battle maps
- Review NPC motivations

## Character Notes
Public information about NPCs...

## Spoilers
The temple contains [[Ancient Artifact]]!
```

## Plugin Details

### RemoveSections Plugin

Removes entire content sections based on frontmatter configuration.

**Key Features:**
- Processes content at HTML level for reliability
- Supports hierarchical section removal
- Matches headings by text content or contains logic
- Removes everything from matched heading until next heading of equal/higher level

**Configuration Options:**
```typescript
Plugin.RemoveSections({
  frontmatterField: "remove_sections", // Default field name
  removeHeading: true // Whether to remove the heading itself
})
```

**Frontmatter Setup:**
```yaml
---
remove_sections: ["dm notes", "planning", "secrets", "spoilers"]
---
```

### RemoveDeadLinks Plugin

Removes or styles links to non-existent pages.

**Key Features:**
- Processes links after CrawlLinks plugin
- Skips external links and anchor links
- Validates against site's page collection
- Multiple styling options

**Configuration Options:**
```typescript
Plugin.RemoveDeadLinks({
  // Styling options (choose one)
  removeLinkCompletely: true,    // Convert to plain text span
  addCssClass: false,            // Add CSS class but keep as link
  cssClassName: "dead-link",     // CSS class name to apply
})
```

## CSS Styling

Add CSS to your Quartz theme for dead link styling:

```css
/* Styling for dead links (removeLinkCompletely: true) */
.dead-link {
  color: #999;
  text-decoration: line-through;
  cursor: default;
  font-style: italic;
}

/* Alternative styling (addCssClass: true) */
a.dead-link {
  color: #999;
  text-decoration: line-through;
  cursor: not-allowed;
}

a.dead-link:hover {
  color: #666;
  text-decoration: none;
}
```

## Section Matching Logic

The `RemoveSections` plugin matches headings using flexible logic:

If `remove_sections: ["notes", "planning"]`, these headings will be removed:

✅ `# DM Notes` (contains "notes")  
✅ `## Planning Session` (contains "planning")  
✅ `### Quick Notes` (contains "notes")  
✅ `## Session Planning` (contains "planning")  
❌ `## Player Handouts` (doesn't contain either term)  
❌ `## Note About Rules` (contains "note" but not "notes")

**Important:** All content under a matched heading is removed until the next heading of equal or higher level is encountered.

## Plugin Order

The order of plugins in your transformer array matters:

1. **`FrontMatter()`** - Must be first to process frontmatter
2. **`RemoveSections()`** - Should run early, after frontmatter
3. **Content processing plugins** - Markdown processing, syntax highlighting, etc.
4. **`CrawlLinks()`** - Must process links before dead link removal
5. **`RemoveDeadLinks()`** - Should run after link processing

## Contributing

These plugins were developed for personal use but are shared for the community. Feel free to submit issues, feature requests, or pull requests.

## License

MIT License - see LICENSE file for details.
