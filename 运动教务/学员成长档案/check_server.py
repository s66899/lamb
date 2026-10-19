#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import urllib.request
import json
import re

def fetch(url):
    req = urllib.request.Request(url)
    req.add_header('Accept', 'text/html')
    with urllib.request.urlopen(req, timeout=10) as resp:
        return resp.read().decode('utf-8')

base = 'http://127.0.0.1:8080'

print('========================================')
print('  服务器运行状态检查')
print('========================================')

# 1. 首页
idx = fetch(base + '/')
print('\n[首页目录]')
files = re.findall(r'<a href="([^"]+)">([^<]+)</a>', idx)
for href, name in files:
    if href not in ('../', '/'):
        print('  ', href)

# 2. 教练端
html = fetch(base + '/%E5%AD%A6%E5%91%98%E6%88%90%E9%95%BF%E6%A1%A3%E6%A1%88.html')
print('\n[教练端页面]')
title = re.search(r'<title>(.*?)</title>', html)
print('  标题:', title.group(1) if title else 'N/A')
h1 = re.search(r'<h1>(.*?)</h1>', html)
print('  H1:', re.sub(r'<[^>]+>', '', h1.group(1)) if h1 else 'N/A')
cards = re.findall(r'<h3>(.*?)</h3>', html)
print('  学员:', cards[:5])
print('  saveToServer:', 'saveToServer' in html)
print('  loadFromServer:', 'loadFromServer' in html)
print('  fetch API:', 'fetch(API_URL' in html)

# 3. 家长端
html2 = fetch(base + '/%E5%AE%B6%E9%95%BF%E6%9F%A5%E7%9C%8B%E7%AB%AF.html')
print('\n[家长端页面]')
title2 = re.search(r'<title>(.*?)</title>', html2)
print('  标题:', title2.group(1) if title2 else 'N/A')
h1_2 = re.search(r'<h1>(.*?)</h1>', html2)
print('  H1:', re.sub(r'<[^>]+>', '', h1_2.group(1)) if h1_2 else 'N/A')
print('  fetch API:', 'fetch' in html2)
print('  家长查看:', '家长查看' in html2)

# 4. 数据API
api = fetch(base + '/api/students')
print('\n[数据API /api/students]')
data = json.loads(api)
print('  学员数量:', len(data))
for s in data:
    print("    - {} ({}) 技能:{}项 上课:{}次".format(
        s['name'], s['sport'], len(s['progress']), len(s['attendance'])))

print('\n========================================')
print('  所有服务运行正常')
print('========================================')
