// УРОВЕНЬ 4 — SentinelVPN  (Сложный)
// Защита: анти-отладка (IsDebuggerPresent + PEB.BeingDebugged + NtGlobalFlag +
// timing) + шифрованные строки. Под отладчиком в ключ подмешивается другая
// константа (0xDEADBEEF вместо 0x1337C0DE), поэтому верный серийник отклоняется,
// пока не снимешь анти-отладку.
#include "challenge_ui.h"
#include "relab_logic.h"
#include "antidbg.h"

int WINAPI WinMain(HINSTANCE hInst, HINSTANCE, LPSTR, int){
    chui::Theme t;
    t.levelId   = 4;
    t.appName   = L"SentinelVPN";
    t.tag       = L"УР.4 · СЛОЖНЫЙ";
    t.product   = L"SentinelVPN";
    t.target    = L"ch4_sentinelvpn.exe";
    t.mission   = L"Анти-отладка прячет константу ключа. Сними её, потом кейгень.";
    t.needsName = true;
    t.nameLabel = L"ИМЯ АККАУНТА";
    t.namePH    = L"например reverser";
    t.keyLabel  = L"ЛИЦЕНЗИОННЫЙ СЕРИЙНИК";
    t.keyPH     = L"VPN-XXX-XXX-XX";
    t.flag      = L"Готово! Ты обошёл анти-отладку и нашёл настоящую константу.";
    t.diff      = gk::DIFF_4();
    return chui::run(hInst, t,
        [](const std::wstring& name, const std::wstring& key, chui::State& st)->bool{
            bool dbg = adbg::present();
            bool ok  = relab::l4_check(chui::narrow(name), chui::narrow(key), dbg);
            if(!ok) st.msg = L"ДОСТУП ЗАКРЫТ";
            return ok;
        });
}
