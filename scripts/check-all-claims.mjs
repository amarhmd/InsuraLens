import { pathToFileURL } from 'node:url'

async function main() {
  const tokenRes = await fetch('https://insurance-ai-1.onrender.com/api/auth/demo', { method: 'POST' });
  const tokenData = await tokenRes.json();
  const token = tokenData.token;

  const res = await fetch('https://insurance-ai-1.onrender.com/api/claims', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  const claims = Array.isArray(data) ? data : (data.items || data.claims || data.data || []);
  
  for (const c of claims) {
    const detailRes = await fetch(`https://insurance-ai-1.onrender.com/api/claims/${c.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const detail = await detailRes.json();
    console.log(`\nClaim ${c.id}:`);
    console.log('proposedDecision root:', detail.proposedDecision, detail.proposed_decision);
    console.log('decision root:', detail.decision);
    console.log('analysis:', detail.analysis ? Object.keys(detail.analysis) : null);
    if (detail.analysis?.decision) {
      console.log('analysis.decision:', detail.analysis.decision);
    }
  }
}

main().catch(console.error);
