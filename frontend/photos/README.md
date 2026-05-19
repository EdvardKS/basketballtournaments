# frontend/photos/

Past-edition Instagram screenshots, served by `src/pages/foto/[...path].ts`
(NOT through `/public/`, so every request runs through our UA check and
gets the `X-Robots-Tag: noindex, nofollow, noimageindex, noarchive`
header).

Filenames are pinned by the gallery (see `src/lib/gallery.ts`): exactly

```
I (1).PNG … I (5).PNG
II (1).PNG … II (16).PNG
III (1).PNG … III (10).PNG
```

The endpoint hard-rejects any filename that doesn't match that pattern.

The PNGs themselves are gitignored — drop them into this folder on each
machine before `docker compose build`. The Dockerfile copies the whole
directory into the image (`COPY photos ./photos`); the dev compose file
bind-mounts it read-only at `/app/photos` so editing them on the host
shows up without a rebuild.
