const BLOCKED_HOSTS = new Set(['localhost','127.0.0.1','0.0.0.0','::1','metadata.google.internal','metadata.google.internal.']);
const ALLOWED_PROTOCOLS = new Set(['http:','https:']);
function looksPrivate(hostname){
  const h=hostname.toLowerCase();
  if(BLOCKED_HOSTS.has(h)||h.endsWith('.local')||h.endsWith('.internal')) return true;
  const m=h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if(!m) return false;
  const [a,b]=[+m[1],+m[2]];
  return a===10||a===127||a===0||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&b===168;
}
function clean(s, max=5000){return typeof s==='string'?s.replace(/\s+/g,' ').trim().slice(0,max):''}
function firstMeta(doc, selectors){for(const sel of selectors){const el=doc.match(sel);if(el?.[1])return clean(el[1],1000)}return ''}
function absolutize(base,url){try{return new URL(url,base).href}catch{return ''}}
function parseHtml(html,base){
  const title=firstMeta(html,[/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i,/<title[^>]*>([\s\S]*?)<\/title>/i]);
  const description=firstMeta(html,[/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)/i,/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i]);
  const image=firstMeta(html,[/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i]);
  const icon=firstMeta(html,[/<link[^>]+rel=["'][^"']*(?:icon|apple-touch-icon)[^"']*["'][^>]+href=["']([^"']+)/i]);
  return {title,description,coverImage:absolutize(base,image),icon:absolutize(base,icon)};
}
function detectType(url){
  const h=new URL(url).hostname.toLowerCase();
  if(h.includes('play.google.com')) return 'app';
  if(h.includes('apps.apple.com')||h.includes('itunes.apple.com')) return 'app';
  return 'website';
}
function inferPlatform(url){const h=new URL(url).hostname.toLowerCase();if(h.includes('play.google.com'))return 'Google Play';if(h.includes('apps.apple.com'))return 'App Store';return 'Web';}
function safeRedirect(url){const u=new URL(url);return u.protocol==='https:'?url:url;}
export async function onRequestPost({request}){
  const origin=request.headers.get('Origin')||'';
  const h=new URL(request.url).hostname;
  try{
    const body=await request.json();
    const raw=String(body?.url||'').trim();
    if(!raw) return Response.json({error:'URL is required.'},{status:400});
    const u=new URL(raw);
    if(!ALLOWED_PROTOCOLS.has(u.protocol)||looksPrivate(u.hostname)) return Response.json({error:'Only public HTTP(S) URLs are allowed.'},{status:400});
    const type=detectType(raw), platform=inferPlatform(raw);
    if(type==='app'){
      // App stores may return client-rendered pages; we still try their HTML metadata.
      const res=await fetch(safeRedirect(raw),{redirect:'follow',headers:{'User-Agent':'theking-edit-link-metadata/1.0'}});
      const text=await res.text();
      const meta=parseHtml(text,res.url||raw);
      let title=meta.title, description=meta.description, icon=meta.icon, developer='';
      const jsonLd=[...text.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
      for(const m of jsonLd){try{const j=JSON.parse(m[1]);const arr=Array.isArray(j)?j:[j];for(const x of arr){if(!title&&x.name)title=clean(x.name,200);if(!description&&x.description)description=clean(x.description,3000);if(!icon&&typeof x.image==='string')icon=absolutize(res.url,x.image);if(x.author?.name)developer=clean(x.author.name,200);}}catch{}}
      return Response.json({sourceUrl:raw,finalUrl:res.url,type,platform,title,description,icon,coverImage:meta.coverImage,developer}, {headers:{'Cache-Control':'no-store','Vary':'Origin'}});
    }
    const res=await fetch(raw,{redirect:'follow',headers:{'User-Agent':'theking-edit-link-metadata/1.0'}});
    const text=(await res.text()).slice(0,1200000);
    const meta=parseHtml(text,res.url||raw);
    return Response.json({sourceUrl:raw,finalUrl:res.url||raw,type,platform,title:meta.title,description:meta.description,icon:meta.icon,coverImage:meta.coverImage}, {headers:{'Cache-Control':'no-store','Vary':'Origin'}});
  }catch(e){return Response.json({error:'Could not extract metadata from this URL.',detail:String(e?.message||'Unknown error')},{status:422,headers:{'Vary':'Origin'}})}
}
