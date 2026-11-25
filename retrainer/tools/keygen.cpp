// keygen.cpp — reference keygen for the ReverseLab targets.
// This is the answer key: build it once you have (or want to check) your own
// reversed algorithm.  g++ -std=c++17 -I ../src keygen.cpp -o keygen
//   ./keygen "reverser"
#include "relab_logic.h"
#include <cstdio>
#include <string>
using namespace relab;

int main(int argc, char** argv){
    std::string name = argc>1 ? argv[1] : "reverser";

    printf("ReverseLab keygen\n=================\n");
    printf("Level 1 (QuickReels)  key    : %s\n", L1_KEY());
    printf("Level 2 (PhotoGlow)   key    : %s\n", l2_decoded().c_str());
    printf("Level 3 (VaultDrive)  name=%-12s serial: %s\n", name.c_str(), l3_serial(name).c_str());
    printf("Level 4 (SentinelVPN) name=%-12s serial: %s   (run WITHOUT a debugger)\n",
           name.c_str(), l4_serial(name, L4_K_REAL()).c_str());

    // Level 5: recover the exact key by inverting the embedded VM target blob.
    unsigned char rec[64]; l5_invert(L5_TARGET, L5_N(), rec);
    std::string k5((char*)rec, L5_N());
    printf("Level 5 (PhantomCheat) key   : %s   (inverted from VM target blob)\n", k5.c_str());
    return 0;
}
