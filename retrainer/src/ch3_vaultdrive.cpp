// УРОВЕНЬ 3 — VaultDrive  (Средний) — keygenme
// Защита: ключа нигде нет. Серийник вычисляется из имени аккаунта
// (djb2-хеш -> смешивание -> форматирование). Нужно понять алгоритм и написать кейген.
#include "challenge_ui.h"
#include "relab_logic.h"

int WINAPI WinMain(HINSTANCE hInst, HINSTANCE, LPSTR, int){
    chui::Theme t;
    t.levelId   = 3;
    t.appName   = L"VaultDrive";
    t.tag       = L"УР.3 · СРЕДНИЙ";
    t.product   = L"VaultDrive";
    t.target    = L"ch3_vaultdrive.exe";
    t.mission   = L"Хранимого ключа нет — серийник из имени. Реверсь алгоритм.";
    t.needsName = true;
    t.nameLabel = L"ИМЯ АККАУНТА";
    t.namePH    = L"например reverser";
    t.keyLabel  = L"СЕРИЙНЫЙ НОМЕР";
    t.keyPH     = L"XXXX-XXXX-XXXX";
    t.flag      = L"Готово! Ты написал рабочий кейген.";
    t.diff      = gk::DIFF_3();
    return chui::run(hInst, t,
        [](const std::wstring& name, const std::wstring& key, chui::State&)->bool{
            return relab::l3_check(chui::narrow(name), chui::narrow(key));
        });
}
