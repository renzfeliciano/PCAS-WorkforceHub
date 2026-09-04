# WorkforceHub Assets

Use this directory for versioned, public, non-sensitive assets only.

```text
public/assets/
  brand/       Logos, wordmarks, and favicon source files
  icons/       App icons and status icons
  images/      Public illustrations and static imagery
  fonts/       Self-hosted font files when licensing permits
  social/      Open Graph and social preview images
```

Rules:

- Do not place employee photos, government IDs, documents, secrets, or private uploads here.
- Store user-uploaded media in Cloudinary and persist only the secure URL and metadata.
- Use lowercase kebab-case filenames with an explicit extension.
- Optimize images before committing them and use responsive formats where practical.
- Keep immutable branded assets versioned; use hashed filenames for assets that change frequently.
