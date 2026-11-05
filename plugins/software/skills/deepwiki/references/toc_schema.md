# TOC Schema Specification

This document defines the schema for `toc.json`, the table of contents that drives
wiki generation.

The TOC is **JSON**, not YAML. That keeps the whole toolchain on the Python standard
library — nothing to `pip install` — and it is the same shape the catalogue phase
emits. A legacy `toc.yaml` from upstream deepwiki-skill can be converted with:

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/deepwiki/scripts/toc_io.py --convert path/to/toc.yaml   # -> toc.json
```

## Complete Schema

```json
{
  "project": {
    "name": "string",              // Required: Project name
    "description": "string",       // Required: Brief description (1-2 sentences)
    "repo_base_url": "string",     // Optional: Base web URL without commit hash,
                                   //   e.g. "https://github.com/owner/repo/blob"
                                   //   Omit for a local-only repo; citations then
                                   //   fall back to the plain (file.ts:42) form.
    "ref_commit_hash": "string",   // Required: Commit hash for permanent links
    "updated_at": "string",        // Optional: Last update date (YYYY-MM-DD)
    "language": "string"           // Optional: Output locale (default: en-US)
  },

  "pages": [                       // Required: Array of page definitions
    {
      "id": "string",              // Required: Unique page identifier
      "title": "string",           // Required: Page title
      "filename": "string",        // Required: Output file, e.g. "01_overview.md"
      "description": "string",     // Optional: Brief page description

      "source_files": ["string"],  // Required: Page-level sources (paths or globs)

      "sections": [                // Required: Array of section definitions
        {
          "id": "string",          // Required: Unique section identifier
          "title": "string",       // Required: Section title
          "description": "string", // Optional: Guidance for content generation
          "autogen": true,         // Required: Whether to auto-generate content
          "source_files": ["string"],      // Optional: Extra section-level sources
          "diagrams_needed": true,         // Required: Whether diagrams are needed
          "diagram_types": ["flowchart"],  // Required when diagrams_needed is true.
                                           //   flowchart | sequence | class |
                                           //   state | er | gantt
          "sections": []           // Optional: Nested subsections, same structure
        }
      ],

      "related_pages": ["string"]  // Optional: Related page IDs for cross-linking
    }
  ],

  "notes": ["string"]              // Optional: Notes about the structure
}
```

> The `//` comments above are annotation only. Real `toc.json` must be strict JSON
> with no comments and no trailing commas — `toc_io.load_toc()` will reject it
> otherwise.

## Field Details

### project Section

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Project name for display |
| `description` | string | Yes | Brief 1-2 sentence description |
| `repo_base_url` | string | No | Base URL without commit hash |
| `ref_commit_hash` | string | Yes | Current commit hash (from `git rev-parse HEAD`) |
| `updated_at` | string | No | Date in YYYY-MM-DD format |

### Page ID Format

Page IDs must be globally unique across all wiki pages:

```
{repo_name}_{number}_{page-name}
```

Examples:
- `myproject_01_overview`
- `myproject_02_architecture`
- `myproject_03_api-reference`

Rules:
- Use repository name as prefix
- Include zero-padded number for ordering
- Use kebab-case for page name
- No spaces or special characters

### Section ID Format

Section IDs inherit from page ID:

```
{page_id}_{section-name}
```

For nested sections:
```
{parent_section_id}_{subsection-name}
```

Examples:
- `myproject_01_overview_introduction`
- `myproject_01_overview_core-concepts`
- `myproject_01_overview_core-concepts_architecture`

### source_files Patterns

Support both explicit paths and glob patterns:

| Pattern | Description |
|---------|-------------|
| `src/main.py` | Exact file path |
| `src/*.py` | All Python files in src/ |
| `src/**/*.py` | All Python files recursively |
| `src/` | All files in src/ directory |
| `docs/api/*.md` | All markdown in docs/api/ |

### diagram_types Values

| Type | Use Case |
|------|----------|
| `flowchart` | Process flows, decision trees, data flow |
| `sequence` | Interaction sequences, API calls |
| `class` | Class relationships, inheritance |
| `state` | State machines, status transitions |
| `er` | Entity relationships, database schema |
| `gantt` | Project timelines (rarely used) |

## Example TOC

