// LEVEL 4 — SentinelVPN  (Difficulty: Hard)
// Protection stack:
//   * Anti-debugging: IsDebuggerPresent + CheckRemoteDebuggerPresent +
//     PEB.BeingDebugged + NtGlobalFlag + a rdtsc-style timing check.
//   * Debugger-gated logic: the constant mixed into the serial changes when a
//     debugger is detected (0x1337C0DE normal vs 0xDEADBEEF under a debugger),
//     so a correct serial is REJECTED while you are stepping it. You must first
//     neutralise the anti-debug (patch the checks / zero PEB flags), then keygen.
//   * Encrypted strings: the success text is stored XOR'd and decoded at runtime,
//     so you won't find it with a plain strings dump.
// Learn: dynamic analysis, defeating anti-debug, finding the real key constant.
#include "challenge_ui.h"
#include "relab_logic.h"
#include "antidbg.h"

// Decode an XOR'd (key 0x3C) byte blob to a wide string at runtime.
static std::wstring dec(const unsigned char* b, size_t n){
    std::wstring s; s.reserve(n);
    for(size_t i=0;i<n;++i) s.push_back((wchar_t)(b[i]^0x3C));
    return s;
}
// "Solved! You beat the anti-debug and found the real constant." XOR 0x3C
static const unsigned char FLAG_ENC[] = {
    0x6f,0x53,0x50,0x4a,0x59,0x58,0x1d,0x1c,0x65,0x53,0x49,0x1c,0x5e,0x59,0x5d,0x48,0x1c,0x48,
    0x54,0x59,0x1c,0x5d,0x52,0x48,0x55,0x11,0x58,0x59,0x5e,0x49,0x5b,0x1c,0x5d,0x52,0x58,0x1c,
    0x5a,0x53,0x49,0x52,0x58,0x1c,0x48,0x54,0x59,0x1c,0x4e,0x59,0x5d,0x50,0x1c,0x5f,0x53,0x52,
    0x4f,0x48,0x5d,0x52,0x48,0x12
};

int WINAPI WinMain(HINSTANCE hInst, HINSTANCE, LPSTR, int){
    chui::Theme t;
    t.levelId   = 4;
    t.appName   = L"SentinelVPN";
    t.tag       = L"LVL 4 • HARD";
    t.product   = L"SentinelVPN";
    t.subtitle  = L"Premium tier. Anti-tamper protected. License bound to account.";
    t.hint      = L"Debugger-aware — the real key constant hides from your debugger";
    t.needsName = true;
    t.nameLabel = L"ACCOUNT NAME";
    t.namePH    = L"e.g. reverser";
    t.keyLabel  = L"LICENSE SERIAL";
    t.keyPH     = L"VPN-XXX-XXX-XX";
    t.flag      = dec(FLAG_ENC, sizeof(FLAG_ENC));
    t.accentA   = Gdiplus::Color(255,52,211,153);
    t.accentB   = Gdiplus::Color(255,34,211,238);

    return chui::run(hInst, t,
        [](const std::wstring& name, const std::wstring& key, chui::State& st)->bool{
            bool dbg = adbg::present();
            bool ok  = relab::l4_check(chui::narrow(name), chui::narrow(key), dbg);
            if(!ok) st.msg = L"ACCESS DENIED";   // no hint about why
            return ok;
        });
}
