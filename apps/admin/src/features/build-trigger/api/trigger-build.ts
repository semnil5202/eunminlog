export async function dispatchClientBuild(): Promise<void> {
  const vercelEnv = process.env.VERCEL_ENV;

  if (!vercelEnv) return;

  const pat = process.env.GITHUB_PAT;
  const owner = process.env.GITHUB_REPO_OWNER;
  const repo = process.env.GITHUB_REPO_NAME;
  const workflowId = process.env.GITHUB_WORKFLOW_ID;

  if (!pat || !owner || !repo || !workflowId) {
    console.error(
      '[build-trigger] 환경변수 누락: GITHUB_PAT, GITHUB_REPO_OWNER, GITHUB_REPO_NAME, GITHUB_WORKFLOW_ID 확인 필요',
    );
    return;
  }

  const ref = vercelEnv === 'production' ? 'main' : 'develop';

  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${pat}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ref }),
      },
    );

    if (response.status !== 204) {
      const body = await response.text();
      console.error(`[build-trigger] workflow_dispatch 실패 (${response.status}): ${body}`);
    }
  } catch (error) {
    console.error('[build-trigger] 네트워크 오류:', error);
  }
}
