"""Append 12 SMR (self-myofascial release) entries to ex-lib.json.
Used by v3.22.17 to fulfill the v3.22.16 commit promise.
"""
import json, sys
from pathlib import Path

LIB = Path("books/exercises/ex-lib.json")

NEW = [
    {
        "id": "5202",
        "n": "foam roller quadriceps (股四头肌松解)",
        "e": "foam roller quadriceps",
        "bp": "legs", "bp_zh": "腿部",
        "eq": "foam roller", "eq_zh": "泡沫轴",
        "mu": "quadriceps", "mu_zh": "股四头肌",
        "tgt": "quadriceps", "tgt_zh": "股四头肌",
        "sec": ["腿部", "股四头肌"],
        "gif": "videos/5202-SMRquad.gif",
        "level": "beginner",
        "goal": "recovery",
        "kind": "smr",
        "steps": [
            "俯卧位，将泡沫轴置于大腿前侧下方。",
            "双手支撑地面，身体前后滚动，范围从�前到膝上。",
            "遇到痛点时停留 20-30 秒呼吸放松。",
            "左右两侧各做 60 秒。"
        ]
    },
    {
        "id": "5203",
        "n": "foam roller hamstrings (腘绳肌松解)",
        "e": "foam roller hamstrings",
        "bp": "legs", "bp_zh": "腿部",
        "eq": "foam roller", "eq_zh": "泡沫轴",
        "mu": "hamstrings", "mu_zh": "腘绳肌",
        "tgt": "hamstrings", "tgt_zh": "腘绳肌",
        "sec": ["腿部", "腘绳肌"],
        "gif": "videos/5203-SMRham.gif",
        "level": "beginner",
        "goal": "recovery",
        "kind": "smr",
        "steps": [
            "坐位，泡沫轴置于大腿后侧下方，双手撑地略抬臀。",
            "从坐骨结节滚到膝窝上侧，痛点停留 20-30 秒。",
            "可以单腿加重（另一腿搭在松解腿上）。",
            "左右各 60 秒。"
        ]
    },
    {
        "id": "5204",
        "n": "foam roller it band (髂胫束松解)",
        "e": "foam roller it band",
        "bp": "legs", "bp_zh": "腿部",
        "eq": "foam roller", "eq_zh": "泡沫轴",
        "mu": "tensor fasciae latae", "mu_zh": "阔筋膜张肌",
        "tgt": "it band", "tgt_zh": "髂胫束",
        "sec": ["腿部", "髂胫束"],
        "gif": "videos/5204-SMRitband.gif",
        "level": "intermediate",
        "goal": "recovery",
        "kind": "smr",
        "steps": [
            "侧卧位，下侧大腿外侧压在泡沫轴上，上腿屈膝撑地。",
            "从髋外侧滚到膝外侧上方。",
            "痛点停留 20-30 秒，配合深呼吸。",
            "左右各 45 秒（髂胫束较敏感，时间略短）。"
        ]
    },
    {
        "id": "5205",
        "n": "foam roller calves (小腿后侧松解)",
        "e": "foam roller calves",
        "bp": "legs", "bp_zh": "腿部",
        "eq": "foam roller", "eq_zh": "泡沫轴",
        "mu": "gastrocnemius", "mu_zh": "腓肠肌",
        "tgt": "calves", "tgt_zh": "小腿",
        "sec": ["腿部", "小腿", "踝"],
        "gif": "videos/5205-SMRcalf.gif",
        "level": "beginner",
        "goal": "recovery",
        "kind": "smr",
        "steps": [
            "坐位，泡沫轴置于小腿后侧下方，双手撑地抬臀。",
            "从膝窝下方滚到跟腱上方（避开跟腱本身）。",
            "可双膝微屈加重，痛点停留 20-30 秒。",
            "左右各 60 秒。"
        ]
    },
    {
        "id": "5206",
        "n": "foam roller glutes (臀肌松解)",
        "e": "foam roller glutes",
        "bp": "legs", "bp_zh": "腿部",
        "eq": "foam roller", "eq_zh": "泡沫轴",
        "mu": "gluteus", "mu_zh": "臀肌",
        "tgt": "glutes", "tgt_zh": "臀肌",
        "sec": ["腿部", "臀肌"],
        "gif": "videos/5206-SMRglute.gif",
        "level": "beginner",
        "goal": "recovery",
        "kind": "smr",
        "steps": [
            "坐位，将泡沫轴置于臀部下方，单腿屈膝脚着地。",
            "身体向痛侧倾斜，缓慢前后滚动。",
            "也可做梨状肌松解：患侧脚踝搭在对侧膝上，呈\"4\"字。",
            "左右各 60 秒。"
        ]
    },
    {
        "id": "5207",
        "n": "foam roller upper back (上背松解)",
        "e": "foam roller upper back",
        "bp": "back", "bp_zh": "背部",
        "eq": "foam roller", "eq_zh": "泡沫轴",
        "mu": "erector spinae", "mu_zh": "竖脊肌",
        "tgt": "thoracic spine", "tgt_zh": "胸椎段",
        "sec": ["背部", "胸椎"],
        "gif": "videos/5207-SMRupperback.gif",
        "level": "beginner",
        "goal": "recovery",
        "kind": "smr",
        "steps": [
            "仰卧位，泡沫轴横置于上背（肩胛骨下角下方）。",
            "双手抱头，臀抬离地面，靠肩胛骨带动前后滚。",
            "重点松解胸椎 4-7 节段（羽毛球扣杀发力段）。",
            "共 90 秒，过程中避免下背过度代偿。"
        ]
    },
    {
        "id": "5208",
        "n": "foam roller latissimus (背阔肌松解)",
        "e": "foam roller latissimus",
        "bp": "back", "bp_zh": "背部",
        "eq": "foam roller", "eq_zh": "泡沫轴",
        "mu": "latissimus dorsi", "mu_zh": "背阔肌",
        "tgt": "lats", "tgt_zh": "背阔肌",
        "sec": ["背部", "背阔肌", "肩"],
        "gif": "videos/5208-SMRlat.gif",
        "level": "intermediate",
        "goal": "recovery",
        "kind": "smr",
        "steps": [
            "侧卧位，泡沫轴置于腋下背阔肌下方，下侧腿伸直、上侧腿屈膝撑地。",
            "手臂上举过头，沿背阔肌纤维方向缓慢滚动。",
            "痛点停留 20-30 秒，呼吸放松。",
            "左右各 60 秒（羽毛球肩部康复关键动作）。"
        ]
    },
    {
        "id": "5209",
        "n": "foam roller rotator cuff (肩袖松解)",
        "e": "foam roller rotator cuff",
        "bp": "shoulders", "bp_zh": "肩部",
        "eq": "foam roller", "eq_zh": "泡沫轴",
        "mu": "rotator cuff", "mu_zh": "肩袖肌群",
        "tgt": "rotator cuff", "tgt_zh": "肩袖",
        "sec": ["肩部", "肩袖"],
        "gif": "videos/5209-SMRrc.gif",
        "level": "intermediate",
        "goal": "recovery",
        "kind": "smr",
        "steps": [
            "侧卧位，泡沫轴置于肩外侧（三角肌后束与肩胛骨之间）。",
            "前臂撑地控制压力，沿肩胛骨外缘缓慢滚动。",
            "痛点停留 15-20 秒（肩袖较薄，压力不要过大）。",
            "左右各 45 秒。"
        ]
    },
    {
        "id": "5210",
        "n": "lacrosse ball forearm (前臂伸肌松解)",
        "e": "lacrosse ball forearm extensors",
        "bp": "arms", "bp_zh": "臂部",
        "eq": "lacrosse ball", "eq_zh": "筋膜球",
        "mu": "wrist extensors", "mu_zh": "腕伸肌群",
        "tgt": "forearm extensors", "tgt_zh": "前臂伸肌",
        "sec": ["臂部", "前臂", "肘"],
        "gif": "videos/5210-LBforearm.gif",
        "level": "beginner",
        "goal": "recovery",
        "kind": "smr",
        "steps": [
            "俯撑位，将筋膜球置于前臂伸肌（肘外侧到腕背之间）。",
            "另一手轻压控制力度，缓慢滚动找痛点。",
            "痛点停留 20-30 秒，是网球肘康复的关键动作。",
            "左右各 60 秒。"
        ]
    },
    {
        "id": "5211",
        "n": "lacrosse ball plantar fascia (足底筋膜松解)",
        "e": "lacrosse ball plantar fascia",
        "bp": "feet", "bp_zh": "足部",
        "eq": "lacrosse ball", "eq_zh": "筋膜球",
        "mu": "plantar fascia", "mu_zh": "足底筋膜",
        "tgt": "plantar fascia", "tgt_zh": "足底筋膜",
        "sec": ["足部", "踝"],
        "gif": "videos/5211-LBplantar.gif",
        "level": "beginner",
        "goal": "recovery",
        "kind": "smr",
        "steps": [
            "坐位，将筋膜球置于足弓下方。",
            "脚掌施压，从脚跟滚到前脚掌（避开骨头突起处）。",
            "痛点停留 15-20 秒，是跟腱康复的辅助动作。",
            "左右各 60 秒。"
        ]
    },
    {
        "id": "5212",
        "n": "foam roller thoracic spine (胸椎灵活性松解)",
        "e": "foam roller thoracic mobility",
        "bp": "back", "bp_zh": "背部",
        "eq": "foam roller", "eq_zh": "泡沫轴",
        "mu": "thoracic erector spinae", "mu_zh": "胸段竖脊肌",
        "tgt": "thoracic spine", "tgt_zh": "胸椎",
        "sec": ["背部", "胸椎"],
        "gif": "videos/5212-SMRtmob.gif",
        "level": "intermediate",
        "goal": "recovery",
        "kind": "smr",
        "steps": [
            "仰卧位，泡沫轴横置于胸椎中段（约肩胛骨中部水平）。",
            "双手抱头，臀抬离地面，身体轻微前后滚 + 轻微左右摆。",
            "每节胸椎停留 1 次深呼吸，共松解 5-6 个节段。",
            "共 90 秒。"
        ]
    },
    {
        "id": "5213",
        "n": "foam roller adductors (大腿内侧松解)",
        "e": "foam roller adductors",
        "bp": "legs", "bp_zh": "腿部",
        "eq": "foam roller", "eq_zh": "泡沫轴",
        "mu": "adductors", "mu_zh": "内收肌群",
        "tgt": "adductors", "tgt_zh": "大腿内侧",
        "sec": ["腿部", "内收肌"],
        "gif": "videos/5213-SMRadd.gif",
        "level": "intermediate",
        "goal": "recovery",
        "kind": "smr",
        "steps": [
            "俯卧位，单腿外展，泡沫轴置于大腿内侧。",
            "前臂撑地，沿内收肌方向缓慢滚动。",
            "痛点停留 20-30 秒（大腿内侧敏感，力度不要过大）。",
            "左右各 45 秒。"
        ]
    },
]

def main():
    data = json.loads(LIB.read_text(encoding="utf-8"))
    existing_ids = {it["id"] for it in data}
    added = []
    for entry in NEW:
        if entry["id"] in existing_ids:
            print(f"SKIP {entry['id']} (exists)")
            continue
        data.append(entry)
        added.append(entry["id"])
    LIB.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"Added {len(added)} entries: {added}")
    print(f"Total now: {len(data)}")

if __name__ == "__main__":
    main()
