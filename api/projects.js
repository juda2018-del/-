import portfolio from '../data/portfolio.json' with { type: 'json' };
export default function handler(req,res){
 if(req.method!=='GET') return res.status(405).json({error:'Method not allowed'});
 const projects=portfolio.projects.map(p=>({...p,attention:p.priority==='high'||p.progress<60}));
 res.status(200).json({scan:portfolio.scan,count:projects.length,projects});
}
