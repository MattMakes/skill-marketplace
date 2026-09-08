---
name: review-git-changes
description: Review feature changes with comprehensive grading across six aspects using git analysis
---

# Review Feature Changes

**Output directory:** `./ai_docs/reviews/`

Act as a senior software engineer reviewing a new feature in an existing "brownfield" project.

## Determine the Default Branch

Before starting analysis, determine the project's default branch:
1. Run: `git remote show origin 2>/dev/null | grep 'HEAD branch' | awk '{print $NF}'`
2. If that fails, check for `main` or `master`: `git branch -a | grep -E 'main|master' | head -1 | xargs`
3. Use the result as `DEFAULT_BRANCH` in all git commands below
4. Fall back to `main` if nothing is found

Your first goal is to write up a comprehensive digest on what changed using git. Write this to `./ai_docs/reviews/final-feature-review.md`

Your next goal is to provide a comprehensive grade.

First, perform the following analysis using git and code context:
1. **Analyze the Change Tree**: Use `git log --oneline --graph $DEFAULT_BRANCH..HEAD` to review the commit history. Judge the clarity and quality of the commit messages. A clean, logical history is crucial.
2. **Review the Diff**: Use `git diff $DEFAULT_BRANCH..HEAD` to analyze the code changes.
3. **Check for Inconsistencies**: Compare the new code's style, patterns, and architecture against the surrounding, pre-existing code. Note any deviations.
4. **Find Duplication**: Look for duplicated logic or functionality that could have been refactored into a shared utility or service (DRY principle).

After your analysis, grade the implementation on the following six aspects. For each, provide a letter grade (A-F) and a one-sentence justification that incorporates your findings from the git analysis.

- **Correctness**: Does it meet requirements and handle edge cases?
- **Code Quality**: Is the code clean, maintainable, consistent, and non-repetitive?
- **User Experience (UX)**: Is the feature intuitive and does it provide good feedback?
- **Performance**: Is the code efficient in terms of speed and resource usage?
- **Robustness**: Is it well-tested and resilient to errors?
- **Documentation**: Are comments, commit messages, and docs clear and sufficient?

Finally, provide a "Final Digest" with an overall grade and a brief summary of its strengths and primary areas for improvement. Write this doc to `./ai_docs/reviews/final-feature-grade.md`
