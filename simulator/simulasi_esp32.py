"""Simulator ESP32 (DHT22 + LED) melalui MQTT; contoh praktikum 9."""
import argparse
import json
import math
import os
import random
import time
from datetime import datetime, timezone

import paho.mqtt.client as mqtt

BROKER = os.getenv('MQTT_HOST', 'localhost')
PORT = int(os.getenv('MQTT_PORT', '1883'))
TOPIC_SENSOR = 'iot/sensor'
TOPIC_KONTROL = 'iot/kontrol'
TOPIC_STATUS = 'iot/status'


def to_json(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'))


def main():
    parser = argparse.ArgumentParser(description='Simulator ESP32 DHT22 dan LED')
    parser.add_argument('--once', action='store_true', help='Kirim satu data sensor lalu keluar')
    parser.add_argument('--suhu', type=float, default=None, help='Paksa suhu untuk uji threshold')
    parser.add_argument('--kelembaban', type=float, default=None)
    args = parser.parse_args()

    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=f'ESP32-Simulator-{os.getpid()}')
    lamp = {'state': 'off'}

    def on_connect(c, userdata, flags, reason_code, properties):
        if reason_code == 0:
            print(f'[MQTT] Terhubung {BROKER}:{PORT}', flush=True)
            c.subscribe(TOPIC_KONTROL)
            c.publish(TOPIC_STATUS, to_json({'device': 'lamp', 'state': lamp['state']}), qos=1, retain=True)
        else:
            print(f'[MQTT] Gagal terhubung: {reason_code}', flush=True)

    def on_message(c, userdata, message):
        try:
            data = json.loads(message.payload.decode('utf-8'))
            if data.get('device') != 'lamp' or data.get('action') not in ('on', 'off'):
                return
            lamp['state'] = data['action']
            c.publish(TOPIC_STATUS, to_json({'device': 'lamp', 'state': lamp['state']}), qos=1, retain=True)
            print('[AKTUATOR] Lampu:', lamp['state'].upper(), flush=True)
        except (UnicodeDecodeError, ValueError, TypeError) as exc:
            print('[MQTT] Data kontrol diabaikan:', exc, flush=True)

    client.on_connect = on_connect
    client.on_message = on_message

    for attempt in range(60):
        try:
            client.connect(BROKER, PORT, 60)
            break
        except OSError as exc:
            if attempt == 59:
                raise
            print(f'[MQTT] Menunggu broker: {exc}', flush=True)
            time.sleep(2)
    client.loop_start()
    try:
        # Memudahkan Node-RED menyelesaikan proses inisialisasi tabel SQLite.
        time.sleep(5)
        i = 0
        while True:
            # Pola suhu melintas threshold 30 C, agar demo notifikasi otomatis.
            suhu = args.suhu if args.suhu is not None else round(29.3 + 3.4 * math.sin(i / 6) + random.uniform(-0.3, 0.3), 1)
            humid = args.kelembaban if args.kelembaban is not None else round(63 + 9 * math.cos(i / 9) + random.uniform(-1, 1), 1)
            sensor = {'suhu': suhu, 'kelembaban': humid, 'timestamp': datetime.now(timezone.utc).isoformat()}
            info = client.publish(TOPIC_SENSOR, to_json(sensor), qos=1)
            info.wait_for_publish(timeout=5)
            print('[SENSOR]', to_json(sensor), flush=True)
            if args.once:
                break
            i += 1
            time.sleep(3)
    except KeyboardInterrupt:
        print('Simulator dihentikan.')
    finally:
        client.loop_stop()
        client.disconnect()


if __name__ == '__main__':
    main()
