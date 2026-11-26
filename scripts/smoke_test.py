"""Uji HTTP + autentikasi WebSocket. Stdlib Python saja (tanpa dependency)."""
import argparse
import base64
import hashlib
import json
import os
import socket
import struct
import time
from urllib import error, request
from urllib.parse import urlparse


def fetch(base, path, key=None, method='GET', data=None):
    headers={}
    if key is not None:
        headers['X-API-Key']=key
    if data is not None:
        headers['Content-Type']='application/json'
    body=json.dumps(data).encode() if data is not None else None
    req=request.Request(base+path,data=body,method=method,headers=headers)
    try:
        with request.urlopen(req,timeout=8) as resp:
            return resp.status,json.load(resp)
    except error.HTTPError as exc:
        return exc.code,json.load(exc)


def ws_frame(sock, value):
    payload=json.dumps(value).encode()
    mask=os.urandom(4)
    size=len(payload)
    if size<126:
        head=bytes([0x81,0x80|size])
    elif size<65536:
        head=b'\x81\xfe'+struct.pack('!H',size)
    else:
        head=b'\x81\xff'+struct.pack('!Q',size)
    sock.sendall(head+mask+bytes(b^mask[i%4] for i,b in enumerate(payload)))


def exact(sock,count):
    data=b''
    while len(data)<count:
        chunk=sock.recv(count-len(data))
        if not chunk:raise ConnectionError('Koneksi ditutup sebelum pesan selesai')
        data+=chunk
    return data


def ws_read(sock):
    b1,b2=exact(sock,2)
    length=b2&127
    if length==126:length=struct.unpack('!H',exact(sock,2))[0]
    elif length==127:length=struct.unpack('!Q',exact(sock,8))[0]
    mask=exact(sock,4) if b2&128 else None
    payload=exact(sock,length)
    if mask:payload=bytes(b^mask[i%4] for i,b in enumerate(payload))
    if (b1&15)==8:raise ConnectionError('Server menutup WebSocket')
    return json.loads(payload.decode())


def test_ws(base,api_key):
    parsed=urlparse(base)
    host=parsed.hostname or 'localhost'
    port=parsed.port or 80
    key=base64.b64encode(os.urandom(16)).decode()
    with socket.create_connection((host,port),timeout=6) as sock:
        sock.settimeout(8)
        req=(f'GET /ws/sensor HTTP/1.1\r\nHost: {host}:{port}\r\nUpgrade: websocket\r\n'
             f'Connection: Upgrade\r\nSec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n')
        sock.sendall(req.encode())
        data=b''
        while b'\r\n\r\n' not in data:
            data+=sock.recv(4096)
        header=data.split(b'\r\n\r\n')[0].decode()
        assert ' 101 ' in header.split('\r\n')[0],header
        expected=base64.b64encode(hashlib.sha1((key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').encode()).digest()).decode()
        assert ('Sec-WebSocket-Accept: '+expected).lower() in header.lower()
        ws_frame(sock,{'type':'auth','api_key':api_key})
        msg=ws_read(sock)
        assert msg.get('type')=='authenticated',msg
    print('PASS WebSocket handshake + autentikasi pesan')


def main():
    p=argparse.ArgumentParser()
    p.add_argument('--base',default='http://127.0.0.1:1880')
    p.add_argument('--key',default=os.getenv('IOT_API_KEY'))
    args=p.parse_args()
    if not args.key:
        raise SystemExit('Gunakan --key <nilai IOT_API_KEY dari .env>')
    base=args.base.rstrip('/')
    status,data=fetch(base,'/api/health')
    assert status==200 and data['status']=='success',(status,data)
    print('PASS GET /api/health tanpa API key')
    status,data=fetch(base,'/api/suhu')
    assert status==401,(status,data)
    print('PASS API key salah/tidak ada -> 401')
    for path in ['/api/suhu','/api/history','/api/threshold','/api/status','/api/alerts']:
        status,data=fetch(base,path,args.key)
        assert status==200 and data['status']=='success',(path,status,data)
        print('PASS GET',path)
    status,data=fetch(base,'/api/threshold',args.key)
    previous=float(data['threshold'])
    try:
        test_value=previous+0.5 if previous<=79 else previous-0.5
        status,data=fetch(base,'/api/threshold',args.key,'PUT',{'threshold':test_value})
        assert status==200 and data['threshold']==test_value,(status,data)
        print('PASS PUT /api/threshold disimpan')
        status,data=fetch(base,'/api/threshold',args.key)
        assert status==200 and data['threshold']==test_value
        print('PASS GET threshold sesudah PUT')
        status,data=fetch(base,'/api/threshold',args.key,'PUT',{'threshold':-3})
        assert status==400,(status,data)
        print('PASS PUT batas tidak valid -> 400')
    finally:
        status,data=fetch(base,'/api/threshold',args.key,'PUT',{'threshold':previous})
        assert status==200,'Gagal memulihkan threshold asli'
        print('PASS threshold dikembalikan ke nilai semula')
    for action in ['on','off']:
        status,data=fetch(base,'/api/kontrol',args.key,'POST',{'device':'lamp','action':action})
        assert status==200 and data['sent']['action']==action,(status,data)
        print('PASS POST /api/kontrol',action)
    status,data=fetch(base,'/api/kontrol',args.key,'POST',{'device':'lamp','action':'invalid'})
    assert status==400,(status,data)
    print('PASS POST kontrol tidak valid -> 400')
    test_ws(base,args.key)
    for _ in range(8):
        status,history=fetch(base,'/api/history',args.key)
        if history['count']>0:break
        time.sleep(2)
    assert status==200 and history['count']>0,'Tidak ada data sensor: cek log simulator dan broker'
    print('PASS SQLite history berisi',history['count'],'data sensor')
    print('\nSEMUA SMOKE TEST LULUS. Dashboard tetap perlu dicek visual di browser.')


if __name__=='__main__':
    main()
