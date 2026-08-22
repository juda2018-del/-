export default function handler(req,res){res.status(200).json({ok:true,service:'JODA OS',version:'0.2.0',timestamp:new Date().toISOString()});}
