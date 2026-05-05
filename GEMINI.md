# Project Overview: Atakan Erdonmez's Blog

This is a personal website and blog built using **Astro v6**. It serves as a platform for sharing technical articles, project portfolios, and personal insights.

## Technologies & Architecture

-   **Framework:** [Astro](https://astro.build/) (v6.1.8)
-   **Content Management:** MDX via `@astrojs/mdx` and `astro:content` collections.
-   **Scripting:** TypeScript.
-   **Styling:** Vanilla CSS with scoped styles in Astro components and a global stylesheet (`src/styles/global.css`).
-   **Image Handling:** [Sharp](https://sharp.pixelplumbing.com/) for optimization and [medium-zoom](https://medium-zoom.js.org/) for interactive image zooming.
-   **Fonts:** Local "Atkinson" font configured via `astro/config`.

## Project Structure

-   `src/content/blog/`: Markdown and MDX files for blog posts.
-   `src/content/Images/`: Assets specifically used within blog content.
-   `src/pages/`: Astro routing (includes `index.astro`, `about.astro`, and dynamic blog routes).
-   `src/components/`: Reusable UI components (Header, Footer, BaseHead, etc.).
-   `src/layouts/`: Page layouts, notably `BlogPost.astro` for article structure.
-   `src/assets/`: Global assets like fonts and general-purpose images.
-   `public/`: Static files served at the root (favicon, etc.).

## Building and Running

### Key Commands

-   `npm install`: Install project dependencies.
-   `npm run dev`: Start the local development server at `http://localhost:4321`.
-   `npm run build`: Generate the production-ready site in the `dist/` directory.
-   `npm run preview`: Preview the production build locally.

### Deployment

The project is deployed to a VPS via **GitHub Actions** (`.github/workflows/main.yml`). On every push to the `main` branch, the site is built and synced to the server using `rsync` over SSH.

## Development Conventions

### Blog Posts

-   **Location:** All posts must be in `src/content/blog/`.
-   **Frontmatter:** Must adhere to the Zod schema defined in `src/content.config.ts`:
    ```yaml
    ---
    title: "Post Title"
    description: "Brief summary of the post"
    pubDate: 2026-05-05
    updatedDate: 2026-05-06 # Optional
    heroImage: "../../assets/hero.png" # Optional
    ---
    ```
-   **Images:** Prefer placing post-specific images in `src/content/Images/` and referencing them via relative paths.
-   **Features:**
    -   **Table of Contents:** Automatically generated for `h2` and `h3` tags in `BlogPost.astro`.
    -   **Zoom:** Images in articles are automatically zoomable via `medium-zoom`.

### Coding Standards

-   Use TypeScript for all scripts.
-   Follow Astro's component-based architecture for UI elements.
-   Ensure responsive design (mobile-first approach).
