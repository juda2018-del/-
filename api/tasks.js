import tasks from '../data/tasks.json' with { type: 'json' };
export default async function handler(req,res){
  if(req.method==='GET') return res.status(200).json(tasks);
  return res.status(405).json({error:'Method not allowed'});
}
