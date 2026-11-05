const GH='https://api.github.com';
const OWNER='armywev09-alt',REPO='amlanperoduahajoon';
const BASE='https://amlan-admin-auth.armywev09.workers.dev';
const WEB='https://amlanperoduahajoon.com';
const encoder=new TextEncoder();
const enc=s=>btoa(String.fromCharCode(...encoder.encode(s))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const dec=s=>new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4)),c=>c.charCodeAt(0)));
const cookie=(name,value,maxAge)=>`${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' https://amlanperoduahajoon.com data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'"};
const response=(body,status=200,extra={})=>new Response(body,{status,headers:{...headers,...extra}});
const json=(obj,status=200)=>response(JSON.stringify(obj),status,{'Content-Type':'application/json'});
const redirect=(url,setCookie)=>response(null,302,{Location:url,...(setCookie?{'Set-Cookie':setCookie}:{})});
function getCookie(req,name){return (req.headers.get('Cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='))?.slice(name.length+1)||''}
async function hmac(env){return crypto.subtle.importKey('raw',encoder.encode(env.SESSION_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign','verify'])}
async function sign(env,payload){let data=enc(JSON.stringify(payload));let sig=new Uint8Array(await crypto.subtle.sign('HMAC',await hmac(env),encoder.encode(data)));return data+'.'+btoa(String.fromCharCode(...sig)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
async function verify(env,s){try{let [p,mac,...extra]=s.split('.');if(extra.length||!p||!mac)return null;let sig=Uint8Array.from(atob(mac.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-mac.length%4)%4)),c=>c.charCodeAt(0));if(!await crypto.subtle.verify('HMAC',await hmac(env),sig,encoder.encode(p)))return null;let obj=JSON.parse(dec(p));return obj.exp>Date.now()&&obj.login===OWNER?obj:null}catch{return null}}
async function github(path,env,init={}){return fetch(GH+path,{...init,headers:{'Authorization':'Bearer '+env.GITHUB_WRITE_TOKEN,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'AmlanAdminWorker',...(init.headers||{})}})}
export default {async fetch(req,env){try{
 const url=new URL(req.url),path=url.pathname;
 if(!env.GITHUB_CLIENT_ID||!env.GITHUB_CLIENT_SECRET||!env.SESSION_SECRET||!env.GITHUB_WRITE_TOKEN)return json({error:'Worker secrets belum lengkap'},503);
 if(path==='/auth/login'){
  let state=crypto.randomUUID();let gh=new URL('https://github.com/login/oauth/authorize');gh.searchParams.set('client_id',env.GITHUB_CLIENT_ID);gh.searchParams.set('redirect_uri',BASE+'/auth/callback');gh.searchParams.set('scope','read:user');gh.searchParams.set('state',state);
  return redirect(gh.toString(),cookie('oauth_state',state,600));
 }
 if(path==='/auth/callback'){
  let state=getCookie(req,'oauth_state');if(!state||state!==url.searchParams.get('state')||!url.searchParams.get('code'))return response('Login gagal: state tidak sah',403);
  let tok=await fetch('https://github.com/login/oauth/access_token',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify({client_id:env.GITHUB_CLIENT_ID,client_secret:env.GITHUB_CLIENT_SECRET,code:url.searchParams.get('code'),redirect_uri:BASE+'/auth/callback'})});let t=await tok.json();if(!t.access_token)return response('Login GitHub gagal',403);
  let who=await fetch(GH+'/user',{headers:{Authorization:'Bearer '+t.access_token,Accept:'application/vnd.github+json','User-Agent':'AmlanAdminWorker'}});let user=await who.json();if(user.login!==OWNER)return response('Akaun ini tidak dibenarkan',403);
  let session=await sign(env,{login:OWNER,exp:Date.now()+8*60*60*1000});return redirect(BASE+'/admin',cookie('amlan_session',session,8*60*60));
 }
 if(path==='/auth/logout')return redirect(BASE+'/admin',cookie('amlan_session','',0));
 let session=await verify(env,getCookie(req,'amlan_session'));
 if(path==='/'||path==='/admin'){if(!session)return response('<!doctype html><html lang="ms"><meta name="viewport" content="width=device-width"><title>Admin AMLAN</title><body style="font:16px system-ui;max-width:500px;margin:12vh auto;padding:20px"><h2>AMLAN PERODUA HAJOON</h2><p>Admin Panel</p><a href="/auth/login" style="display:inline-block;background:#b91c1c;color:white;padding:14px 22px;border-radius:8px;text-decoration:none">Login dengan GitHub</a></body></html>',200,{'Content-Type':'text/html;charset=utf-8'});
 let page=await fetch(WEB+'/admin-app.html',{headers:{'Cache-Control':'no-cache'}});if(!page.ok)return response('Fail admin-app.html belum dimuat naik ke GitHub Pages',503);return response(await page.text(),200,{'Content-Type':'text/html;charset=utf-8'});
 }
 if(path==='/api/me')return session?json({login:OWNER}):json({error:'Unauthorized'},401);
 if(path.startsWith('/api/')){
  if(!session)return json({error:'Sesi tamat. Login semula.'},401);
  if(req.method!=='GET'&&req.headers.get('Origin')!==BASE)return json({error:'Origin tidak dibenarkan'},403);
  if(path==='/api/content'&&req.method==='GET'){
   let r=await github(`/repos/${OWNER}/${REPO}/contents/admin-content.json`,env);return json(await r.json(),r.status);
  }
  if(path==='/api/content'&&req.method==='PUT'){
   let body=await req.text();if(body.length>300000)return json({error:'Data terlalu besar'},413);let obj=JSON.parse(body);if(typeof obj.sha!=='string'||typeof obj.content!=='string'||obj.content.length>250000)return json({error:'Data tidak sah'},400);
   let r=await github(`/repos/${OWNER}/${REPO}/contents/admin-content.json`,env,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'Admin: update website content',content:obj.content,sha:obj.sha,branch:'main'})});return json(await r.json(),r.status);
  }
  if(path==='/api/upload'&&req.method==='POST'){
   let obj=await req.json();if(typeof obj.content!=='string'||obj.content.length>11_000_000||!/^images\/admin\/[a-zA-Z0-9._-]+\.(jpg|jpeg|png|webp|gif)$/.test(obj.path||''))return json({error:'Fail tidak sah'},400);
   let r=await github(`/repos/${OWNER}/${REPO}/contents/${obj.path}`,env,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'Admin: upload image',content:obj.content,branch:'main'})});return json(await r.json(),r.status);
  }
  return json({error:'Not found'},404);
 }
 return response('Not found',404);
 }catch(e){return json({error:'Ralat pelayan: '+e.message},500)}}};
