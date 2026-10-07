export async function onRequestGet({request}){
  const base=new URL(request.url).origin;
  return new Response(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nSitemap: ${base}/sitemap.xml\n`,{headers:{'Content-Type':'text/plain;charset=UTF-8','Cache-Control':'public,max-age=86400'}})
}
