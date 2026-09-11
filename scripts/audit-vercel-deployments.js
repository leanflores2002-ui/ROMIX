// Read-only inventory. Requires VERCEL_TOKEN in the environment; never deletes.
const fs=require('node:fs');
const projectId='prj_M0w3DNjknZtHROdmTwLWdWof1sG8';
const teamId='team_tTxFOPyDq9CInhLC0goE8fFm';
async function get(endpoint,params={}){
 const url=new URL(endpoint,'https://api.vercel.com');
 for(const [k,v] of Object.entries({teamId,...params}))url.searchParams.set(k,String(v));
 const response=await fetch(url,{headers:{Authorization:`Bearer ${process.env.VERCEL_TOKEN}`},signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw Error(`Vercel read failed: HTTP ${response.status}`);
 return response.json();
}
async function main(){
 if(!process.env.VERCEL_TOKEN)throw Error('VERCEL_TOKEN is not configured; existing plan was not changed.');
 const project=await get(`/v9/projects/${projectId}`);
 if(project.id!==projectId)throw Error('Unexpected project; aborting');
 const rows=[],cursors=new Set();let until;
 do{
  const page=await get('/v6/deployments',{projectId,limit:100,...(until?{until}:{})});
  if(!Array.isArray(page.deployments))throw Error('Invalid deployment inventory');
  rows.push(...page.deployments);
  until=page.pagination?.next;
  if(until&&cursors.has(until))throw Error('Repeated cursor; inventory incomplete');
  cursors.add(until);
 }while(until);
 const current=project.targets?.production?.id||project.targets?.production?.uid;
 const unique=[...new Map(rows.map(d=>[d.uid||d.id,d])).values()].sort((a,b)=>(b.createdAt||b.created)-(a.createdAt||a.created));
 const recent=new Set(unique.filter(d=>d.target==='production'&&(d.state||d.readyState)==='READY').slice(0,4).map(d=>d.uid||d.id));
 const deployments=unique.map(d=>{
  const deploymentId=d.uid||d.id, time=d.createdAt||d.created;
  const old=Number.isFinite(time)&&Date.now()-time>30*86400000;
  const state=d.state||d.readyState;
  let classification=state==='CANCELED'?'CANCELED':d.target==='production'?'OLD_PRODUCTION':old?'OLD_PREVIEW':'PREVIEW';
  let action='REVIEW',reason='Branch relevance, aliases and retention exceptions require review.';
  if(deploymentId===current){classification='CURRENT_PRODUCTION';action='KEEP';reason='Current production target';}
  else if(recent.has(deploymentId)){classification='RECENT_ROLLBACK';action='KEEP';reason='Recent successful production; verify usefulness';}
  else if(current&&state==='CANCELED'&&old){action='DELETE_CANDIDATE';reason='Canceled over 30 days ago; manual approval still required';}
  return {deploymentId,url:d.url,branch:d.meta?.githubCommitRef||null,commit:d.meta?.githubCommitSha||null,createdAt:time?new Date(time).toISOString():null,target:d.target||null,state,classification,action,reason};
 });
 const report={projectId,teamId,dryRun:true,generatedAt:new Date().toISOString(),status:current?'REVIEW_REQUIRED':'CURRENT_PRODUCTION_NOT_IDENTIFIED',currentProduction:current||null,
 configuration:{rootDirectory:project.rootDirectory??null,outputDirectory:project.outputDirectory??null,buildCommand:project.buildCommand??null,framework:project.framework??null,commandForIgnoringBuildStep:project.commandForIgnoringBuildStep??null},
 deployments,candidateCount:deployments.filter(d=>d.action==='DELETE_CANDIDATE').length,executeDeletion:false};
 fs.writeFileSync('vercel-deployment-cleanup-plan.json',JSON.stringify(report,null,2)+'\n');
 console.log(`Read ${deployments.length} deployments; dry run only.`);
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
