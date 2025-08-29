import { QuartzTransformerPlugin } from "../types"
import { QuartzPluginData } from "../vfile"
import { visit } from "unist-util-visit"
import { Root, Element } from "hast"

/**
 * Options for the RemoveSections transformer plugin
 */
export interface Options {
  frontmatterField?: string
  removeHeading?: boolean
}

export const RemoveSections: QuartzTransformerPlugin<Options> = (userOpts?: Options) => {
  const opts = {
    frontmatterField: "remove_sections",
    removeHeading: true,
    ...userOpts,
  }

  return {
    name: "RemoveSections",
    htmlPlugins() {
      return [
        () => {
          return (tree: Root, file) => {
            const data = file.data as QuartzPluginData
            const frontmatter = data.frontmatter || {}

            const sectionsToRemove =
              (frontmatter as Record<string, any>)[opts.frontmatterField] || []

            if (!Array.isArray(sectionsToRemove) || sectionsToRemove.length === 0) {
              return // No sections to remove
            }

            const sectionsToRemoveLower = sectionsToRemove.map((s: string) =>
              s.toLowerCase().trim(),
            )

            // Helper function to extract text from HTML elements
            const extractText = (node: any): string => {
              if (node.type === "text") {
                return node.value
              } else if (node.children) {
                return node.children.map(extractText).join("")
              }
              return ""
            }

            // Collect all elements in document order
            const allElements: Array<{ element: Element; parent: any; index: number }> = []
            visit(tree, "element", (node, index, parent) => {
              if (parent && Array.isArray(parent.children) && typeof index === "number") {
                allElements.push({ element: node as Element, parent, index })
              }
            })

            // Find DM section start points and mark everything after them for removal
            const elementsToRemove: Array<{ element: Element; parent: any; index: number }> = []
            let removeMode = false
            let removingSectionLevel = 0

            for (const item of allElements) {
              const elem = item.element

              // Check for headings (h1, h2, h3, h4, h5, h6)
              if (elem.tagName && /^h[1-6]$/.test(elem.tagName)) {
                const currentHeadingLevel = parseInt(elem.tagName[1])
                const headingText = extractText(elem).toLowerCase().trim()

                // Check if this heading matches any section to remove
                const shouldRemoveThisSection = sectionsToRemoveLower.some((section) => {
                  const matches = headingText === section || headingText.includes(section)
                  return matches
                })

                if (shouldRemoveThisSection && !removeMode) {
                  removeMode = true
                  removingSectionLevel = currentHeadingLevel

                  if (opts.removeHeading) {
                    elementsToRemove.push(item)
                  }
                } else if (removeMode && currentHeadingLevel <= removingSectionLevel) {
                  removeMode = false
                  removingSectionLevel = 0
                } else if (removeMode) {
                  elementsToRemove.push(item)
                }
              } else if (removeMode) {
                // Mark any non-heading content for removal if we're in removal mode
                elementsToRemove.push(item)
              }
            }

            // Remove elements in reverse order to maintain correct indices
            elementsToRemove.sort((a, b) => {
              // Sort by parent first, then by index in reverse
              if (a.parent !== b.parent) {
                return 0 // Don't care about order between different parents
              }
              return b.index - a.index
            })

            // Group by parent and remove in reverse index order
            const byParent = new Map()
            elementsToRemove.forEach((item) => {
              if (!byParent.has(item.parent)) {
                byParent.set(item.parent, [])
              }
              byParent.get(item.parent).push(item)
            })

            byParent.forEach((items) => {
              items.sort((a: any, b: any) => b.index - a.index)
              items.forEach((item: any) => {
                item.parent.children.splice(item.index, 1)
              })
            })
          }
        },
      ]
    },
  }
}
