# Deleted TODO sync fix

## What changed
- Added a file-list callback (`onFilesListed`) in the OneDrive source contract so sync logic can know the current server-side todo file set.
- Updated sync merge logic to remove checkpoint-resumed todos that are no longer present in the listed `.md` files.
- Guarded checkpoint merge so stale checkpoint todos are never reintroduced when files were deleted remotely.

## Why
Previously, checkpoint-resume data (`parsedTodos`) could survive file deletions and be merged back into the final todo map, causing deleted todos to persist after sync.

## Validation
- `TAG_NAME=0.0.0 npm run lint`
- `TAG_NAME=0.0.0 npx tsc --noEmit`
