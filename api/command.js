import agent from '../data/agent-core.json' with { type: 'json' };
import decisions from '../data/decision-engine.json' with { type: 'json' };
import tasks from '../data/tasks.json' with { type: 'json' };
import opportunities from '../data/opportunity-pipeline.json' with { type: 'json' };
import memory from '../data/memory.json' with { type: 'json' };

function classify(text='') {
  const t=text.toLowerCase();
  if (/فرص|فكرة|شركة|مشروع جديد|opportun|idea|company/.test(t)) return 'opportunity';
  if (/أولوية|ركز|هذا الأسبوع|priority|focus/.test(t)) return 'prioritize';
  if (/مهمة|نفذ|سوي|سوّي|task|execute|build/.test(t)) return 'execution';
  if (/بيع|استثمار|خروج|sell|invest|exit/.test(t)) return 'capital';
  if (/حالة|وين|وضع|status|health/.test(t)) return 'status';
  return 'strategy';
}

function relevantMemory(intent) {
  const weights={strategy:3,opportunity:2,prioritize:2,execution:2,capital:2,status:1};
  return memory.entries
    .map(e=>({...e, relevance:(e.importance==='critical'?3:e.importance==='high'?2:1)+(intent==='strategy'?1:0)}))
    .sort((a,b)=>b.relevance-a.relevance)
    .slice(0,Math.max(2,weights[intent]||2));
}

export default function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  const text=req.body?.message || '';
  if(!text.trim()) return res.status(400).json({error:'message is required'});
  const intent=classify(text);
  const contextMemory=relevantMemory(intent);
  const response={
    ok:true,intent,message:text,
    memoryUsed:contextMemory.map(m=>({id:m.id,type:m.type,text:m.text})),
    answer: intent==='status' ? agent.today.primaryDecision :
      intent==='opportunity' ? 'سأحوّل الفكرة إلى فرصة قابلة للتحقق ثم اختبار صغير قبل البناء.' :
      intent==='prioritize' ? decisions.decisions.slice(0,3) :
      intent==='execution' ? tasks.tasks.filter(t=>t.status==='todo').slice(0,5) :
      intent==='capital' ? 'سأقارن الاحتفاظ والنمو والبيع بناءً على العائد، الزخم، الجاهزية والمخاطر.' :
      'سأحوّل طلبك إلى قرار، خطة، مهام ومؤشرات نجاح، مع موافقة قبل أي إجراء حساس.',
    nextStep:'راجع المقترح ثم وافق على أي إجراء خارجي أو إنتاجي حساس.',
    learning:{status:'ready',rule:memory.learningLoop}
  };
  return res.status(200).json(response);
}
