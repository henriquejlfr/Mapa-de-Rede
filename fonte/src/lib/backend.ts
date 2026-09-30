import {createClient} from '@supabase/supabase-js';
declare global {interface Window {REDE_CONFIG?:{supabaseUrl:string;supabaseKey:string}}}
const cfg=window.REDE_CONFIG;
let configError='';
if(!cfg||!cfg.supabaseUrl||!cfg.supabaseKey||/SEU-PROJETO|SUBSTITUA/.test(JSON.stringify(cfg)))configError='Preencha a URL e a chave publicável do Supabase no arquivo config.js.';
else if(!/^https:\/\/[a-z0-9.-]+\/?$/i.test(cfg.supabaseUrl))configError='A URL do Supabase deve começar com https:// e conter somente o endereço do projeto.';
else if(!cfg.supabaseKey.startsWith('sb_publishable_'))configError='Use a chave publicável sb_publishable_ no config.js. Nunca use uma chave secreta.';
export const configurationError=configError;
export const supabase=configError?null:createClient(cfg!.supabaseUrl,cfg!.supabaseKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
export async function loadNetwork(){
 const {data,error}=await supabase!.rpc('rede_snapshot');
 if(error)throw new Error(error.message);
 return {records:data.records,history:data.history.map((h:any)=>({...h,before:JSON.stringify(h.before),after:JSON.stringify(h.after)}))};
}
export async function updateRecord(input:{id:string;version:number;fields:Record<string,unknown>;reason:string;requestId:string}){
 const {data,error}=await supabase!.rpc('rede_update_record',{p_id:input.id,p_expected_version:input.version,p_fields:input.fields,p_reason:input.reason,p_request_id:input.requestId});
 if(error)throw new Error(error.message);return data;
}
