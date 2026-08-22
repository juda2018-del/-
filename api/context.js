import portfolio from '../data/portfolio.json' with { type: 'json' };
import opportunities from '../data/opportunities.json' with { type: 'json' };
import memory from '../data/memory.json' with { type: 'json' };

export default async function handler(req,res){
  if(req.method!=='GET') return res.status(405).json({error:'Method not allowed'});
  res.status(200).json({portfolio,opportunities,memory,generatedAt:new Date().toISOString()});
}
