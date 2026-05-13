---
title: A Self-Hosted Blog with Automated Publishing and CI/CD
description: Designing a static website with automated content publishing using Astro and Github Actions
pubDate: 2026-05-10
heroImage: ../Images/automated_blog_banner.png
---
For publishing my content, I needed a website. For this, I used an SSG (Static Site Generator) hosted on my personal VPS, with a fully automated pipeline for publishing content. 

## Purpose and Scope
---
I needed a website as a central platform to my professional work. The main purpose is to share blogs, projects, and content. It also serves as a gateway to my personal knowledge base, internal documentation, portfolio, and professional profiles (LinkedIn/GitHub)

## Requirements
---
Creating the website, priority requirements were:
- **Speed and performance**: Functionality was preferred over aesthetics for content focused work, resulting in a server-first approach for rendering.
- **Small footprint**: Since the resources on the server were limited, only the absolutely necessary components should be used. A database or a backend engine is not needed. 
- **Attack surface**: Because the system is self-hosted on a public VPS, minimizing exposed services, dependencies, and potential entry points is a core requirement.
- **Automated publishing**: Decoupling infrastructure and content creation was essential to allow focusing on writing instead of deployment.

## Design Decisions
---
### SSG vs CMS
A CMS (Content Management System) like WordPress is rejected due to the increased attack surface, increased complexity for management, and additional resource usage. Since this is a content-rich website, an SSG is preferred for reliability and performance.

