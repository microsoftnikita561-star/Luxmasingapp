// launcher.cpp — ReverseLab (reverser-workbench styling, RU).
#include "glasskit.h"
#include <shellapi.h>
#include <string>
#include <vector>

struct Level {
    int id;
    std::wstring exe, name, diff, desc, learn;
    Gdiplus::Color col;
};

static std::vector<Level> levels(){
    using namespace gk;
    return {
        {1, L"ch1_quickreels.exe",   L"QuickReels Pro",       L"НОВИЧОК",
            L"Снятие водяного знака. Ключ хранится открытым текстом.",
            L"strings · xref · чтение .rdata", DIFF_1()},
        {2, L"ch2_photoglow.exe",    L"PhotoGlow Pro",        L"ЛЁГКИЙ",
            L"Премиум-фильтры. Ключ в XOR-кодировке, расшифровка в рантайме.",
            L"снять XOR · патч перехода", DIFF_2()},
        {3, L"ch3_vaultdrive.exe",   L"VaultDrive",           L"СРЕДНИЙ",
            L"Серийник из имени. Хранимого ключа нет — это keygenme.",
            L"реверс алгоритма · кейген", DIFF_3()},
        {4, L"ch4_sentinelvpn.exe",  L"SentinelVPN",          L"СЛОЖНЫЙ",
            L"Анти-отладка, шифрованные строки, ключ зависит от отладчика.",
            L"обход анти-отладки · поиск константы", DIFF_4()},
        {5, L"ch5_phantomcheat.exe", L"PhantomCheat Loader",  L"ЭКСПЕРТ",
            L"Чит-лоадер на виртуальной машине с анти-тампером и анти-отладкой.",
            L"девиртуализация VM · анти-тампер", DIFF_5()},
    };
}
static std::vector<Level> gLv = levels();

static std::wstring exeDir(){
    wchar_t b[MAX_PATH]; GetModuleFileNameW(nullptr,b,MAX_PATH);
    std::wstring p=b; size_t s=p.find_last_of(L"\\/"); return s==std::wstring::npos?L".":p.substr(0,s);
}
static bool solved(int id){
    wchar_t tmp[MAX_PATH]; DWORD n=GetTempPathW(MAX_PATH,tmp); if(!n)return false;
    wchar_t path[MAX_PATH]; wsprintfW(path,L"%sreverselab_L%d.ok",tmp,id);
    return GetFileAttributesW(path)!=INVALID_FILE_ATTRIBUTES;
}

static void drawRow(gk::App& a, Gdiplus::Graphics& g, const Level& lv, Gdiplus::RectF r, bool done){
    using namespace gk; using namespace Gdiplus;
    panel(g, r, 10.f, done?COL_PANEL_HI():COL_PANEL());
    accentTab(g, r, 10.f, lv.col, 3.f);
    float cy=r.Y+r.Height/2;

    // number tile
    RectF nt(r.X+20, cy-23, 46, 46);
    fillRound(g, nt, 9, COL_INSET());
    strokeRound(g, nt, 9, withA(lv.col,110), 1.f);
    text(g, std::to_wstring(lv.id), nt, 22, lv.col, ALIGN_C, FontStyleBold, true);

    float tx=r.X+84, tw=r.Width-84-168;
    // name + difficulty badge
    text(g, lv.name, RectF(tx, r.Y+17, tw, 24), 17, COL_TEXT(), ALIGN_L, FontStyleBold);
    float nw=measure(g,lv.name,17,FontStyleBold);
    {
        float bw=capsWidth(g,lv.diff,9.5f,1.4f)+22;
        RectF bd(tx+nw+12, r.Y+20, bw, 19);
        fillRound(g, bd, 5, withA(lv.col,26));
        caps(g, lv.diff, bd.X+11, bd.Y+4, 9.5f, lv.col, 1.4f);
    }
    // description
    text(g, lv.desc, RectF(tx, r.Y+41, tw, 20), 12.5f, COL_MUTED(), ALIGN_L);
    // filename + learn (mono, faint)
    text(g, lv.exe + L"   ·   " + lv.learn, RectF(tx, r.Y+63, tw, 18), 11, COL_FAINT(), ALIGN_L, FontStyleRegular, true);

    // solved mark (above the button)
    if(done){
        float bw=capsWidth(g,L"РЕШЕНО",9.f,1.4f)+28;
        RectF sp(r.X+r.Width-20-bw, r.Y+16, bw, 18);
        fillRound(g, sp, 5, withA(COL_OK(),26));
        text(g, L"✔", RectF(sp.X+9,sp.Y,12,18), 10.5f, COL_OK(), ALIGN_L, FontStyleBold);
        caps(g, L"РЕШЕНО", sp.X+22, sp.Y+4, 9.f, COL_OK(), 1.4f);
    }
}

