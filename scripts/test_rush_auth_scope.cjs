// Exercise the actual client module with an account switch during verification.
// All auth/fetch operations are in-memory fixtures, never live credentials.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const garments=require('/tmp/static-threads-rush-tests/outfit-import.js');
const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002';
const session=id=>({user:{id},access_token:'token-'+id});let current=session(a),calls=[];
const fakeClient={auth:{getSession:async()=>({data:{session:current},error:null}),getUser:async token=>{assert.equal(token,'token-'+a);current=session(b);return {data:{user:{id:a}},error:null}}}};
const exported={};
const code=ts.transpileModule(fs.readFileSync(require('node:path').resolve(__dirname,'../lib/outfit-import-client.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const context={exports:exported,require:name=>name.includes('supabase-browser')?{getSupabaseBrowser:()=>fakeClient}:name.includes('outfit-import')?garments:(()=>{throw Error(name)})(),process:{env:{NEXT_PUBLIC_OUTFIT_IMPORT_ENABLED:'true',NEXT_PUBLIC_SUPABASE_URL:'https://auth-test.example',NEXT_PUBLIC_SUPABASE_ANON_KEY:'public-test-key'}},AbortSignal,fetch:async(url,options)=>{assert.equal(options.headers.Authorization,'Bearer token-'+a);calls.push({url,body:JSON.parse(options.body)});if(url.includes('/functions/'))return Response.json({candidates:[{name:'Blouse',category:'shirts',colour:'Blue',detail:'',confidence:.7,box:[.1,.1,.8,.8]}]});return Response.json([{id:'owned-item',user_id:a}])}};
vm.runInNewContext(code,context);
(async()=>{
 const photo={hash:'a'.repeat(64),data:'data:image/jpeg;base64,fixture',width:100,height:200};
 const item={id:'piece',name:'Blouse',category:'shirts',colour:'Blue',detail:'',confidence:0,box:[.1,.1,.8,.8],selected:true};
 await exported.saveImportedGarments(photo,[item],a);assert.equal(current.user.id,b);assert.equal(calls.length,1);assert.ok(!JSON.stringify(calls[0].body).includes('data:image'));
 await assert.rejects(()=>exported.saveImportedGarments(photo,[item],a),/Sign in again/);assert.equal(calls.length,1);
 current=session(a);await exported.detectGarments(photo,a,new AbortController().signal);assert.equal(current.user.id,b);assert.equal(calls.length,2);assert.equal(calls[1].body.image,photo.data);
 console.log('PASS: recognition and metadata writes retain the verified account token across a concurrent account switch; mismatched new sessions are rejected.');
})().catch(e=>{console.error(e);process.exitCode=1});
