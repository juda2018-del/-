import agent from '../data/agent-core.json' with { type: 'json' };
import portfolio from '../data/portfolio.json' with { type: 'json' };
import decisions from '../data/decision-engine.json' with { type: 'json' };
import tasks from '../data/tasks.json' with { type: 'json' };
import opportunities from '../data/opportunity-pipeline.json' with { type: 'json' };

export default function handler(req,res){
  if(req.method!=='GET') return res.status(405).json({error:'Method not allowed'});
  return res.status(200).json({
    ok:true,
    generatedAt:new Date().toISOString(),
    today:agent.today,
    portfolio:portfolio.projects,
    decisions:decisions.decisions,
    tasks:tasks.tasks,
    opportunities:opportunities.pipeline,
    policy:agent.autonomy
  });
}
