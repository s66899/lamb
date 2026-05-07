import json, os, sys
from datetime import datetime as dt
sys.stdout.reconfigure(encoding='utf-8')

DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "教务数据.json")
print('Target:', DATA)

STATS = [
    ('2026-03-02',0,0,0),('2026-03-03',2,1,0),('2026-03-04',0,2,0),
    ('2026-03-05',0,0,0),('2026-03-06',4,2,0),('2026-03-07',15,15,2),
    ('2026-03-08',11,12,0),('2026-03-09',2,3,0),('2026-03-10',1,3,0),
    ('2026-03-11',2,4,0),('2026-03-12',3,3,2),('2026-03-13',0,0,0),
    ('2026-03-14',30,20,0),('2026-03-15',17,15,0),('2026-03-16',3,3,0),
    ('2026-03-17',0,0,3),('2026-03-18',1,2,0),('2026-03-19',0,6,0),
    ('2026-03-20',1,5,0),('2026-03-21',26,25,2),('2026-03-22',20,25,0),
    ('2026-03-23',4,0,2),('2026-03-24',2,0,0),('2026-03-25',7,0,2),
    ('2026-03-26',0,0,0),('2026-03-27',1,4,0),('2026-03-28',24,18,3),
    ('2026-03-29',26,18,0),
]
WD = ['星期一','星期二','星期三','星期四','星期五','星期六','星期日']
SLOTS = ['09:00-10:30','10:30-12:00','14:00-15:30','15:30-17:00','17:00-18:30','18:30-20:00','19:00-20:30']

with open(DATA,'r',encoding='utf-8') as f:
    data = json.load(f)

stu = data.setdefault('attendances',[])
exist_ids = set(a['id'] for a in stu)
print('Existing attendance records:', len(stu))

all_stu = data.get('students',[])
wang = [s for s in all_stu if s.get('coach')=='王教练']
chen = [s for s in all_stu if s.get('coach')=='陈教练']
sun  = [s for s in all_stu if s.get('coach')=='孙教练']
print(f'Coaches: 王教练={len(wang)} 陈教练={len(chen)} 孙教练={len(sun)}')

cnt = 1
def nid():
    global cnt
    while f'm{cnt}' in exist_ids: cnt+=1
    exist_ids.add(f'm{cnt}')
    cnt+=1
    return f'm{cnt-1}'

def add(lst, n, coach, date, wd):
    for i in range(n):
        s = lst[i % len(lst)] if lst else {'id':'','name':'未知'}
        att = {
            'id': nid(), 'student_id': s.get('id',''), 'student_name': s.get('name','未知'),
            'date': date, 'week_day': wd, 'time_slot': SLOTS[i % len(SLOTS)],
            'coach': coach, 'status': 'present', 'reason': '', 'hours_used': 1
        }
        stu.append(att)

for d,w,c,s in STATS:
    wd_val = WD[dt.strptime(d,'%Y-%m-%d').weekday()]
    add(wang, w, '王教练', d, wd_val)
    add(chen, c, '陈教练', d, wd_val)
    add(sun,  s, '孙教练', d, wd_val)

with open(DATA,'w',encoding='utf-8') as f:
    json.dump(data,f,ensure_ascii=False,indent=2)
print(f'Done. Total sessions: {sum(w+c+s for _,w,c,s in STATS)}, records: {cnt-1}, total att: {len(stu)}')
