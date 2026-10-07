function esc(v=''){return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;')}
function decode(v=''){try{return decodeURIComponent(v)}catch{return v}}
async function findOne(env,table,slug){
  if(!env.SUPABASE_URL||!env.SUPABASE_ANON_KEY)return null;
  const u=new URL(`${env.SUPABASE_URL}/rest/v1/${table}`);
  u.searchParams.set('select','*');u.searchParams.set('slug',`eq.${slug}`);u.searchParams.set('published','eq.true');u.searchParams.set('deleted_at','is.null');u.searchParams.set('limit','1');
  const r=await fetch(u,{headers:{apikey:env.SUPABASE_ANON_KEY,Authorization:`Bearer ${env.SUPABASE_ANON_KEY}`}});if(!r.ok)return null;const rows=await r.json();return rows[0]||null;
}
export async function serveSeo(context,table,type){
  const slug=decode(context.params.slug||'');const item=await findOne(context.env,table,slug);const assetRes=await context.env.ASSETS.fetch(new Request(new URL('/',context.request.url)));if(!item)return new Response(assetRes.body,{status:404,headers:assetRes.headers});
  const title=item.title_en||item.title||item.title_ar||item.title_fr||'theking._.edit';const desc=item.description_en||item.description||item.description_ar||item.description_fr||'';const image=item.cover_image||item.preview_image||item.icon||'';const html=await assetRes.text();const schema={"@context":"https://schema.org", "@type":type==='prompt'?'CreativeWork':'SoftwareApplication', name:title, description:desc, url:new URL(context.request.url).href};if(image)schema.image=image;if(type!=='prompt'&&item.official_url)schema.url=item.official_url;
  const tags=`<title>${esc(title)} · theking._.edit</title><meta name="description" content="${esc(desc)}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">${image?`<meta property="og:image" content="${esc(image)}">`:''}<script id="server-jsonld" type="application/ld+json">${JSON.stringify(schema).replace(/</g,'\\u003c')}</script>`;
  const out=html.replace(/<title>[^<]*<\/title>/i,tags);return new Response(out,{headers:{'Content-Type':'text/html;charset=UTF-8','Cache-Control':'public,max-age=300'}})
}
