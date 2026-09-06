const U=process.env.SUPABASE_URL||'https://myzrtshbaazhzrnjaleo.supabase.co';
const K=process.env.SUPABASE_SERVICE_ROLE_KEY;
const P=process.env.KITCHEN_PIN;
const A=process.env.SUPABASE_ANON_KEY||K;
function j(res,s,b){res.statusCode=s;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(b))}
function auth(req){return P&&req.headers['x-kitchen-pin']===P}
async function sb(path,o={},key=K){const r=await fetch(`${U}/rest/v1/${path}`,{...o,headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',Prefer:'return=representation',...(o.headers||{})}}),t=await r.text();if(!r.ok)throw new Error(t);return t?JSON.parse(t):null}
module.exports=async(req,res)=>{
 if(req.method==='POST'){
  try{
   if(!A)return j(res,503,{error:'Public ordering backend not configured'});
   const b=req.body||{};
   if(!b.customer_name||!b.pickup_date||!b.ingredients||typeof b.ingredients!=='object')return j(res,400,{error:'Missing required fields'});
   const allowed=['Tortilla','Eggs','Hash Browns','Sausage','Chorizo','Bacon','Onions & Green Peppers','Fresh Jalapeños','Sour Cream','Cheese','Salsa','Cholula'],ings={};
   for(const [k,v] of Object.entries(b.ingredients)){
    if(!allowed.includes(k))continue;
    if(k==='Tortilla'){if(['Yes','No'].includes(v))ings[k]=v}
    else if(['Light','Normal','Extra','Side'].includes(v))ings[k]=v;
   }
   if(!Object.keys(ings).length)return j(res,400,{error:'Choose at least one ingredient'});
   const data=await sb('rpc/benitos_create_order',{method:'POST',body:JSON.stringify({p_customer_name:String(b.customer_name).trim().slice(0,60),p_pickup_date:b.pickup_date,p_ingredients:ings})},A);
   return j(res,200,data);
  }catch(e){return j(res,500,{error:e.message})}
 }
 if(!K||!P)return j(res,503,{error:'Admin backend not configured'});
 if(req.method==='GET'){
  if(!auth(req))return j(res,401,{error:'Unauthorized'});
  if(req.query?.check)return j(res,200,{ok:true});
  try{return j(res,200,await sb('orders?select=*&order=created_at.desc'))}catch(e){return j(res,500,{error:e.message})}
 }
 if(req.method==='PATCH'){
  if(!auth(req))return j(res,401,{error:'Unauthorized'});
  try{const{id,status,deleted}=req.body||{};if(!id)return j(res,400,{error:'Missing id'});if(deleted){await sb(`orders?id=eq.${encodeURIComponent(id)}`,{method:'DELETE'});return j(res,200,{ok:true})}if(!['active','complete'].includes(status))return j(res,400,{error:'Invalid status'});const data=await sb(`orders?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify({status,completed_at:status==='complete'?new Date().toISOString():null})});return j(res,200,data?.[0]||{ok:true})}catch(e){return j(res,500,{error:e.message})}
 }
 return j(res,405,{error:'Method not allowed'});
};