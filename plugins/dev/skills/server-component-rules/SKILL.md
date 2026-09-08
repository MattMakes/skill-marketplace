---
name: server-component-rules
description: Next.js Server Components and Server Actions best practices. Use when creating React components in Next.js App Router, writing server actions for data access, deciding between server and client components, or reviewing component architecture.
---

# Next.js Server Components & Server Actions Rules

## Server Actions (DAL Controllers)

Use `"use server"` directive. Follow pattern in `src/dal/*/`.

### Execution Order (must follow sequence)
1. Flatten and destructure `passedInPayload` immediately - avoid nested object access throughout function
2. Validate required fields exist (username or userID for auth)
3. Build aggregation pipeline with filters
4. `await connectToDatabase()` before any DB ops
5. Get count before pagination
6. Add sorting and pagination stages
7. Execute query
8. Serialize results
9. **Always use `returnResponse()` for response formatting** - never return raw objects
10. Catch errors with `handleError()`

### Key Rules
- **Flatten payload early**: `const { username, userID, searchTerm, filters } = inputPayloadUtil?.passedInPayload ?? {}`
- **Always use `returnResponse()`** - ensures consistent response structure across all endpoints
- Use `handleErrorWithConstant("ERR-XXX", functionName, context)` for known errors
- Use `handleError(error, functionName, context)` in catch blocks
- Serialize MongoDB objects: `JSON.parse(JSON.stringify(item))`
- Convert ObjectIds: `plainObject._id = plainObject._id.toString()`
- Build match pipelines using `filters` object, not nested criteria

### Anti-patterns
- ❌ `inputPayloadUtil?.passedInPayload?.searchTerm` repeated throughout
- ✅ Destructure once at top, use `searchTerm` directly
- ❌ `return { error, data }` manually
- ✅ `return returnResponse(count, serializedInfo, inputPayloadUtil, createdPipelinesUtil)`

## Server vs Client Components

### Default to Server Components
Use for: data fetching, secrets/API keys, static content, reduced client JS

### Use `'use client'` Only When Needed
Required for: `useState`, `useReducer`, event handlers, `useEffect`, browser APIs (`localStorage`, `window`)

### Patterns
- Minimize client scope - directive on specific interactive components only
- Fetch in server, pass serializable props to client
- Children pattern - pass Server Components as children to Client wrappers
- Wrap third-party components - create client wrapper files
- Context providers as deep in tree as possible

## Security

- Use `import 'server-only'` in files with secrets - build error if client imports
- Only `NEXT_PUBLIC_*` env vars exposed to client

## Limitations
- Server Components: no state, no events, no browser APIs
- All children of `'use client'` file become Client Components
- Props to Client Components must be serializable
- Context unsupported in Server Components (use client wrapper)