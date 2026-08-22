import orchestrator from '../data/task-orchestrator.json' with { type: 'json' };

export default function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  const goal=req.body?.goal?.trim();
  if(!goal) return res.status(400).json({error:'goal is required'});
  const plan={id:`PLAN-${Date.now()}`,goal,createdAt:new Date().toISOString(),workflow:orchestrator.workflow,tasks:[
    {id:'T1',title:'تحليل الهدف والمتطلبات',priority:'P0',dependsOn:[],status:'ready',approval:false},
    {id:'T2',title:'تقسيم الهدف إلى مهام قابلة للقياس',priority:'P0',dependsOn:['T1'],status:'blocked',approval:false},
    {id:'T3',title:'تنفيذ أول مهمة مع تحقق',priority:'P1',dependsOn:['T2'],status:'blocked',approval:false},
    {id:'T4',title:'مراجعة النتيجة وتحديث الذاكرة',priority:'P1',dependsOn:['T3'],status:'blocked',approval:false}
  ],policy:orchestrator.policy};
  return res.status(200).json({ok:true,plan});
}
