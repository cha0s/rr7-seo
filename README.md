# React Router 7 (RR7-)SEO

A fork of https://github.com/nasa-gcn/remix-seo with updates to simplify and modernize the library.

Collection of SEO utilities like sitemap, robots.txt, etc. for a
[React Router](https://reactrouter.com/start/framework/installation) application.

# Features

- Generate Sitemap
- Generate Robots.txt

# Installation

To use it, install it from npm (or yarn):

```sh
npm install rr7-seo
```

# Usage

Add a sitemap and a robots.txt file to your site by adding
[resource routes](https://remix.run/docs/en/main/guides/resource-routes) for them, as explained
below.

## Sitemap

Add to your project a route module called `app/routes/sitemap[.]xml.ts` with the following contents:

```ts
import { generateSitemap } from "rr7-seo";

import { routes } from "virtual:react-router/server-build";

import { type Route } from "./+types/sitemap[.]xml.ts";

export function loader(loaderArgs: Route.LoaderArgs) {
  return generateSitemap(routes, loaderArgs, {
    siteUrl: "https://example.com",
  });
}
```

`generateSitemap` takes three params `routes`, `loaderArgs`, and `SEOOptions`.

### Configuration

- `SEOOptions` lets you configure the sitemap: 

```ts
export type SEOOptions = {
  siteUrl: string; // URL where the site is hosted, eg. https://example.com
  headers?: HeadersInit; // additional headers
  // e.g.:
  // headers: {
  //   "Cache-Control": `public, max-age=${60 * 5}`,
  // },
};
```

- To not generate sitemap for a route:

```ts
// in your app/routes/[url-excluded-from-sitemap]
import { type SEOHandle } from "rr7-seo";

export const handle: SEOHandle = {
  getSitemapEntries: () => null,
};
```

- To generate sitemap for dynamic routes:

```ts
// routes/blog/:blogslug.tsx

export const handle: SEOHandle = {
  getSitemapEntries: async () => {
    const blogs = await db.blog.findMany();
    return blogs.map((blog) => {
      return { route: `/blog/${blog.slug}`, priority: 0.7 };
    });
  },
};
```

## Robots

Add a new route module with the filename `app/routes/robots[.txt].ts` and the
following contents:

To generate `robots.txt`:

```ts
import { generateRobotsTxt } from "rr7-seo";

export function loader() {
  return generateRobotsTxt([
    { type: "sitemap", value: "https://example.com/sitemap.xml" },
    { type: "disallow", value: "/super-private-path" },
  ]);
}
```

`generateRobotsTxt` takes two arguments.

First one is array of `policies`:

```ts
export type RobotsPolicy = {
  type: "allow" | "disallow" | "sitemap" | "crawlDelay" | "userAgent";
  value: string;
};
```

and second parameter `RobotsConfig` is for additional configuration:

```ts
export type RobotsConfig = {
  includeDefaultPolicies?: boolean; // include default policies (default: true)
  headers?: HeadersInit; // Additional headers
  // e.g.:
  // headers: {
  //   "Cache-Control": `public, max-age=${60 * 5}`,
  // },
};
```

The default policies are:

```ts
const defaultPolicies: RobotsPolicy[] = [
  { type: "userAgent", value: "*" },
  { type: "allow", value: "/" },
];
```

e.g.:

```
User-agent: *
Allow: /
```