```json
{
  "project": {
    "name": "MyWebApp",
    "description": "A modern web application with React frontend and Node.js backend",
    "repo_base_url": "https://github.com/company/mywebapp/blob",
    "ref_commit_hash": "a1b2c3d4e5f6",
    "updated_at": "2024-01-15"
  },
  "pages": [
    {
      "id": "mywebapp_01_overview",
      "title": "Overview",
      "filename": "01_overview.md",
      "description": "Project introduction and key features",
      "source_files": [
        "README.md",
        "package.json",
        "docs/*.md"
      ],
      "sections": [
        {
          "id": "mywebapp_01_overview_introduction",
          "title": "Introduction",
          "autogen": true,
          "diagrams_needed": false,
          "diagram_types": []
        },
        {
          "id": "mywebapp_01_overview_features",
          "title": "Key Features",
          "description": "List and explain main features with examples",
          "autogen": true,
          "diagrams_needed": true,
          "diagram_types": [
            "flowchart"
          ]
        },
        {
          "id": "mywebapp_01_overview_tech-stack",
          "title": "Technology Stack",
          "autogen": true,
          "diagrams_needed": false,
          "diagram_types": []
        }
      ],
      "related_pages": [
        "mywebapp_02_architecture"
      ]
    },
    {
      "id": "mywebapp_02_architecture",
      "title": "Architecture",
      "filename": "02_architecture.md",
      "source_files": [
        "src/**/*.ts",
        "src/**/*.tsx"
      ],
      "sections": [
        {
          "id": "mywebapp_02_architecture_overview",
          "title": "Architecture Overview",
          "autogen": true,
          "diagrams_needed": true,
          "diagram_types": [
            "flowchart",
            "class"
          ]
        },
        {
          "id": "mywebapp_02_architecture_frontend",
          "title": "Frontend Architecture",
          "autogen": true,
          "source_files": [
            "src/components/**/*.tsx"
          ],
          "diagrams_needed": true,
          "diagram_types": [
            "class"
          ],
          "sections": [
            {
              "id": "mywebapp_02_architecture_frontend_components",
              "title": "Component Structure",
              "autogen": true,
              "diagrams_needed": false,
              "diagram_types": []
            },
            {
              "id": "mywebapp_02_architecture_frontend_state",
              "title": "State Management",
              "autogen": true,
              "diagrams_needed": true,
              "diagram_types": [
                "flowchart"
              ]
            }
          ]
        },
        {
          "id": "mywebapp_02_architecture_backend",
          "title": "Backend Architecture",
          "autogen": true,
          "source_files": [
            "src/api/**/*.ts"
          ],
          "diagrams_needed": true,
          "diagram_types": [
            "sequence"
          ]
        }
      ],
      "related_pages": [
        "mywebapp_01_overview",
        "mywebapp_03_api"
      ]
    }
  ],
  "notes": [
    "Frontend uses React with TypeScript",
    "Backend is Node.js with Express",
    "State management via Redux Toolkit"
  ]
}
```

## Validation Rules

1. **ID Uniqueness**: All page and section IDs must be unique
2. **Required Fields**: All required fields must be present
3. **File Extension**: Filename must end with `.md`
4. **Diagram Types**: Must be from allowed values when specified
5. **Section Depth**: Recommend max 3 levels of nesting
6. **Source Files**: Each page should have at least 1 source file

## Page Count Guidelines

| Project Size | Recommended Pages |
|--------------|-------------------|
| Small (< 10 files) | 3-5 pages |
| Medium (10-50 files) | 5-8 pages |
| Large (50-200 files) | 8-12 pages |
| Very Large (> 200 files) | 10-15 pages |

## Common Page Categories

Choose relevant categories based on project type:

- **Overview**: Introduction, features, quick start
- **Getting Started**: Installation, setup, prerequisites
- **Architecture**: System design, components, patterns
- **Core Features**: Main functionality modules
- **API Reference**: Endpoints, interfaces, methods
- **Configuration**: Settings, environment, options
- **Data Model**: Database schema, data structures
- **Frontend/UI**: Components, pages, styling
- **Backend/Services**: Server logic, middleware
- **Testing**: Test strategy, examples
- **Deployment**: Build, deploy, infrastructure
- **Development Guide**: Contributing, code standards
