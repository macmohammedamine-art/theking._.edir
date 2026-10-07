function escapeXml(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;')}
export async function onRequestGet({request,env}){
  const base=new URL(request.url).origin;
  const urls=[`${base}/`];
  if(env.SUPABASE_URL&&env.SUPABASE_ANON_KEY){
    try{
      const q=new URL(`${env.SUPABASE_URL}/rest/v1/content`);q.searchParams.set('select','slug,type,updated_at');q.searchParams.set('published','eq.true');q.searchParams.set('deleted_at','is.null');q.searchParams.set('limit','1000');
      const res=await fetch(q,{headers:{apikey:env.SUPABASE_ANON_KEY,Authorization:`Bearer ${env.SUPABASE_ANON_KEY}`}});
      if(res.ok){const rows=await res.json();for(const r of rows){const prefix=r.type==='app'?'apps':r.type==='website'?'websites':r.type==='tool'?'tools':r.type==='ai_tool'?'ai':'prompts';urls.push(`${base}/${prefix}/${encodeURIComponent(r.slug)}`)}}
    }catch{}
  }
  const body=`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u=>`<url><loc>${escapeXml(u)}</loc></url>`).join('')}</urlset>`;
  return new Response(body,{headers:{'Content-Type':'application/xml;charset=UTF-8','Cache-Control':'public,max-age=3600'}})
}
