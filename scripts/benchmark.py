"""Evaluate user-supplied reference/hypothesis JSONL without downloading data."""
import argparse
import json
import unicodedata
from collections import defaultdict
def distance(a,b):
    row=list(range(len(b)+1))
    for i,x in enumerate(a,1):
        nxt=[i]
        for j,y in enumerate(b,1):
            nxt.append(min(nxt[-1]+1,row[j]+1,row[j-1]+(x!=y)))
        row=nxt
    return row[-1]
def normalize(text):
    return " ".join(unicodedata.normalize("NFC",text).split())
def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("input",help="JSONL: language, reference, hypothesis; held-out speakers only")
    args=parser.parse_args()
    totals=defaultdict(lambda:[0,0,0,0,0])
    with open(args.input,encoding="utf-8") as f:
        for line in f:
            item=json.loads(line); lang=item["language"]
            if lang not in ("ti","am"): raise ValueError("Unsupported language")
            ref,hyp=normalize(item["reference"]),normalize(item["hypothesis"])
            if not ref: raise ValueError("Reference must not be empty")
            stats=totals[lang]
            stats[0]+=distance(ref.split(),hyp.split());stats[1]+=len(ref.split())
            stats[2]+=distance(ref,hyp);stats[3]+=len(ref);stats[4]+=1
    print(json.dumps({k:{"utterances":v[4],"WER":v[0]/v[1],"CER":v[2]/v[3]} for k,v in totals.items()},indent=2))
if __name__=="__main__":main()