### Astro
Astro framework was selected for its low overhead and static-first design. It uses [Island Architecture](https://docs.astro.build/en/concepts/islands/), where pages are rendered as static HTML by default and JavaScript is only loaded for isolated interactive components, keeping most of the site lightweight.

Astro also has strong support for markdown compared to its competitors. Since writing is done in Obsidian, this allows Markdown files to be directly converted into structured pages with optional schema validation, making content management consistent and simple.

### Hosting
Instead of a serverless solution like Vercel or Netlify, self-hosting on a VPS is chosen. Main reasons were:
- Root-level access
- Granular CI/CD control
- Personal learning and development

Since the main reason I created this website was showcasing my work and homelab, I decided that using a third party serverless solution would contradict the self-hosting philosophy of this project.

### Pipeline & Automation
Keeping infrastructure and content publishing separate was one of the main requirements for this project. Since Obsidian is used for writing, a solution that would publish content in Obsidian automatically was needed.

For this, GitHub Actions were utilized. The Obsidian notes are in a private repo, and the website is in a public repo, both in GitHub. So, a pipeline is created:
1. Obsidian notes are committed and pushed to the private repo, triggering the first Action.
2. The first action copies the notes to the public repo, triggering the second Action.
3. Second action pushes the newly uploaded notes to the VPS, building and deploying.

PAT (Personal Access Token) is used for transferring files between. For deploying and publishing, a push method is used with an SSH key for a dedicated service account (deploy-bot) with restricted shell access and scoped directory permissions. More on this on the [[#Security Posture]]

### Push Model
For uploading from public repo to the VPS, both push and pull models were evaluated. Both had pros and cons:

| Feature         | Pull Model                        | Push Model                         |
| :-------------- | :-------------------------------- | ---------------------------------- |
| **Speed**       | Delayed (poll-based)              | Instant (event-driven)             |
| **Complexity**  | Requires server-side cron/scripts | Clean server-side state            |
| **Security**    | No external SSH access needed     | Requires SSH key in GitHub Secrets |
| **Maintenance** | Higher (Server-side management)   | Lower (Centralized in CI/CD)       |
Even though push model had more security risk, it was the superior choice with necessary risk mitigation. 

### Custom Location for Images
A custom path is created for storing images. Since Obsidian and Astro has different directory hierarchies, in order to keep the post same in both, a custom path was needed.

By using the `../Images/image.png` relative path, content looks the same both on the Obsidian and the website.

## Implementation
---
### Private - Public Repo
Obsidian already has read-write access to the private repo. But since I use Obsidian for multiple purposes, I needed a way to only trigger a GitHub Action on a specific folder change, specifically "20_Blogs/Posts/".

The first Action checks out both repos (using PAT), copies content and images using rsync (--exclude flag is used for folder notes), then commits and pushes to the public repo.
```yaml
name: Sync Blog to Astro

on:
  push:
    branches:
      - main
    paths:
      - '20_Blogs/Posts/**'
  workflow_dispatch:

jobs:
  sync-and-push:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Vault (Private)
        uses: actions/checkout@v4

      - name: Checkout Astro Repo (Public)
        uses: actions/checkout@v4
        with:
          repository: atakan-erdonmez/Blog-Page
          token: ${{ secrets.BLOG_REPO_TRIGGER_TOKEN }} # Fine-grained PAT
          path: astro-site

      - name: Sync Files
        run: |
          # Create the target directory if it doesn't exist in the Astro repo
          mkdir -p astro-site/src/content/blog/

          # Sync posts from vault folder to Astro content folder
          # The --delete flag removes posts from Astro if deleted in Obsidian
          rsync -av --delete --exclude '_index.md' "20_Blogs/Posts/" "astro-site/src/content/blog/"
          rsync -av --delete --exclude '_index.md' "20_Blogs/Images/" "astro-site/src/content/Images/"

      - name: Commit and Push to Astro Repo
        run: |
          cd astro-site
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          
          git add .
          
          # Only commit and push if there are actual changes
          if ! git diff --cached --quiet; then
            git commit -m "sync: update blog posts from vault"
            git push origin main
          else
            echo "No changes detected."
          fi
```

### Public Repo - VPS
After there is a change in the main branch of the public repo, the second Action is run. The main purpose of this Action is pushing the new code to the VPS using SSH, then building with npm and putting into the correct directory. "easingthemes/ssh-deploy@main" is used for this.

```yaml
name: Build and Deploy the Astro page

on:
  push:
    branches:
      - main
  workflow_dispatch: 

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install and Build
        run: |
          npm install
          npm run build

      - name: Deploy to VPS
        uses: easingthemes/ssh-deploy@main
        with:
          SSH_PRIVATE_KEY: ${{ secrets.VPS_SSH_PRIVATE_KEY }}
          ARGS: "-rlgoDzvc -i --delete"
          SOURCE: "dist/" # The folder Astro builds into
          REMOTE_HOST: ${{ secrets.VPS_IP }}
          REMOTE_USER: "deploy-bot" # Using the restricted user
          TARGET: "/var/www/astro-blog" # The folder the user owns
```

## Security Posture
---
The main security concern in this architecture is granting automated access from GitHub Actions to the production VPS. In this push model, the CI/CD pipeline holds an SSH private key that can write directly to the web server. If this credential were compromised, an attacker could modify the website contents.

### Trade-offs
| Advantages                                 | Disadvantages                                                             |
| ------------------------------------------ | ------------------------------------------------------------------------- |
| Immediate deployment after every commit    | Requires storing an SSH private key in GitHub Secrets                     |
| No cron jobs or pull scripts on the server | Implicit trust in GitHub’s secret storage and Action environment security |
| Simpler server-side configuration          | Compromise of the CI environment could impact the VPS                     |
| Clear deployment flow                      | Additional credential management is required                              |

Although the push model introduces credential-management risk, it was selected because of its operational simplicity and near-instant publishing workflow.

### Risk Mitigation Measures
To reduce the impact of a credential compromise, the deployment process was isolated using a dedicated service account named `deploy-bot`.

The account was configured with the following restrictions:
- Separate non-privileged Linux user
- No `sudo` access
- Ownership limited to `/var/www/astro-blog`
- SSH key-based authentication only
- Private key stored securely in GitHub Actions Secrets
- Used exclusively for automated deployments

With this design, even if the deployment SSH key were exposed, the attacker would only be able to modify files within the website directory and would not gain administrative access to the server.

### Additional Hardening Options
Further restrictions can be applied to reduce the attack surface even more:

- Restrict the SSH key in `authorized_keys` using a forced command
- Disable interactive shell access (`/usr/sbin/nologin`)
- Limit SSH access to GitHub's runner IP ranges (would require periodic updates)

These controls were not strictly necessary for a static website, but they are valid defense-in-depth measures for production environments.

### Security Assessment

The selected deployment model balances convenience and security. The server accepts automated updates from GitHub Actions, but the deployment credential is constrained by the principle of least privilege. Since the site is fully static and no application runtime or database is exposed, the overall attack surface remains minimal compared to traditional CMS-based hosting.

## Final Architecture
---
The final architecture consists of three loosely coupled components: content creation, source control, and hosting.

#### Content Layer
Blog posts are written in Obsidian using Markdown. The notes are stored in a private GitHub repository, which also contains non-public knowledge base content.

A GitHub Actions workflow monitors the blog directory within the private repository. When changes are detected, the workflow copies only the blog posts and images to the public website repository.

#### Build and Deployment Layer  
A second GitHub Actions workflow is triggered by changes to the public repository. It builds the site using Astro and deploys the generated static files to the VPS over SSH.

#### Hosting Layer  
The VPS serves the generated files from `/var/www/astro-blog` using Nginx. Since the site consists entirely of static HTML, CSS, and assets, no application runtime or database is required.

```
Obsidian  
↓  
Private GitHub Repository  
↓ (GitHub Action #1)  
Public Website Repository  
↓ (GitHub Action #2)  
Astro Build  
↓  
VPS (/var/www/astro-blog)  
↓  
Nginx  
↓  
End Users
```

#### Architectural Features
The resulting architecture provides:
- Separation between private notes and public content
- Fully automated publishing
- Static hosting with minimal server resources
- Reduced attack surface
- Clear CI/CD pipeline
- Low operational overhead

This design meets all original requirements while remaining simple, maintainable, and cost-effective.

## Lessons Learned
- Keeping the server-side clean from jobs and configs is easier for management. Keeping all the config on the Github side made management easier for the VPS.
- Traditionally "most-secure" way might not be the best solution. Pull method was more "traditionally secure", but was not the best option.
- Custom changes might be necessary in various components for keeping multiple systems stable, like in the custom images path.