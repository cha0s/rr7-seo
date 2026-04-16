import { randomBytes } from "node:crypto"

import { expect, test } from "vitest"

import { generateRobotsTxt } from "./robots.txt.ts"

test("outputs default policies", async () => {
  const response = generateRobotsTxt()
  expect(await response.text()).toBe(`
User-agent: *
Allow: /
  `.trim())
  expect(Array.from(response.headers.entries())).toEqual([
    ["content-length", "22"],
    ["content-type", "text/plain"],
  ])
})

test("appends to default policies", async () => {
  const response = generateRobotsTxt(
    [{ type: "sitemap", value: "https://example.org/sitemap.xml" }],
  )
  expect(await response.text()).toBe(`
User-agent: *
Allow: /
Sitemap: https://example.org/sitemap.xml
  `.trim())
})

test("overrides default policies", async () => {
  const response = generateRobotsTxt(
    [{ type: "sitemap", value: "https://example.org/sitemap.xml" }],
    { includeDefaultPolicies: false },
  )
  expect(await response.text()).toBe(`
Sitemap: https://example.org/sitemap.xml
  `.trim())
})

test("can add arbitrary headers", async () => {
  const id = randomBytes(8).toString('hex')
  const response = generateRobotsTxt(
    [],
    { headers: { 'x-rr7-seo': String(id) } },
  )
  expect(response.headers.get('x-rr7-seo')).toBe(id)
})
