// LEVEL 5 — PhantomCheat  (Difficulty: Expert)  *the "cheat loader"*
// The heavily-protected target. Layers:
//   * Bytecode VM: the key is NOT compared directly. A tiny accumulator VM
//     interprets a byte program (see L5_PROG) that transforms every character
//     of your key; the result is memcmp'd against an embedded target blob.
//     In IDA you see a dispatch loop over opcodes + data tables, not the check.
//   * Anti-tamper: a checksum over the VM program is folded into the VM seed.
//     NOP out or edit the program and the output silently corrupts -> no unlock.
//   * Anti-debug: any debugger indicator aborts with a fake "integrity" error.
//   * Encrypted strings: success text is XOR-stored and built at runtime.
// Learn: reverse a VM-based protector (VMProtect/Themida-style, simplified),
//        recover the per-index transform, then invert the target blob to get
//        the exact key (a reference inverter ships in tools/keygen).
#include "challenge_ui.h"
#include "relab_logic.h"
#include "antidbg.h"

static std::wstring dec(const unsigned char* b, size_t n, unsigned char k){
    std::wstring s; s.reserve(n);
    for(size_t i=0;i<n;++i) s.push_back((wchar_t)(b[i]^k));
    return s;
}
// "Solved! You reversed a bytecode VM and defeated anti-tamper." XOR 0x77
static const unsigned char FLAG_ENC_L5[] = {
    0x24,0x18,0x1b,0x01,0x12,0x13,0x56,0x57,0x2e,0x18,0x02,0x57,0x05,0x12,0x01,0x12,0x05,0x04,
    0x12,0x13,0x57,0x16,0x57,0x15,0x0e,0x03,0x12,0x14,0x18,0x13,0x12,0x57,0x21,0x3a,0x57,0x16,
    0x19,0x13,0x57,0x13,0x12,0x11,0x12,0x16,0x03,0x12,0x13,0x57,0x16,0x19,0x03,0x1e,0x5a,0x03,
    0x16,0x1a,0x07,0x12,0x05,0x59
};

int WINAPI WinMain(HINSTANCE hInst, HINSTANCE, LPSTR, int){
    chui::Theme t;
    t.levelId   = 5;
    t.appName   = L"PhantomCheat";
    t.tag       = L"LVL 5 • EXPERT";
    t.product   = L"PhantomCheat Loader";
    t.subtitle  = L"Enter the unlock key to inject. VM-protected build.";
    t.hint      = L"VM + anti-tamper + anti-debug — reverse the virtual machine";
    t.keyLabel  = L"UNLOCK KEY";
    t.keyPH     = L"XXXXXXX-XX-XXXX-XXXXXX";
    t.flag      = dec(FLAG_ENC_L5, sizeof(FLAG_ENC_L5), 0x77);
    t.accentA   = Gdiplus::Color(255,124,92,255);
    t.accentB   = Gdiplus::Color(255,244,114,182);

    return chui::run(hInst, t,
        [](const std::wstring&, const std::wstring& key, chui::State& st)->bool{
            if(adbg::present()){ st.msg = L"INTEGRITY CHECK FAILED"; return false; }
            bool ok = relab::l5_check(chui::narrow(key));
            if(!ok) st.msg = L"ACCESS DENIED";
            return ok;
        });
}
