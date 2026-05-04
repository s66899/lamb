#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
学员成长档案服务器
功能：静态文件服务 + REST API + 局域网自动发现
"""

import json
import os
import sys
import socket
from http.server import HTTPServer, SimpleHTTPRequestHandler

DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data.json')

DEFAULT_DATA = [
    {
        "id": 1,
        "name": "张小明",
        "age": 8,
        "height": 135,
        "weight": 30,
        "avatar": "",
        "joinDate": "2026-01-15",
        "sport": "羽毛球",
        "progress": [
            {"subject": "握拍与准备姿势", "percent": 95, "standard": "握拍放松，拍面垂直，准备姿势重心在前脚掌"},
            {"subject": "正手高远球", "percent": 72, "standard": "击球点在右肩前上方，发力流畅，落点到底线附近"},
            {"subject": "反手过渡球", "percent": 45, "standard": "转体充分，肘部上抬，能稳定回到中场"},
            {"subject": "步伐移动", "percent": 60, "standard": "并步、交叉步熟练，回中速度快"},
            {"subject": "网前搓球", "percent": 30, "standard": "拍面控制精准，球贴网而过，旋转充分"}
        ],
        "attendance": [
            {"date": "2026-04-24", "course": "基础技术课", "status": "present", "performance": 5, "note": "步法进步明显"},
            {"date": "2026-04-22", "course": "多球训练课", "status": "present", "performance": 4, "note": "正手高远球稳定性提升"},
            {"date": "2026-04-20", "course": "体能训练课", "status": "present", "performance": 3, "note": "体能后半段有所下降"},
            {"date": "2026-04-17", "course": "基础技术课", "status": "late", "performance": 4, "note": "迟到10分钟，但课堂状态不错"}
        ],
        "training": [
            {"date": "2026-04-24", "items": ["热身跑","握拍练习","多球高远球","步伐训练","拉伸"], "duration": 90, "intensity": "中等", "performance": "良好", "note": "高远球成功率约70%"},
            {"date": "2026-04-22", "items": ["跳绳","网前搓球练习","对抗练习","耐力跑"], "duration": 120, "intensity": "高", "performance": "优秀", "note": "对抗中敢打敢拼"}
        ],
        "records": [
            {"date": "2026-04-22", "type": "success", "content": "第一次完整完成全场步伐训练，速度明显提升"},
            {"date": "2026-04-15", "type": "normal", "content": "本周重点练习了反手过渡，整体表现良好"},
            {"date": "2026-04-08", "type": "warning", "content": "体能训练后半段注意力不集中，需要加强耐力"}
        ],
        "corrections": [
            {"date": "2026-04-20", "severity": "moderate", "content": "击球时手臂发力过多，腰部转体不够", "suggestion": "加强核心力量训练，练习转体挥拍"},
            {"date": "2026-04-14", "severity": "minor", "content": "反手拍面角度控制不稳定", "suggestion": "增加反手挑球专项练习"}
        ],
        "assessments": [
            {"date": "2026-04-15", "name": "月度技术考核", "score": 78, "rank": "3/12", "items": [{"name":"正手高远球","score":82},{"name":"反手过渡","score":65},{"name":"步伐","score":78},{"name":"网前","score":55}], "summary": "正手技术较扎实，反手和网前需要加强"}
        ],
        "injuries": [],
        "photos": [
            {"url": "https://picsum.photos/400/300?random=1", "date": "2026-04-20", "desc": "课堂练习"},
            {"url": "https://picsum.photos/400/300?random=2", "date": "2026-04-15", "desc": "训练留念"}
        ],
        "videos": [
            {"url": "", "date": "2026-04-18", "desc": "正手高远球练习"}
        ],
        "plan": [
            {"title": "反手过渡球专项", "desc": "每天20分钟反手多球练习", "status": "active", "done": False},
            {"title": "核心力量提升", "desc": "平板支撑30秒×3组，仰卧起坐20个", "status": "active", "done": True},
            {"title": "网前搓球训练", "desc": "争取两周内网前技术达到50%", "status": "pending", "done": False}
        ]
    },
    {
        "id": 2,
        "name": "李婷婷",
        "age": 10,
        "height": 142,
        "weight": 35,
        "avatar": "",
        "joinDate": "2025-11-20",
        "sport": "羽毛球",
        "progress": [
            {"subject": "正手吊球", "percent": 88, "standard": "击球动作隐蔽，落点在前场发球线内"},
            {"subject": "杀球技术", "percent": 70, "standard": "起跳充分，击球点高，球速快角度刁"},
            {"subject": "双打轮转", "percent": 55, "standard": "与搭档配合默契，轮转时机准确"},
            {"subject": "防守反击", "percent": 65, "standard": "接杀球稳定，能组织有效反击"}
        ],
        "attendance": [
            {"date": "2026-04-25", "course": "技术提升课", "status": "present", "performance": 5, "note": "全场表现最佳"},
            {"date": "2026-04-23", "course": "对抗训练课", "status": "present", "performance": 4, "note": "双打配合有进步"}
        ],
        "training": [
            {"date": "2026-04-25", "items": ["热身","杀球练习","防守练习","双打配合"], "duration": 120, "intensity": "高", "performance": "优秀", "note": "杀球速度有明显提升"}
        ],
        "records": [
            {"date": "2026-04-23", "type": "success", "content": "队内对抗赛中获得第二名，杀球得分率最高"},
            {"date": "2026-04-16", "type": "warning", "content": "双打轮转时与搭档沟通不足，出现抢球现象"}
        ],
        "corrections": [
            {"date": "2026-04-20", "severity": "moderate", "content": "杀球时身体后仰过多，影响下一拍连贯", "suggestion": "练习杀球后快速回中，加强连贯意识"}
        ],
        "assessments": [
            {"date": "2026-04-10", "name": "季度综合考核", "score": 82, "rank": "2/15", "items": [{"name":"进攻技术","score":88},{"name":"防守技术","score":78},{"name":"战术意识","score":72},{"name":"体能","score":85}], "summary": "进攻能力突出，战术意识有待提高"}
        ],
        "injuries": [
            {"date": "2026-03-15", "type": "肌肉拉伤", "part": "右肩", "status": "recovered", "note": "训练过度导致，休息两周后恢复，已降低训练强度"}
        ],
        "photos": [
            {"url": "https://picsum.photos/400/300?random=3", "date": "2026-04-22", "desc": "对抗赛"}
        ],
        "videos": [],
        "plan": [
            {"title": "双打战术配合", "desc": "每周至少一次双打专项训练", "status": "active", "done": False},
            {"title": "防守反击训练", "desc": "加强接杀挡网练习，提升反击质量", "status": "active", "done": True},
            {"title": "参加市级比赛", "desc": "备战6月市青少年羽毛球赛", "status": "pending", "done": False}
        ]
    }
]


def get_local_ips():
    ips = []
    try:
        hostname = socket.gethostname()
        addr = socket.getaddrinfo(hostname, None)
        for item in addr:
            ip = item[4][0]
            if ip not in ips and not ip.startswith('127.') and ':' not in ip:
                ips.append(ip)
    except Exception:
        pass
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.5)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        if ip not in ips and not ip.startswith('127.'):
            ips.insert(0, ip)
        s.close()
    except Exception:
        pass
    return ips


def find_free_port(start=8080):
    for port in range(start, start + 100):
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.bind(('0.0.0.0', port))
            s.close()
            return port
        except OSError:
            continue
    return start


class APIHandler(SimpleHTTPRequestHandler):
    def send_header(self, keyword, value):
        if keyword.lower() == 'content-type':
            if ('text/html' in value or 'text/css' in value or
                'application/javascript' in value or 'application/json' in value):
                if 'charset' not in value.lower():
                    value += '; charset=utf-8'
        super().send_header(keyword, value)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        if self.path == '/api/students':
            self._serve_students()
            return
        # 教练端入口
        if self.path == '/':
            self.path = '/%E5%AD%A6%E5%91%98%E6%88%90%E9%95%BF%E6%A1%A3%E6%A1%88.html'
            super().do_GET()
            return
        # 家长端独立入口
        if self.path == '/parent':
            self.path = '/%E5%AE%B6%E9%95%BF%E6%9F%A5%E7%9C%8B%E7%AB%AF.html'
            super().do_GET()
            return
        super().do_GET()

    def do_POST(self):
        if self.path == '/api/students':
            self._save_students()
            return
        self.send_response(404)
        self.end_headers()

    def _serve_students(self):
        if not os.path.exists(DATA_FILE):
            with open(DATA_FILE, 'w', encoding='utf-8') as f:
                json.dump(DEFAULT_DATA, f, ensure_ascii=False, indent=2)
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.end_headers()
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            self.wfile.write(f.read().encode('utf-8'))

    def _save_students(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))
            with open(DATA_FILE, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"success":true}')
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode('utf-8'))

    def log_message(self, format, *args):
        print(f"[{self.log_date_time_string()}] {args[0]}")


def main():
    port = 8080
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass

    original_port = port
    try:
        test = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        test.bind(('0.0.0.0', port))
        test.close()
    except OSError:
        port = find_free_port(original_port)
        if port != original_port:
            print(f"端口 {original_port} 已被占用，自动切换到端口 {port}")

    local_ips = get_local_ips()
    server = HTTPServer(('0.0.0.0', port), APIHandler)

    print("=" * 50)
    print("🏸 学员成长档案服务器已启动")
    print("-" * 50)
    print(f"📁 本机访问: http://localhost:{port}/")
    if local_ips:
        for ip in local_ips:
            print(f"🌐 局域网访问: http://{ip}:{port}/")
    else:
        print(f"🌐 局域网访问: http://<本机IP>:{port}/")
    print(f"📡 API接口:  http://localhost:{port}/api/students")
    print("-" * 50)
    print("📱 教练端: 学员成长档案.html")
    print("👨‍👩‍👧 家长端: 家长查看端.html")
    print("=" * 50)
    print("按 Ctrl+C 停止服务器\n")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n服务器已停止")
        server.shutdown()


if __name__ == '__main__':
    main()
