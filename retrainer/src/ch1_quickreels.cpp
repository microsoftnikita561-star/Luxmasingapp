// LEVEL 1 — QuickReels  (Difficulty: Novice)
// Protection: the license key is stored as a plain readable string and checked
// with a direct comparison. This is the "TikTok-tier" app.
// Learn: run `strings`, use IDA's Strings window (Shift+F12), follow the xref to
//        the compare, read the key straight out of .rdata. No patching needed.
#include "challenge_ui.h"
#include "relab_logic.h"

int WINAPI WinMain(HINSTANCE hInst, HINSTANCE, LPSTR, int){
    chui::Theme t;
    t.levelId  = 1;
    t.appName  = L"QuickReels";
    t.tag      = L"LVL 1 • NOVICE";
    t.product  = L"QuickReels Pro";
    t.subtitle = L"Enter your PRO code to remove the export watermark.";
    t.hint     = L"The key is hiding in plain sight";
    t.keyLabel = L"PRO CODE";
    t.keyPH    = L"QR-XXXX-XXX-XXXXXX";
    t.flag     = L"Solved! You read a plaintext secret from .rdata.";
    t.accentA  = Gdiplus::Color(255,124,92,255);
    t.accentB  = Gdiplus::Color(255,34,211,238);

    return chui::run(hInst, t,
        [](const std::wstring&, const std::wstring& key, chui::State&)->bool{
            return relab::l1_check(chui::narrow(key));
        });
}
