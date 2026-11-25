// LEVEL 2 — PhotoGlow Pro  (Difficulty: Easy)
// Protection: the key is NOT a plaintext string. It is stored XOR'd with 0x5A
// and decoded into a stack buffer right before the compare. There is also a
// single conditional jump that decides accept/reject.
// Learn (two paths):
//   (a) Keygen-free: find the encoded bytes in .data, XOR each with 0x5A to
//       recover the real key, then just type it.
//   (b) Patch: locate the `jz/jnz` after the compare and invert it (or NOP it)
//       so any input is accepted.
#include "challenge_ui.h"
#include "relab_logic.h"

int WINAPI WinMain(HINSTANCE hInst, HINSTANCE, LPSTR, int){
    chui::Theme t;
    t.levelId  = 2;
    t.appName  = L"PhotoGlow";
    t.tag      = L"LVL 2 • EASY";
    t.product  = L"PhotoGlow Pro";
    t.subtitle = L"Activate premium filters with your license key.";
    t.hint     = L"No plaintext key — it's XOR-encoded. Decode it, or patch the jump";
    t.keyLabel = L"LICENSE KEY";
    t.keyPH    = L"XXXX-XXX-XXXX-XXXX";
    t.flag     = L"Solved! You defeated a trivial XOR obfuscation.";
    t.accentA  = Gdiplus::Color(255,244,114,182);
    t.accentB  = Gdiplus::Color(255,124,92,255);

    return chui::run(hInst, t,
        [](const std::wstring&, const std::wstring& key, chui::State&)->bool{
            return relab::l2_check(chui::narrow(key));
        });
}
