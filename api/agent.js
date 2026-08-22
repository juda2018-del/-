export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  const prompt=(req.body&&req.body.prompt||'').trim();
  if(!prompt) return res.status(400).json({error:'Prompt required'});
  const key=process.env.AI_API_KEY;
  const context={portfolio:['FUSE Iraq','Suqly AI','Fancy Hub','Jardak AI','JAZAL'],opportunities:['B2B AI Sales Agent','Smart Restaurant Platform','AI Inventory Iraq/Gulf','Invoice & Debt SaaS'],policy:'Sensitive actions require owner approval.'};
  if(!key) return res.status(200).json({mode:'local',answer:`JODA استلم الطلب.\n\nالطلب: ${prompt}\n\nالمحفظة: ${context.portfolio.join('، ')}.\n\nالخطوات المقترحة: تحليل الهدف → اختيار المشروع/الفرصة → تقدير العائد والجهد والمخاطر → MVP → خطة التنفيذ → مؤشرات النجاح → قرار.\n\nالعمليات الحساسة تحتاج موافقة المالك. فعّل AI_API_KEY في Vercel للتشغيل الذكي الكامل.`});
  try{
    const system=`You are JODA OS, a private master business/product operating agent. Manage a portfolio, discover profitable opportunities, design companies, prioritize execution and produce concrete next actions. Be commercially focused. Never claim an external action was executed unless a real tool performed it. Sensitive actions such as publishing, spending, deleting, messaging or production changes require owner approval. Context: ${JSON.stringify(context)}`;
    const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},body:JSON.stringify({model:process.env.AI_MODEL||'gpt-5',input:[{role:'system',content:system},{role:'user',content:prompt}],max_output_tokens:1800})});
    if(!r.ok) return res.status(502).json({error:'AI provider error'});
    const d=await r.json(); const answer=d.output_text||d.output?.map(x=>x.content?.map(c=>c.text||'').join('')).join('')||'No answer';
    return res.status(200).json({mode:'ai',answer});
  }catch(e){return res.status(500).json({error:'Agent unavailable'});}
}
