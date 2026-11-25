// УРОВЕНЬ 5 — PhantomCheat  (Эксперт) — чит-лоадер
// Максимальная защита: байткод-ВИРТУАЛЬНАЯ МАШИНА проверяет ключ (прямого
// сравнения нет), плюс анти-тампер (контрольная сумма программы ВМ уходит в seed)
// и анти-отладка. Учишься девиртуализации VM-протектора и инверсии target-блоба.
#include "challenge_ui.h"
#include "relab_logic.h"
#include "antidbg.h"

int WINAPI WinMain(HINSTANCE hInst, HINSTANCE, LPSTR, int){
    chui::Theme t;
    t.levelId  = 5;
    t.appName  = L"PhantomCheat";
    t.tag      = L"УР.5 · ЭКСПЕРТ";
    t.product  = L"PhantomCheat Loader";
    t.target   = L"ch5_phantomcheat.exe";
    t.mission  = L"Ключ проверяет виртуальная машина. Реверсь VM и инвертируй блоб.";
    t.keyLabel = L"КЛЮЧ РАЗБЛОКИРОВКИ";
    t.keyPH    = L"XXXXXXX-XX-XXXX-XXXXXX";
    t.flag     = L"Готово! Ты реверснул байткод-ВМ и обошёл анти-тампер.";
    t.diff     = gk::DIFF_5();
    return chui::run(hInst, t,
        [](const std::wstring&, const std::wstring& key, chui::State& st)->bool{
            if(adbg::present()){ st.msg = L"НАРУШЕНА ЦЕЛОСТНОСТЬ"; return false; }
            bool ok = relab::l5_check(chui::narrow(key));
            if(!ok) st.msg = L"ДОСТУП ЗАКРЫТ";
            return ok;
        });
}
