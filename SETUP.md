# Putting Sena's website online

About 30 minutes, once. Everything lives in Sena's own free accounts, so she owns the site, the photos and the domain. After this, she edits through the editor and never touches these steps again.

## 1. GitHub (Sena)
1. Sena creates a free account at https://github.com/signup.
2. She creates a new repository named `sena-website` (Private is fine). Leave "Add a README" unticked.
3. In the repository: **Settings → Collaborators → Add people**, and add Kokikin's GitHub username.

## 2. Upload these files (Kokikin)
Either:
- **Ask Claude to push them.** Once you've accepted the invite, give Claude the repository name (`sena-username/sena-website`) and it can upload everything for you.
- **Or upload in the browser.** On the empty repository page, click **uploading an existing file** and drag in everything inside this folder. The upload keeps the folders.
  - Include the hidden files `.pages.yml` and `.gitignore`. On a Mac, press **Cmd + Shift + .** in Finder to show them.
  - Don't upload `node_modules` or `dist` if they exist.

## 3. Netlify: publishes the site (Sena)
1. Go to https://app.netlify.com/signup and choose **Sign up with GitHub**.
2. **Add new site → Import an existing project → GitHub**, then pick `sena-website`.
3. The build settings fill in automatically from `netlify.toml` (`npm run build`, publish `dist`). Click **Deploy**.
4. Rename the free address under **Site configuration → Change site name**, for example `sena-studio.netlify.app`.

From now on, every save in the editor republishes the site by itself in about a minute.

## 4. Her own domain (Sena)
1. Buy the domain from any registrar, or directly in Netlify under **Domains**.
2. In Netlify: **Domain management → Add a domain**, then follow the DNS steps it shows.
3. HTTPS (the padlock) is set up automatically.

## 5. The editor: Pages CMS (Sena)
1. Go to https://app.pagescms.org and sign in with GitHub.
2. When asked, install the Pages CMS app for the `sena-website` repository.
3. Open the repository. She'll see **Works** and **About and contact**.
4. In **About and contact**, fill in her email, Instagram and resume, then Save.
5. Optional: under the repository's collaborators in Pages CMS, people can be invited by email with no GitHub account.

The guide page for her is at **her-domain.com/edit**, in English and 한국어. It's not linked from the site and is hidden from search engines. Bookmark it for her.

## What's where
- `content/works/` — one file per work, edited through the editor
- `content/site.json` — name, About text, resume, contact
- `media/works/` — original photos as uploaded
- `src/` — the page designs (`index.html` is the site, `edit.html` is the guide)
- `scripts/build.mjs` — shrinks the photos and builds the finished site into `dist/`
- `.pages.yml` — what the editor shows

To change the design later, attach the repository to a Claude conversation and ask.

To test locally: `npm install` and then `npm run build`, then open `dist/index.html`.
