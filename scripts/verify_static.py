"""Validasi offline struktur flow dan semua syntax, tanpa Node-RED/Docker."""
import json
import re
import subprocess
import sys
from pathlib import Path

root=Path(__file__).resolve().parents[1]
nodes=json.loads((root/'node-red/flows.json').read_text())
ids={n['id'] for n in nodes}
assert len(ids)==len(nodes),'ID node duplikat'
for node in nodes:
    for branch in node.get('wires',[]):
        for dest in branch:
            assert dest in ids,f"{node['id']} tersambung ke ID tak dikenal: {dest}"
for node in nodes:
    for field in ['z','broker','mydb','server']:
        val=node.get(field)
        if val and field!='z' and node['type'] not in ('mqtt-broker','sqlitedb','websocket-listener'): assert val in ids,(node['id'],field,val)
js_functions=[n for n in nodes if n['type']=='function']
for node in js_functions:
    # NodeRED Function code ditempatkan dalam sebuah callback (return legal).
    code='new Function('+json.dumps(node['func'])+');'
    result=subprocess.run(['node','-e',code],capture_output=True,text=True)
    assert result.returncode==0,(node['id'],result.stderr)
for file in [root/'node-red/public/app.js',root/'node-red/settings.js']:
    subprocess.run(['node','--check',str(file)],check=True)
subprocess.run([sys.executable,'-m','py_compile',str(root/'simulator/simulasi_esp32.py'),str(root/'scripts/smoke_test.py')],check=True)
paths={(n.get('method'),n.get('url')) for n in nodes if n['type']=='http in'}
expected={('get','/api/suhu'),('get','/api/history'),('post','/api/kontrol'),('put','/api/threshold'),('get','/api/threshold'),('get','/api/status'),('get','/api/alerts'),('get','/api/health')}
assert expected==paths,(expected-paths,paths-expected)
assert any(n['type']=='websocket in' for n in nodes)
assert any(n['type']=='websocket out' for n in nodes)
assert any(n['type']=='sqlite' for n in nodes)
assert any(n['type']=='mqtt in' for n in nodes)
assert any(n['type']=='mqtt out' for n in nodes)
print(f'SUKSES: {len(nodes)} node valid; {len(js_functions)} function valid; {len(paths)} API routes; MQTT + SQLite + WebSocket hadir.')

# Khusus varian Windows native: tidak ada ketergantungan Docker.
assert next(n for n in nodes if n['type']=='mqtt-broker')['broker']=='127.0.0.1'
assert next(n for n in nodes if n['type']=='sqlitedb')['db']=='${IOT_SQLITE_PATH}'
assert "path.join(__dirname, 'public')" in (root/'node-red/settings.js').read_text()
print('SUKSES: flow menggunakan broker lokal, path SQLite dari environment, dashboard lokal.')