int WINAPI WinMain(HINSTANCE hInst, HINSTANCE, LPSTR, int){
    using namespace gk; using namespace Gdiplus;
    App a; a.W=1060; a.H=762;
    a.appName=L"ReverseLab"; a.appTag=L"тренажёр реверс-инжиниринга"; a.winTitle=L"ReverseLab";

    for(auto& lv:gLv){ Button b; b.id=100+lv.id; b.style=1; b.text=L"Запустить"; a.buttons.push_back(b); }
    { Button gde; gde.id=10; gde.style=0; gde.text=L"Руководство и решения"; a.buttons.push_back(gde); }
    { Button f; f.id=11; f.style=1; f.text=L"Открыть папку"; a.buttons.push_back(f); }

    a.onContent=[](App& ap, Graphics& g){
        float M=40, x=M, w=ap.W-2*M;
        // content header
        text(g, L"Полигон мишеней", RectF(x,78,700,38), 27, COL_TEXT(), ALIGN_L, FontStyleBold);
        text(g, L"Пять учебных crackme-мишеней с нарастающей защитой — от простого до чит-лоадера.",
             RectF(x,118,800,22), 13, COL_MUTED(), ALIGN_L);

        int done=0; for(auto& lv:gLv) if(solved(lv.id)) done++;
        // progress stat (right)
        {
            RectF ps(ap.W-M-150, 74, 150, 52);
            panel(g, ps, 9.f);
            caps(g, L"РЕШЕНО", ps.X+16, ps.Y+11, 9.5f, COL_FAINT(), 1.6f);
            text(g, std::to_wstring(done)+L" / 5", RectF(ps.X+16,ps.Y+22,120,24), 19, COL_ACCENT(), ALIGN_L, FontStyleBold, true);
        }
        // section label
        caps(g, L"МИШЕНИ", x, 158, 10.f, COL_FAINT(), 2.0f);
        { Pen pen(COL_LINE(),1.f); float ly=166.f; g.DrawLine(&pen, x+capsWidth(g,L"МИШЕНИ",10.f,2.0f)+16, ly, x+w, ly); }

        float y=182, rh=90, gap=11;
        for(size_t i=0;i<gLv.size();++i){
            RectF r(x,y,w,rh);
            bool d=solved(gLv[i].id);
            drawRow(ap,g,gLv[i],r,d);
            for(auto& b:ap.buttons) if(b.id==100+(int)gLv[i].id){
                b.text = d? L"Заново" : L"Запустить";
                b.r=RectF(r.X+r.Width-20-128, r.Y+r.Height-50, 128, 36);
            }
            y+=rh+gap;
        }
        // footer buttons
        for(auto& b:ap.buttons){
            if(b.id==10) b.r=RectF(x, ap.H-56, 230, 40);
            if(b.id==11) b.r=RectF(x+242, ap.H-56, 150, 40);
        }
        text(g, L"только для обучения · мишени твои собственные",
             RectF(ap.W-M-360, ap.H-50, 360, 28), 11, COL_FAINT(), ALIGN_R, FontStyleRegular, true);
    };

    a.onButton=[](App& ap, int id){
        if(id>=101&&id<=105){
            int lvl=id-100; std::wstring path=exeDir()+L"\\";
            for(auto& lv:gLv) if(lv.id==lvl) path+=lv.exe;
            ShellExecuteW(nullptr,L"open",path.c_str(),nullptr,exeDir().c_str(),SW_SHOWNORMAL);
        } else if(id==10){
            std::wstring gde=exeDir()+L"\\GUIDE.html";
            if(GetFileAttributesW(gde.c_str())==INVALID_FILE_ATTRIBUTES) gde=exeDir()+L"\\..\\GUIDE.html";
            ShellExecuteW(nullptr,L"open",gde.c_str(),nullptr,nullptr,SW_SHOWNORMAL);
        } else if(id==11){
            ShellExecuteW(nullptr,L"open",exeDir().c_str(),nullptr,nullptr,SW_SHOWNORMAL);
        }
    };
    return gk::run(a,hInst);
}
