# Contributing

Use Node.js 22.13+ and `npm ci`. Keep changes focused and include a clear explanation and appropriate validation in the pull request.

## Keep documentation with the code

1. Update the user guide for changed behavior, deployment/security docs for operational changes, or the changelog when no guide change is needed.
2. Run `npm run docs:generate` when routes, environment reads, navigation, dependencies or npm commands change.
3. Run `npm run check`. CI rejects generated-reference drift, broken local documentation links, unsafe public files, failing tests and failed builds.
4. CI also checks push/PR changes: application changes must include a Markdown documentation update. This is a review guard, not an automatic prose writer.
5. Follow the browser checklist in [Testing](docs/TESTING.md) for UI changes and record the affected checks in the PR.

Do not commit real finance data, databases, backups, credentials, recovery/invitation codes, deployment hostnames or private operational notes. Public examples use fictional identities and reserved example domains. `.local/` is for ignored, machine-specific material.

Security reports belong in the private channel described in [SECURITY.md](SECURITY.md), not public issues. Do not test another person's hosted instance without permission.
