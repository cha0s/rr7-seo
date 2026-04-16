import type { LoaderFunctionArgs, ServerBuild } from "react-router";
import type { SEOHandle, SEOOptions, SitemapEntry, SitemapOptions } from "./types.ts";

const TRAILING_SLASHES_REGEX = /^(.*)\/+$/
const removeTrailingSlashes = (s: string) => s.replace(TRAILING_SLASHES_REGEX, "$1")

async function renderSitemapXml(
  args: LoaderFunctionArgs,
  routes: ServerBuild["routes"],
  options: SitemapOptions
) {
  // add entries to the sitemap, checking for and rejecting duplicates
  const sitemapEntries = new Map<string, SitemapEntry>()
  function addEntry(path: string, entry: SitemapEntry) {
    const existing = sitemapEntries.get(path)
    if (
      existing
      && (
        existing.lastmod !== entry.lastmod
        || existing.changefreq !== entry.changefreq
        || existing.priority !== entry.priority
      )
    ) {
      console.warn(
        `Duplicate route for ${path} with different sitemap data`,
        { entry, existingEntryForRoute: existing }
      );
      return;
    }
    sitemapEntries.set(path, entry)
  }
  // collect route entries and wait for handle promises
  const promises = []
  for (const id in routes) {
    // skip root and empty(?) routes
    if (!routes[id] || "root" === id) continue;
    const route = routes[id];
    // custom sitemap entries through handle
    const handle = route.module.handle as SEOHandle | undefined;
    if (handle?.getSitemapEntries) {
      promises.push(
        Promise.resolve(handle.getSitemapEntries(args)).then((entries) => {
          if (entries) {
            for (const entry of entries) {
              if (entry) {
                addEntry(entry.route, entry)
              }
            }
          }
        }),
      );
      continue;
    }
    // no default export means no page
    if (!route.module.default) continue;
    // walk up parents to build full path
    let path = route.index ? "" : removeTrailingSlashes(route.path ?? "")
    let { parentId } = route;
    let parent = parentId ? routes[parentId] : null;
    while (parent) {
      const parentPath = removeTrailingSlashes(parent.path ?? "")
      path = parentPath ? `${parentPath}/${path}` : path;
      parentId = parent.parentId;
      parent = parentId ? routes[parentId] : null;
    }
    // no dynamic routes
    if (path.includes(":") || path.includes('*')) continue;
    // add a path entry
    const routePath = removeTrailingSlashes(path)
    addEntry(routePath, { route: routePath });
  }
  await Promise.all(promises);
  // render
  return `
<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd"
>
  ${
    // render entries in alphabetical order
    Array.from(sitemapEntries)
      .toSorted(([l], [r]) => l < r ? -1 : 1)
      .map(([, entry]) => entry)
      .map(({
        route,
        lastmod,
        changefreq,
        priority = 0.7,
      }) => `
  <url>
    <loc>${new URL(route, options.siteUrl)}</loc>${
      lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""
    }${
      changefreq ? `\n    <changefreq>${changefreq}</changefreq>` : ""
    }
    <priority>${priority}</priority>
  </url>
      `.trim()).join("\n  ")
  }
</urlset>
  `.trim();
}

export async function generateSitemap(
  routes: ServerBuild["routes"],
  loaderArgs: LoaderFunctionArgs,
  options: SEOOptions
) {
  const { siteUrl, headers } = options;
  const text = await renderSitemapXml(loaderArgs, routes, { siteUrl });
  const { byteLength } = new TextEncoder().encode(text);
  return new Response(text, {
    headers: {
      ...headers,
      "Content-Type": "application/xml",
      "Content-Length": String(byteLength),
    },
  });
}
