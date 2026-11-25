// УРОВЕНЬ 2 — PhotoGlow Pro  (Лёгкий)
// Защита: ключа в открытом виде нет — он хранится в XOR-кодировке (0x5A) и
// расшифровывается в буфер перед сравнением. Есть один условный переход.
// Учишься: снять XOR и восстановить ключ, либо пропатчить jz/jnz после сравнения.
#include "challenge_ui.h"
#include "relab_logic.h"

int WINAPI WinMain(HINSTANCE hInst, HINSTANCE, LPSTR, int){
    chui::Theme t;
    t.levelId = 2;
    t.appName = L"PhotoGlow";
    t.tag     = L"УР.2 · ЛЁГКИЙ";
    t.product = L"PhotoGlow Pro";
    t.target  = L"ch2_photoglow.exe";
    t.mission = L"Ключ закодирован XOR. Расшифруй его — или инвертируй переход.";
    t.keyLabel= L"ЛИЦЕНЗИОННЫЙ КЛЮЧ";
    t.keyPH   = L"XXXX-XXX-XXXX-XXXX";
    t.flag    = L"Готово! Ты снял простую XOR-обфускацию.";
    t.diff    = gk::DIFF_2();
    return chui::run(hInst, t,
        [](const std::wstring&, const std::wstring& key, chui::State&)->bool{
            return relab::l2_check(chui::narrow(key));
        });
}
