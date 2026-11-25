// УРОВЕНЬ 1 — QuickReels  (Новичок)
// Защита: лицензионный ключ лежит открытым текстом и сравнивается напрямую.
// Учишься: Strings-окно (Shift+F12), переход по xref к сравнению, чтение .rdata.
#include "challenge_ui.h"
#include "relab_logic.h"

int WINAPI WinMain(HINSTANCE hInst, HINSTANCE, LPSTR, int){
    chui::Theme t;
    t.levelId = 1;
    t.appName = L"QuickReels";
    t.tag     = L"УР.1 · НОВИЧОК";
    t.product = L"QuickReels Pro";
    t.target  = L"ch1_quickreels.exe";
    t.mission = L"Ключ спрятан на самом видном месте. Найди строку в бинарнике.";
    t.keyLabel= L"PRO-КОД";
    t.keyPH   = L"QR-XXXX-XXX-XXXXXX";
    t.flag    = L"Готово! Ты прочитал ключ прямо из секции .rdata.";
    t.diff    = gk::DIFF_1();
    return chui::run(hInst, t,
        [](const std::wstring&, const std::wstring& key, chui::State&)->bool{
            return relab::l1_check(chui::narrow(key));
        });
}
