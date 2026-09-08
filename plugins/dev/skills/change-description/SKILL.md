---
name: change-description
description: Generate the description for a change (a merge request on GitLab, a pull request on GitHub) from the story ticket and git changes using a standard template
---

# Change Description Generator

**Output directory:** `./ai_docs/requirements/`

## Arguments

- `STORY_TICKET` — Story ticket ID

## Task

Look at the git diff from the default branch to see what changes were made. Create the change description (the merge request on GitLab, the pull request on GitHub; detect `glab` or `gh` if you need to post it).

## Output Template

Write this to: `./ai_docs/requirements/[STORY_TICKET]_mrdescription.md`

```markdown
# [STORY_TICKET]: Title Goes Here

#### Summary of Changes
---

This section serves as technical documentation of changes otherwise not covered by the ticket. Include callouts around any work that might affect other parts of the team.

#### Technical A/C
---

- Each ticket should have a technical A/C section. Feel free to make a checklist here to ensure the change meets all requirements.

#### Reviewer Guidance & QA Testing
---

Use this section to include testing steps or findings that are worth calling out for the team or QA. Call out any new unit tests created and explain setup if necessary. Call this out here to save reviewers time if any further setup is required. Screenshots and videos are encouraged.

#### Related Issues
---

Include links and explanations here if there are related tickets, issues, or merge requests to be aware of.

#### Checklist
---

- [x] values.yaml version updated
- [ ] Changes validated in non-prod by necessary stakeholders (self, PM, etc.)
- [ ] Documentation Updated (README, CHANGELOG, etc.)
- [ ] New code covered by unit tests or absence justified ([justification])
- [ ] Code is linted if applicable
- [ ] Optional: This change is :pear: with _insert name_
```
