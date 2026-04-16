import type { RobotsPolicy, RobotsConfig } from "./types.ts";

const typeToLabel = {
  userAgent: "User-agent",
  allow: "Allow",
  disallow: "Disallow",
  sitemap: "Sitemap",
  crawlDelay: "Crawl-delay",
};

const defaultPolicies: RobotsPolicy[] = [
  {
    type: "userAgent",
    value: "*",
  },
  {
    type: "allow",
    value: "/",
  },
];

export function generateRobotsTxt(
  policies: RobotsPolicy[] = [],
  {
    includeDefaultPolicies = true,
    headers,
  }: RobotsConfig = {}
) {
  const text = (includeDefaultPolicies ? defaultPolicies : []).concat(policies)
    .map(({ type, value }) => `${typeToLabel[type]}: ${value}`)
    .join("\n")
  const { byteLength } = new TextEncoder().encode(text);
  return new Response(text, {
    headers: {
      ...headers,
      "Content-Type": "text/plain",
      "Content-Length": String(byteLength),
    },
  });
}
