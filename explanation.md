# Project Overview: Atakan Erdonmez's Blog

This document provides a technical overview of the website, intended for developers or individuals examining the source code. It details the architecture, content management, and key technologies employed.

## Core Technologies and Architecture

### Astro: A Modern Web Framework

Astro is a web framework optimized for content-driven websites. Its primary design goals are performance and developer experience.

*   **Static Site Generation (SSG):** Astro pre-renders pages into static HTML, CSS, and JavaScript files during the build process. This approach ensures rapid loading times for end-users as pages are served fully formed.
*   **Islands Architecture:** Astro components are treated as "islands" of interactivity. By default, these islands are rendered to static HTML, and JavaScript is only shipped to the client when explicitly enabled for a component. This selective hydration significantly reduces the amount of JavaScript the browser needs to download and execute, enhancing performance.

### Markdown to HTML Conversion

Blog posts are authored in Markdown (`.md` files) and processed by Astro into HTML pages.

1.  **Content Source:** Blog posts reside within the `src/content/blog/` directory.
2.  **Frontmatter:** Each Markdown file begins with a frontmatter block, enclosed by `---` delimiters. This section contains metadata for the post, such as:
    *   `title`: The primary title of the article.
    *   `description`: A concise summary for previews and search engines.
    *   `pubDate`: The publication date.
    *   `updatedDate`: (Optional) The date of the last revision.
    *   `heroImage`: (Optional) A relative path to a featured image.
3.  **Content Schema (`src/content.config.ts`):** This file defines the structure and types for the frontmatter data using the Zod validation library. It ensures consistency and correctness across all blog posts by enforcing the expected fields and their data types. When Astro builds the site, it validates each content file against this schema.
4.  **Layouts (`src/layouts/BlogPost.astro`):** A dedicated layout file structures the final blog post page. It includes common elements like headers and footers, and dynamically injects the content rendered from the Markdown file. It also handles features like automatic table of contents generation and image zooming.
5.  **Dynamic Routing (`src/pages/blog/[...slug].astro`):** Astro's file-based routing system uses this file to generate individual pages for each blog post. The `[...slug].astro` pattern allows Astro to capture any URL segment following `/blog/` as a "slug" (derived from the Markdown filename) and use it to construct the page. During the build, Astro iterates through all valid Markdown files in `src/content/blog/` and creates a corresponding HTML page for each.

## Key Project Directories and Components

This section outlines the primary directories and their roles within the Astro project.

*   **Root Directory:** Contains core configuration files like `astro.config.mjs`, `package.json` (project dependencies), and `tsconfig.json` (TypeScript configuration).
*   **`public/`:** Houses static assets that are served directly from the website's root path (e.g., `favicon.ico`).
*   **`src/`:** The main source code directory.
    *   **`assets/`:** Stores general-purpose assets such as fonts and images used across the site.
    *   **`components/`:** Contains reusable UI components written in Astro's `.astro` syntax. These files define modular UI elements like navigation headers and footers.
    *   **`content/`:** Manages structured content.
        *   **`content/blog/`:** The primary location for Markdown files that constitute blog posts.
        *   **`content/Images/`:** Holds images specifically intended for use within blog post content.
    *   **`layouts/`:** Houses page template files that define the overall structure for different types of pages (e.g., `BlogPost.astro` for articles).
    *   **`pages/`:** Defines the website's routing. Each file or directory structure here maps to a URL path. Key files include:
        *   `index.astro`: The homepage.
        *   `about.astro`: The "About Me" page.
        *   `blog/index.astro`: The main blog post listing page.
        *   `blog/[...slug].astro`: The dynamic route handler for individual blog posts.
    *   **`styles/`:** Contains global CSS files, such as `global.css`, that apply site-wide styling.

## Core Concepts for Codebase Understanding

*   **Astro Components (`.astro` files):** These are files that combine HTML, CSS, and JavaScript/TypeScript. They are the building blocks for the user interface, often rendered statically to HTML.
*   **Content Collections (`astro:content`):** Astro's system for managing structured content. It enables defining schemas for content files, validating them, and querying them efficiently.
*   **Static Site Generation (SSG):** The process of building the final website as a set of static HTML files, optimized for fast delivery.
*   **Island Architecture & Hydration:** A performance strategy where UI components are rendered as independent "islands." JavaScript is only loaded and executed on the browser (hydrated) for islands that require interactivity, minimizing client-side load.
*   **Frontmatter:** Metadata embedded at the top of content files (e.g., `.md`, `.astro`) using YAML, typically for defining titles, dates, and other descriptive information.