import { XMLParser } from "fast-xml-parser"
import { expect, test, vi } from "vitest"

import { generateSitemap } from "./sitemap.xml.ts"
import type { LoaderFunctionArgs, ServerBuild } from "react-router"
import type { SitemapOptions } from "./types.ts"

async function parsedSitemap(
  routes: ServerBuild["routes"] = {},
  args: LoaderFunctionArgs = {} as LoaderFunctionArgs,
  options: SitemapOptions = { siteUrl: "https://example.org" },
) {
  const response = await generateSitemap(routes, args, options)
  const text = await response.text()
  expect(Array.from(response.headers.entries())).toEqual([
    ["content-length", String(text.length)],
    ["content-type", "application/xml"],
  ])
  return new XMLParser().parse(text)
}

test("empty sitemap", async () => {
  const parsed = await parsedSitemap()
  expect(parsed.urlset).toBe("")
})

test("only creates entries for paths with a default export", async () => {
  const parsed = await parsedSitemap({
    path: {
      id: "path",
      parentId: "root",
      path: "path",
      module: { default: () => {} },
    },
    path2: {
      id: "path2",
      path: "path2",
      module: { default: undefined },
    },
    path3: {
      id: "path3",
      path: "path3",
      module: { default: () => {} },
    },
  })
  expect(parsed.urlset.url).toEqual([
    { loc: "https://example.org/path", priority: 0.7 },
    { loc: "https://example.org/path3", priority: 0.7 },
  ])
})

test("creates hierarchy", async () => {
  const parsed = await parsedSitemap({
    root: {
      id: 'root',
      module: { default: undefined },
    },
    path: {
      id: "path",
      parentId: "root",
      path: "path",
      module: { default: () => {} },
    },
    path2: {
      id: "path2",
      parentId: "path",
      path: "path2",
      module: { default: () => {} },
    },
    path3: {
      id: "path3",
      parentId: "path2",
      path: "path3",
      module: { default: () => {} },
    },
  })
  expect(parsed.urlset.url).toEqual([
    { loc: "https://example.org/path", priority: 0.7 },
    { loc: "https://example.org/path/path2", priority: 0.7 },
    { loc: "https://example.org/path/path2/path3", priority: 0.7 },
  ])
})

test("excludes wildcards", async () => {
  const parsed = await parsedSitemap({
    path: {
      id: "path",
      path: "path",
      module: { default: () => {} },
    },
    path2: {
      id: "path2",
      path: ":path2",
      module: { default: () => {} },
    },
    path3: {
      id: "path3",
      path: "*",
      module: { default: () => {} },
    },
  })
  expect(parsed.urlset.url).toEqual({
    loc: "https://example.org/path",
    priority: 0.7,
  })
})

test("warns on duplicate route entry with different config", async () => {
  let wasSpyHit = false
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation((...args) => {
    expect(args[0]).toBe("Duplicate route for path with different sitemap data")
    expect(args[1]).toEqual({
      entry: {
        changefreq: "always",
        route: "path",
      },
      existingEntryForRoute: {
        route: "path",
      },
    })
    wasSpyHit = true
  })
  await parsedSitemap({
    path: {
      id: "path",
      path: "path",
      module: {
        default: () => {},
        handle: { getSitemapEntries: () => [{
          priority: undefined,
          route: "path",
        }] },
      },
    },
    path2: {
      id: "path2",
      path: "path",
      module: {
        default: undefined,
        handle: { getSitemapEntries: () => [{
          changefreq: "always",
          route: "path",
        }] },
      },
    },
    path3: {
      id: "path3",
      path: "path",
      module: {
        default: () => {},
      },
    },
    path4: {
      id: "path4",
      index: true,
      module: {
        default: () => {},
      },
    },
    path5: {
      id: "path5",
      module: {
        default: () => {},
      },
    },
  })
  expect(wasSpyHit).toBe(true)
  warnSpy.mockRestore()
})

test("allows skipping entry", async () => {
  const parsed = await parsedSitemap({
    path: {
      id: "path",
      path: "path",
      module: {
        default: undefined,
        handle: { getSitemapEntries: () => null },
      },
    },
  })
  expect(parsed.urlset).toBe("")
})

test("allows custom entries", async () => {
  const lastmod = new Date().toISOString().split("T")[0]
  const parsed = await parsedSitemap({
    path: {
      id: "path",
      path: "path",
      module: {
        default: undefined,
        handle: {
          getSitemapEntries: async () => [
            { priority: 0.2, route: "foo/bar" },
            { route: "foo/bar2", changefreq: "always", lastmod },
          ],
        },
      },
    },
    path2: {
      id: "path2",
      path: "path2",
      module: {
        default: undefined,
        handle: {
          getSitemapEntries: async () => [null],
        },
      },
    },
  })
  expect(parsed.urlset.url).toEqual([
    { loc: "https://example.org/foo/bar", priority: 0.2 },
    { loc: "https://example.org/foo/bar2", changefreq: "always", lastmod, priority: 0.7 },
  ])
})
