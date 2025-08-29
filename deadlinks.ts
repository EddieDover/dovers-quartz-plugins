import { QuartzTransformerPlugin } from "../types"
import { Root, Element } from "hast"
import { visit } from "unist-util-visit"
import { FullSlug } from "../../util/path"
import { QuartzPluginData } from "../vfile"
import { BuildCtx } from "../../util/ctx"

/**
 * Options for the RemoveDeadLinks transformer plugin
 *
 * @export
 * @interface Options
 * @property {boolean} [addCssClass=false] - Whether to add a CSS class to dead links instead of converting to span
 * @property {string} [cssClassName='dead-link'] - Custom CSS class name for dead links
 * @property {boolean} [removeLinkCompletely=false] - Whether to remove the link entirely or convert to span/add class
 */
export interface Options {
  // Dead Links Options
  addCssClass?: boolean
  cssClassName?: string
  removeLinkCompletely?: boolean
}
export const RemoveDeadLinks: QuartzTransformerPlugin<Options> = (userOpts?: Options) => {
  const opts = {
    // Dead Links defaults
    addCssClass: false,
    cssClassName: "dead-link",
    removeLinkCompletely: false,
    ...userOpts,
  }

  return {
    name: "RemoveDeadLinks",
    htmlPlugins(ctx?: BuildCtx) {
      return [
        () => {
          return (tree: Root, file) => {
            const data = file.data as QuartzPluginData

            // Get all slugs from the build context if available
            let allSlugs: FullSlug[] = []
            if (ctx?.allSlugs) {
              allSlugs = Array.from(ctx.allSlugs)
            } else if (data.allSlugs && Array.isArray(data.allSlugs)) {
              allSlugs = data.allSlugs
            }

            // DEAD LINK REMOVAL
            visit(tree, "element", (elem: Element) => {
              if (elem.tagName === "a" && elem.properties?.href) {
                const href = elem.properties.href.toString()

                // Skip anchor links
                if (href.startsWith("#")) {
                  return
                }

                // Skip external links
                if (
                  href.startsWith("http://") ||
                  href.startsWith("https://") ||
                  href.startsWith("//")
                ) {
                  return
                }

                // Skip if this is already marked as an external link
                if (elem.properties.className) {
                  const className = elem.properties.className
                  if (
                    (Array.isArray(className) && className.includes("external")) ||
                    (typeof className === "string" && className.includes("external"))
                  ) {
                    return
                  }
                }

                // Skip if no slugs are available (prevents removing all links)
                if (!allSlugs || allSlugs.length === 0) {
                  return
                }

                // If the link has a data-slug, check if that slug exists
                if (elem.properties["data-slug"]) {
                  const dataSlug = elem.properties["data-slug"].toString()
                  const slugExists = allSlugs.some((slug: FullSlug) => {
                    const normalizedDataSlug = dataSlug.replace(/\/$/, "")
                    const normalizedSlug = slug.replace(/\/$/, "")
                    return (
                      normalizedDataSlug === normalizedSlug ||
                      normalizedDataSlug === normalizedSlug + "/index" ||
                      normalizedSlug === normalizedDataSlug + "/index"
                    )
                  })

                  // If the slug exists, skip (keep the link)
                  if (slugExists) {
                    return
                  }
                  // If slug doesn't exist, this is a dead link - continue processing
                }

                // Check if this is an internal link that doesn't exist
                const cleanHref = href.startsWith("/") ? href.slice(1) : href
                // Remove .html extension for comparison
                const hrefWithoutExtension = cleanHref.replace(/\.html$/, "")
                const originalHref = href.replace(/\.html$/, "")

                const isDeadLink = !allSlugs.some((slug: FullSlug) => {
                  // Remove trailing slashes for comparison
                  const normalizedSlug = slug.replace(/\/$/, "")
                  const normalizedHref = hrefWithoutExtension.replace(/\/$/, "")
                  const normalizedOriginal = originalHref.replace(/^\/+|\/+$/g, "")

                  return (
                    normalizedHref === normalizedSlug ||
                    normalizedOriginal === normalizedSlug ||
                    cleanHref === normalizedSlug ||
                    href === `/${normalizedSlug}` ||
                    href === normalizedSlug ||
                    // Handle index pages
                    (normalizedSlug.endsWith("/index") &&
                      normalizedHref === normalizedSlug.replace("/index", "")) ||
                    (normalizedHref.endsWith("/index") &&
                      normalizedSlug === normalizedHref.replace("/index", ""))
                  )
                })

                if (isDeadLink) {
                  if (opts.removeLinkCompletely) {
                    elem.tagName = "span"
                    delete elem.properties.href
                  } else if (opts.addCssClass) {
                    if (elem.properties.className === undefined) {
                      elem.properties.className = opts.cssClassName
                    } else if (Array.isArray(elem.properties.className)) {
                      elem.properties.className.push(opts.cssClassName)
                    } else if (typeof elem.properties.className === "string") {
                      elem.properties.className += ` ${opts.cssClassName}`
                    }
                  } else {
                    // Default behavior: convert to span with CSS class
                    if (elem.properties.className === undefined) {
                      elem.properties.className = opts.cssClassName
                    } else if (Array.isArray(elem.properties.className)) {
                      elem.properties.className.push(opts.cssClassName)
                    } else if (typeof elem.properties.className === "string") {
                      elem.properties.className += ` ${opts.cssClassName}`
                    }
                    elem.tagName = "span"
                    delete elem.properties.href
                  }
                }
              }
            })
          }
        },
      ]
    },
  }
}
