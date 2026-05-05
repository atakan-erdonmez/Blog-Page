# Codebase Improvements & Refactoring Report

This document summarizes the changes made to the project to improve performance, maintainability, and architectural health, following modern web development best practices.

## 1. Dependency Pruning

| Change | Reason |
| :--- | :--- |
| **Removed Mermaid.js** | The project transitioned to static SVGs. Removing the library reduces the bundle size and removes unnecessary client-side processing. |
| **Removed Playwright** | No test suites or configurations were present. Removing unused dependencies keeps the project lean and reduces potential security vulnerabilities in the supply chain. |

## 2. Layout & Script Optimization (`src/layouts/BlogPost.astro`)

| Change | Reason |
| :--- | :--- |
| **Removed `is:inline` from scripts** | **Performance:** By default, Astro bundles and minifies scripts. `is:inline` prevents this optimization. Removing it allows the browser to cache the script, making subsequent page loads faster. |
| **Refactored TOC Script** | **Maintainability:** Added TypeScript types and improved the `slugify` and `IntersectionObserver` logic for better reliability and readability. |

## 3. CSS Modernization (`src/styles/global.css` & `src/pages/index.astro`)

| Change | Reason |
| :--- | :--- |
| **Redundancy Cleanup** | Removed properties like `min-height: 100%` where `100vh` was already present. This reduces CSS file size and eliminates browser calculation overhead. |
| **Logical Properties** | Replaced physical properties (e.g., `margin-left`) with logical ones (`margin-inline`). This is future-proof for different reading directions (RTL/LTR) and is the current industry standard. |
| **Fluid Container Widths** | Replaced rigid `50%` widths with `min(100% - 2rem, 800px)`. This preserves the design's "beauty" on desktops while ensuring content doesn't become too narrow on tablets. |
| **Modern Accessibility** | Replaced the 20-line `.sr-only` (Screen Reader Only) class with a modern 5-line implementation, removing hacks for obsolete browsers like Internet Explorer 6/7. |
| **Fluid Typography** | Validated and commented the use of `clamp()` in the landing page, which allows font sizes to scale smoothly between mobile and desktop without "jumpy" media queries. |

## 4. Documentation Updates

| Change | Reason |
| :--- | :--- |
| **Updated `GEMINI.md`** | Synchronized the project overview with the new architecture (Astro 6, MDX, No Mermaid) to ensure future AI/Developer interactions have accurate context. |

---
*These changes focused on improving the "machinery" of the site without altering the visual design or aesthetic intended by the user.*
