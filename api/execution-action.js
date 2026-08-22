import ledger from '../data/execution-log.json' with { type: 'json' };

const SENSITIVE=/publish|production|delete|remove|spend|pay|contract|message|email|password|secret|token|deploy/i;

export default function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  const {command='',intent='strategy',decision='',approval=false}=req.body||{};
  if(!command.trim()) return res.status(400).json({error:'command is required'});
  const sensitive=SENSITIVE.test(command);
  const status=sensitive&&!approval?'blocked':'proposed';
  const entry={id:`EX-${Date.now()}`,createdAt:new Date().toISOString(),command,intent,decision,status,result:null,evidence:null,effort:null,lesson:null};
  return res.status(200).json({ok:true,entry,requiresApproval:sensitive&&!approval,policy:ledger.policy,next:sensitive&&!approval?'Explicit owner approval is required before this action can proceed.':'Action prepared; execution remains a separate approved step.'});
}
