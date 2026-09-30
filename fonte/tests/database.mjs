// Testa o SQL real em PostgreSQL embarcado (PGlite), sem um projeto remoto.
// auth.uid() e auth.users são simulados apenas para testar as regras do aplicativo.
import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const db=new PGlite();
const member='11111111-1111-4111-8111-111111111111';
const outsider='22222222-2222-4222-8222-222222222222';
await db.exec(`create role anon; create role authenticated; create schema auth;
create table auth.users(id uuid primary key,email text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth to authenticated,anon;
grant execute on function auth.uid() to authenticated,anon;
insert into auth.users values ('${member}','equipe@example.test'),('${outsider}','fora@example.test');`);
await db.exec(await fs.readFile(new URL('../../supabase-privado/01_estrutura.sql',import.meta.url),'utf8'));
// Dados fictícios: os testes podem ser publicados sem expor o mapeamento real.
await db.query(`insert into public.rede_members values ($1,'Operador',true)`,[member]);
await db.query(`insert into public.rede_records values ('teste','Infor','SW01','B4',$1,0,0)`,[JSON.stringify({'SW - PORT':'SW01-01','PATCH PANEL':null,'TIPO':'MESA ','SALA':'T.I','STATUS':'FUNCIONANDO','UTILIZADO':'NÃO'})]);
const q=async(sql,args=[])=>db.query(sql,args);
async function asUser(id,role='authenticated'){await db.exec('reset role');await q(`select set_config('request.jwt.claim.sub',$1,false)`,[id]);await db.exec(`set role ${role}`)}
async function rejects(fn,pattern){await assert.rejects(fn,pattern)}
await asUser('', 'anon');
await rejects(()=>q('select * from public.rede_records'),/permission denied/i);
await rejects(()=>q('select public.rede_snapshot()'),/permission denied/i);
await rejects(()=>q(`select public.rede_update_record('teste',0,'{}','Motivo','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')`),/permission denied/i);
await asUser(outsider);
assert.equal((await q('select * from public.rede_records')).rows.length,0);
await rejects(()=>q('select public.rede_snapshot()'),/acesso/i);
await rejects(()=>q(`select public.rede_update_record('teste',0,'{}','Motivo','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')`),/acesso/i);
await asUser(member);
const snapshot=(await q('select public.rede_snapshot() as data')).rows[0].data;
assert.equal(snapshot.records.length,1);assert.equal(snapshot.history.length,0);
const before=snapshot.records[0].fields;
const after={...before,SALA:'TESTE ATUALIZADO'};
const save=(version,fields,reason,id)=>q('select public.rede_update_record($1,$2,$3,$4,$5) as data',['teste',version,JSON.stringify(fields),reason,id]);
await rejects(()=>q(`update public.rede_records set version=9`),/permission denied/i);
await rejects(()=>q(`insert into public.rede_members values ($1,'Intruso',true)`,[outsider]),/permission denied/i);
await rejects(()=>save(0,after,'   ','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),/motivo/i);
await rejects(()=>save(0,{...after,EXTRA:'x'},'Teste','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),/campos/i);
await rejects(()=>save(0,{...after,SALA:{x:1}},'Teste','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),/campos/i);
await rejects(()=>save(0,before,'Teste','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),/nenhuma/i);
const saved=await save(0,after,'Mudança de sala','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
assert.equal(saved.rows[0].data.version,1);
await save(0,after,'Mudança de sala','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
await rejects(()=>save(0,before,'Tentativa antiga','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),/outra pessoa/i);
const now=(await q('select public.rede_snapshot() as data')).rows[0].data;
assert.equal(now.history.length,1);assert.deepEqual(now.history[0].before,before);assert.deepEqual(now.history[0].after,after);
assert.equal(now.history[0].actor_id,member);assert.equal(now.history[0].actor,'Operador (equipe@example.test)');
assert.equal(now.records[0].version,1);
await rejects(()=>q('delete from public.rede_history'),/permission denied/i);
await db.exec('reset role');await q('update public.rede_members set active=false where user_id=$1',[member]);
await asUser(member);await rejects(()=>q('select public.rede_snapshot()'),/acesso/i);
await rejects(()=>save(1,before,'Revogado','cccccccc-cccc-4ccc-8ccc-cccccccccccc'),/acesso/i);
await db.close();
console.log('OK: anônimo bloqueado, conta não liberada bloqueada, RLS, gravação atômica, autoria, validação, idempotência, versão antiga e revogação.');
