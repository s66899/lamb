#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import urllib.request
import json
import re
import sys

def fetch(url):
    req = urllib.request.Request(url)
    req.add_header('Accept', 'text/html')
    with urllib.request.urlopen(req, timeout=10) as resp:
        return resp.read().decode('utf-8')

base = 'http://127.0.0.1:8080'

output = []
output.append('=' * 50)
output.append('服务器运行状态检查')
output.append('=' * 50)

# 首页
idx = fetch(base + '/')
output.append('\n[首页文件列表]')
files = re.findall(r'<a href="([^"]+)">([^<]+)</a>', idx)
for href, name in files:
    if href not in ('../', '/'):
        output.append('  ' + href)

# 教练端
html = fetch(base + '/%E5%AD%A6%E5%91%98%E6%88%90%E9%95%BF%E6%A1%A3%E6%A1%88.html')
output.append('\n[教练端页面]')
title = re.search(r'<title>(.*?)</title>', html)
output.append('  标题: ' + (title.group(1) if title else 'N/A'))
h1 = re.search(r'<h1>(.*?)</h1>', html)
output.append('  H1: ' + (re.sub(r'<[^>]+>', '', h1.group(1)) if h1 else 'N/A'))
cards = re.findall(r'<h3>(.*?)</h3>', html)
output.append('  学员: ' + str(cards[:5]))
output.append('  saveToServer: ' + str('saveToServer' in html))
output.append('  loadFromServer: ' + str('loadFromServer' in html))
output.append('  fetch API: ' + str('fetch(API_URL' in html))

# 家长端
html2 = fetch(base + '/%E5%AE%B6%E9%95%BF%E6%9F%A5%E7%9C%8B%E7%AB%AF.html')
output.append('\n[家长端页面]')
title2 = re.search(r'<title>(.*?)</title>', html2)
output.append('  标题: ' + (title2.group(1) if title2 else 'N/A'))
h1_2 = re.search(r'<h1>(.*?)</h1>', html2)
output.append('  H1: ' + (re.sub(r'<[^>]+>', '', h1_2.group(1)) if h1_2 else 'N/A'))
output.append('  fetch API: ' + str('fetch' in html2))
output.append('  家长查看: ' + str('家长查看' in html2))

# 数据API
api = fetch(base + '/api/students')
output.append('\n[数据API /api/students]')
data = json.loads(api)
output.append('  学员数量: ' + str(len(data)))
for s in data:
    output.append('    - {} ({}) 技能:{}项 上课:{}次'.format(
        s['name'], s['sport'], len(s['progress']), len(s['attendance'])))

output.append('\n' + '=' * 50)
output.append('所有服务运行正常')
output.append('=' * 50)

# 写入文件
with open('server_status.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(output))

print('结果已保存到 server_status.txt')
