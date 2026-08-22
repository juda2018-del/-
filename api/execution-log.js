import ledger from '../data/execution-log.json' with { type: 'json' };

export default function handler(req,res){
  if(req.method!=='GET') return res.status(405).json({error:'Method not allowed'});
  return res.status(200).json({ok:true,updated:ledger.updated,entries:ledger.entries,schema:ledger.schema,policy:ledger.policy});
}
