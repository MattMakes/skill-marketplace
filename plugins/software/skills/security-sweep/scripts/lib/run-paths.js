import path from 'node:path';

const RUNS_BASE = 'ai_docs/security-sweep/runs';

export function newRunId(now = new Date()) {
  const iso = now.toISOString().replace(/[:.]/g, '-').replace(/-\d{3}Z$/, 'Z');
  return iso;
}

export function runPaths(runId, repoRoot = process.cwd()) {
  const root = path.join(repoRoot, RUNS_BASE, runId);
  return {
    runId,
    repoRoot,
    root,
    stackProfile: path.join(root, '00-stack-profile.json'),
    dispatchPlan: path.join(root, '01-dispatch-plan.json'),
    auditorsDir: path.join(root, '02-auditors'),
    auditorFindings: (agent) => path.join(root, '02-auditors', agent, 'findings.jsonl'),
    auditorStatus: path.join(root, '02-auditors', 'status.json'),
    strideDir: path.join(root, '03-stride'),
    strideComponentsDir: path.join(root, '03-stride', 'components'),
    strideStatus: path.join(root, '03-stride', 'status.json'),
    verifierQueueDir: path.join(root, '04-verifier-queue'),
    verifierQueueItem: (id) => path.join(root, '04-verifier-queue', `${id}.json`),
    verifierResultsDir: path.join(root, '05-verifier-results'),
    verifierResultItem: (id) => path.join(root, '05-verifier-results', `${id}.json`),
    exploitsDir: path.join(root, '06-exploits'),
    exploitItem: (id) => path.join(root, '06-exploits', `${id}.md`),
    reportInput: path.join(root, '07-report-input.json'),
    report: path.join(root, '08-cso-report.md'),
    meta: path.join(root, 'meta.json'),
    agentLogsDir: path.join(root, 'agent-logs'),
  };
}
