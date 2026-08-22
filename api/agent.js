export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  const prompt=(req.body&&req.body.prompt||'').trim();
  if(!prompt) return res.status(400).json({error:'Prompt required'});
  const key=process.env.AI_API_KEY;
  if(!key) return res.status(200).json({answer:'JODA استلم الطلب. وضع التشغيل المحلي فعّال حالياً. أضف AI_API_KEY في Vercel لتفعيل التحليل الذكي الخارجي.\n\nالطلب: '+prompt+'\n\nالخطة الأولية: تحليل المشكلة → السوق → المنافسين → نموذج الإيرادات → MVP → خطة الإطلاق → مؤشرات النجاح → المخاطر → قرار التنفيذ.'});
  try{
    const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},body:JSON.stringify({model:process.env.AI_MODEL||'gpt-5',input:[{role:'system',content:'You are JODA OS, the owner\'s master business and product agent. Be practical, concise, commercially focused. Propose actions but never claim to have executed external side effects unless tools actually exist.'},{role:'user',content:prompt}],max_output_tokens:1200})});
    if(!r.ok) return res.status(502).json({error:'AI provider error'});
    const d=await r.json(); const answer=d.output_text||d.output?.map(x=>x.content?.map(c=>c.text||'').join('')).join('')||'No answer';
    return res.status(200).json({answer});
  }catch(e){return res.status(500).json({error:'Agent unavailable'});}
}
