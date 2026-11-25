// LEVEL 3 — VaultDrive  (Difficulty: Medium)  *keygenme*
// Protection: there is no key stored anywhere. The serial is DERIVED from your
// username with a small algorithm (djb2 hash -> mix -> formatted hex groups).
// Patching the single compare still works, but the real exercise is to REVERSE
// THE ALGORITHM and write a keygen that produces a valid serial for any name.
// Learn: trace the hash loop, the XOR with 0x5A17C0DE, the final sprintf mask,
//        then reimplement it. (A reference keygen ships in tools/keygen.)
#include "challenge_ui.h"
#include "relab_logic.h"

int WINAPI WinMain(HINSTANCE hInst, HINSTANCE, LPSTR, int){
    chui::Theme t;
    t.levelId   = 3;
    t.appName   = L"VaultDrive";
    t.tag       = L"LVL 3 • MEDIUM";
    t.product   = L"VaultDrive";
    t.subtitle  = L"Register your copy. Serial is bound to the account name.";
    t.hint      = L"No stored key — reverse the algorithm, build a keygen";
    t.needsName = true;
    t.nameLabel = L"ACCOUNT NAME";
    t.namePH    = L"e.g. reverser";
    t.keyLabel  = L"SERIAL";
    t.keyPH     = L"XXXX-XXXX-XXXX";
    t.flag      = L"Solved! You wrote a working keygen.";
    t.accentA   = Gdiplus::Color(255,34,211,238);
    t.accentB   = Gdiplus::Color(255,52,211,153);

    return chui::run(hInst, t,
        [](const std::wstring& name, const std::wstring& key, chui::State&)->bool{
            return relab::l3_check(chui::narrow(name), chui::narrow(key));
        });
}
