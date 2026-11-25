// gen.cpp — native generator + verifier for ReverseLab challenge constants.
// Compile & run on Linux:  g++ -std=c++17 -I ../src gen.cpp -o gen && ./gen
//
// Prints the C byte arrays / constants to paste into src/relab_logic.h, then
// verifies every challenge accepts its intended key and rejects wrong input.
#include "relab_logic.h"
#include <cstdio>
#include <string>
using namespace relab;

static void printArr(const char* name, const unsigned char* b, int n){
    printf("static const unsigned char %s[%d] = {\n    ", name, n);
    for(int i=0;i<n;++i){ printf("0x%02x,", b[i]); if((i+1)%18==0) printf("\n    "); }
    printf("\n};\n");
}

int main(){
    // ---- L2: encode plaintext key with XOR 0x5A ----
    std::string l2key = "GLOW-PRO-7F3A-9C2D";
    unsigned char enc[64]; int n2=(int)l2key.size();
    for(int i=0;i<n2;++i) enc[i]=(unsigned char)(l2key[i]^0x5A);
    printf("// L2 key = \"%s\"\n", l2key.c_str());
    printArr("L2_ENC", enc, n2);

    // ---- L5: integrity + target blob for the intended key ----
    unsigned char integ = l5_integrity();
    printf("\n// L5 integrity expected = 0x%02x\n", integ);

    std::string l5key = "PH4NTOM-VM-2024-UNLOCK";
    int n5=(int)l5key.size();
    // compute target with seed exactly L5_SEED() (untampered program)
    unsigned char out[64]; unsigned char prev=L5_SEED();
    for(int i=0;i<n5;++i){
        unsigned char acc=0;
        for(size_t pc=0;pc<sizeof(L5_PROG);++pc){
            switch(L5_PROG[pc]){
                case OP_LDK:  acc=(unsigned char)l5key[i]; break;
                case OP_ADDT: acc=(unsigned char)(acc+l5_addtab(i)); break;
                case OP_XORT: acc=(unsigned char)(acc^l5_xortab(i)); break;
                case OP_ROLT: acc=rol8(acc,l5_roltab(i)); break;
                case OP_ADDP: acc=(unsigned char)(acc+prev); break;
                case OP_STP:  out[i]=acc; prev=acc; break;
                case OP_HLT:  pc=sizeof(L5_PROG); break;
            }
        }
    }
    printf("// L5 key = \"%s\"  (len=%d)\n", l5key.c_str(), n5);
    printArr("L5_TARGET", out, n5);

    // inverse round-trip check (keygen correctness)
    unsigned char rec[64];
    { unsigned char p=L5_SEED();
      for(int i=0;i<n5;++i){ unsigned char y=out[i]; unsigned char t=(unsigned char)(y-p);
        t=ror8(t,l5_roltab(i)); t=(unsigned char)(t^l5_xortab(i)); t=(unsigned char)(t-l5_addtab(i));
        rec[i]=t; p=y; } }
    std::string recs((char*)rec,n5);
    printf("// L5 inverse(target) = \"%s\"  -> %s\n", recs.c_str(), recs==l5key?"OK":"MISMATCH");

    // ---- sample serials for the docs ----
    printf("\n// ---- sample serials ----\n");
    const char* names[]={"reverser","neo","student2024"};
    for(auto nm:names) printf("// L3  name=\"%s\"  serial=%s\n", nm, l3_serial(nm).c_str());
    for(auto nm:names) printf("// L4  name=\"%s\"  serial=%s  (no-debugger)\n", nm, l4_serial(nm, L4_K_REAL()).c_str());

    // ---- encrypted UI strings (XOR) for L4 / L5 ----
    auto printEnc=[&](const char* name, const char* text, unsigned char k){
        int n=(int)strlen(text);
        printf("// \"%s\" XOR 0x%02x\n", text, k);
        printf("static const unsigned char %s[] = {\n    ", name);
        for(int i=0;i<n;++i){ printf("0x%02x,", (unsigned char)text[i]^k); if((i+1)%18==0) printf("\n    "); }
        printf("\n};\n");
    };
    printf("\n// ---- encrypted strings ----\n");
    printEnc("FLAG_ENC_L4", "Solved! You beat the anti-debug and found the real constant.", 0x3C);
    printEnc("FLAG_ENC_L5", "Solved! You reversed a bytecode VM and defeated anti-tamper.", 0x77);

    // =================== VERIFICATION (against header blobs) ===================
    printf("\n// =================== SELF-TEST ===================\n");
    int fail=0;
    auto ck=[&](const char* t,bool cond){ printf("// [%s] %s\n", cond?"PASS":"FAIL", t); if(!cond)fail++; };

    ck("L1 accepts valid",   l1_check(L1_KEY()));
    ck("L1 rejects wrong",  !l1_check("nope"));

    ck("L2 accepts valid",   l2_check("GLOW-PRO-7F3A-9C2D"));
    ck("L2 decoded matches", l2_decoded()=="GLOW-PRO-7F3A-9C2D");
    ck("L2 rejects wrong",  !l2_check("GLOW-PRO-0000-0000"));

    ck("L3 accepts keygen",  l3_check("reverser", l3_serial("reverser")));
    ck("L3 case-insensitive",l3_check("reverser", upper(l3_serial("reverser"))));
    ck("L3 rejects wrong",  !l3_check("reverser","0000-0000-0000"));

    ck("L4 accepts real",    l4_check("reverser", l4_serial("reverser",L4_K_REAL()), false));
    ck("L4 rejects under dbg",!l4_check("reverser", l4_serial("reverser",L4_K_REAL()), true));
    ck("L4 fake!=real",      l4_serial("reverser",L4_K_REAL())!=l4_serial("reverser",L4_K_FAKE()));

    ck("L5 accepts valid",   l5_check("PH4NTOM-VM-2024-UNLOCK"));
    ck("L5 rejects wrong",  !l5_check("PH4NTOM-VM-2024-WRONGX"));
    ck("L5 integrity const", l5_integrity()==L5_INTEGRITY_EXPECTED());

    printf("\n// RESULT: %s (%d failures)\n", fail==0?"ALL PASS":"FAILURES", fail);
    return fail;
}
