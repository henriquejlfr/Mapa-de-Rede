"""Converte o backup JSON do site em SQL para um banco Supabase vazio.
Uso: python gerar_importacao.py backup.json 02_dados.sql
Não requer bibliotecas adicionais. Não envia dados pela rede.
"""
import json,sys,pathlib,datetime

def sql(value):
    if value is None: return 'NULL'
    return "'"+str(value).replace("'","''")+"'"

def obj(value):
    return json.loads(value) if isinstance(value,str) else value

def convert(source,target):
    data=json.loads(pathlib.Path(source).read_text(encoding='utf-8-sig'))
    records=data.get('registros',data.get('records'))
    history=data.get('historico',data.get('history'))
    if not isinstance(records,list) or not records or not isinstance(history,list):
        raise ValueError('Backup inválido: precisa conter registros e histórico.')
    ids=set()
    lines=['-- Importação privada. NÃO publique este arquivo no GitHub.',
           '-- Gerado em '+datetime.datetime.now(datetime.timezone.utc).isoformat(),
           'begin;',
           'lock table public.rede_records, public.rede_history in exclusive mode;',
           "do $$ begin if exists(select 1 from public.rede_records) or exists(select 1 from public.rede_history) then raise exception 'O destino já contém dados. Importação cancelada para evitar sobrescrita.'; end if; end $$;"]
    for pos,r in enumerate(records):
        if r['id'] in ids: raise ValueError('ID de registro duplicado: '+r['id'])
        ids.add(r['id'])
        fields=obj(r.get('fields',r.get('payload')))
        if not isinstance(fields,dict): raise ValueError('Campos inválidos')
        version=r.get('version',0)
        if not isinstance(version,int) or version<0: raise ValueError('Versão inválida')
        values=[r['id'],r['kind'],r.get('group_name',r.get('group')),r['source'],json.dumps(fields,ensure_ascii=False),version,pos]
        lines.append('insert into public.rede_records(id,kind,group_name,source,fields,version,position) values ('+','.join(map(sql,values))+');')
    seen=set()
    for h in history:
        if h['id'] in seen or h['record_id'] not in ids: raise ValueError('Histórico inconsistente')
        seen.add(h['id'])
        before,after=obj(h['before']),obj(h['after'])
        if not isinstance(before,dict) or not isinstance(after,dict): raise ValueError('Histórico inválido')
        values=[h['id'],h['record_id'],h['actor'],h['reason'],json.dumps(before,ensure_ascii=False),json.dumps(after,ensure_ascii=False),h['created_at'],'migrado']
        lines.append('insert into public.rede_history(id,record_id,actor,reason,"before","after",created_at,origin) values ('+','.join(map(sql,values))+');')
    lines+=['commit;',f'-- Conferência: {len(records)} registros e {len(history)} alterações.']
    pathlib.Path(target).write_text('\n'.join(lines)+'\n',encoding='utf-8')
    print(f'Gerado: {len(records)} registros e {len(history)} alterações.')

if __name__=='__main__':
    if len(sys.argv)!=3: raise SystemExit('Uso: python gerar_importacao.py backup.json 02_dados.sql')
    convert(sys.argv[1],sys.argv[2])
