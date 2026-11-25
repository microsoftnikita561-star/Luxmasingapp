// launcher.cpp — ReverseLab home screen. Lists the 5 training targets as
// frosted-glass cards, tracks which are solved (via %TEMP%\reverselab_L*.ok),
// launches each challenge .exe sitting next to this launcher, and opens the guide.
#include "glasskit.h"
#include <shellapi.h>
#include <string>
#include <vector>

struct Level {
    int id;
    std::wstring exe, name, diff, desc, learn;
    Gdiplus::Color chip;
};

static std::vector<Level> levels(){
    using namespace Gdiplus;
    return {
        {1, L"ch1_quickreels.exe",  L"QuickReels Pro",      L"NOVICE",
            L"Watermark unlock. The license key is stored as plain text.",
            L"Strings window • xrefs • read .rdata",        Color(255,52,211,153)},
        {2, L"ch2_photoglow.exe",   L"PhotoGlow Pro",       L"EASY",
            L"Premium filters. Key is XOR-encoded, decoded at runtime.",
            L"XOR decode • patch a conditional jump",            Color(255,34,211,238)},
        {3, L"ch3_vaultdrive.exe",  L"VaultDrive",          L"MEDIUM",
            L"Account serial. No stored key — it's a keygenme.",
            L"Reverse the algorithm • write a keygen",           Color(255,251,191,36)},
        {4, L"ch4_sentinelvpn.exe", L"SentinelVPN",         L"HARD",
            L"Anti-debugging, encrypted strings, debugger-gated key.",
            L"Beat anti-debug • find the hidden constant",       Color(255,251,146,60)},
        {5, L"ch5_phantomcheat.exe",L"PhantomCheat Loader", L"EXPERT",
            L"VM-protected cheat loader with anti-tamper + anti-debug.",
            L"Devirtualize the VM • defeat anti-tamper",         Color(255,248,113,113)},
    };
}

static std::wstring exeDir(){
    wchar_t buf[MAX_PATH]; GetModuleFileNameW(nullptr, buf, MAX_PATH);
    std::wstring p = buf; size_t s = p.find_last_of(L"\\/");
    return s==std::wstring::npos ? L"." : p.substr(0,s);
}
static bool solved(int id){
    wchar_t tmp[MAX_PATH]; DWORD n=GetTempPathW(MAX_PATH,tmp);
    if(!n) return false;
    wchar_t path[MAX_PATH]; wsprintfW(path, L"%sreverselab_L%d.ok", tmp, id);
    return GetFileAttributesW(path)!=INVALID_FILE_ATTRIBUTES;
}

static std::vector<Level> gLv = levels();

static void drawCard(gk::App& a, Gdiplus::Graphics& gfx, const Level& lv, Gdiplus::RectF r, bool done){
    using namespace gk; using namespace Gdiplus;
    glassPanel(gfx, r, 18.f, done?26:18, true);
    if(done) strokeRound(gfx, r, 18.f, withA(COL_OK(),150), 1.4f);

    // level badge (rounded square with gradient based on chip color)
    RectF badge(r.X+22, r.Y+ (r.Height-56)/2, 56, 56);
    GraphicsPath* bp = roundRect(badge, 16);
    LinearGradientBrush lg(PointF(badge.X,badge.Y), PointF(badge.X+badge.Width,badge.Y+badge.Height),
                           withA(lv.chip,255), withA(COL_ACCENT_A(),220));
    gfx.FillPath(&lg, bp); delete bp;
    drawText(gfx, std::to_wstring(lv.id), badge, 24, Color(255,255,255,255), ALIGN_C, FontStyleBold);

    float tx = r.X+98;
    float tw = r.Width - 98 - 190;
    // title + difficulty chip
    drawText(gfx, lv.name, RectF(tx, r.Y+16, tw, 28), 18, COL_TEXT(), ALIGN_L, FontStyleBold);
    float nameW = measureW(gfx, lv.name, 18, FontStyleBold);
    {
        float cw = measureW(gfx, lv.diff, 10.5f, FontStyleBold)+22;
        RectF chip(tx+nameW+14, r.Y+20, cw, 20);
        fillRound(gfx, chip, 10, withA(lv.chip,40));
        strokeRound(gfx, chip, 10, withA(lv.chip,160),1.f);
        drawText(gfx, lv.diff, chip, 10.5f, lv.chip, ALIGN_C, FontStyleBold);
    }
    drawText(gfx, lv.desc, RectF(tx, r.Y+44, tw, 22), 12.5f, COL_MUTED(), ALIGN_L);
    // learn tag
    drawText(gfx, L"▸ " + lv.learn, RectF(tx, r.Y+70, tw, 20), 11.5f, withA(COL_ACCENT_B(),230), ALIGN_L, FontStyleBold);

    // solved pill (right, above the button)
    if(done){
        RectF sp(r.X+r.Width-170, r.Y+16, 90, 22);
        fillRound(gfx, sp, 11, withA(COL_OK(),40));
        strokeRound(gfx, sp, 11, withA(COL_OK(),160),1.f);
        drawText(gfx, L"✔ SOLVED", sp, 10.5f, COL_OK(), ALIGN_C, FontStyleBold);
    }
}

int WINAPI WinMain(HINSTANCE hInst, HINSTANCE, LPSTR, int){
    using namespace gk; using namespace Gdiplus;
    App a;
    a.W = 1080; a.H = 760;
    a.appName = L"ReverseLab";
    a.appTag  = L"TRAINER";
    a.winTitle = L"ReverseLab";

    // one launch button per level + a guide button + a folder button
    for(auto& lv : gLv){ Button b; b.id=100+lv.id; b.style=1; b.text=L"Launch"; a.buttons.push_back(b); }
    { Button g; g.id=10; g.style=1; g.text=L"☰  Guide / Solutions"; a.buttons.push_back(g); }
    { Button f; f.id=11; f.style=2; f.text=L"Open folder"; a.buttons.push_back(f); }

    a.onContent = [](App& ap, Graphics& gfx){
        // hero header
        drawTextGrad(gfx, L"ReverseLab", RectF(44, 70, 600, 52), 40, COL_ACCENT_B(), COL_ACCENT_A(), ALIGN_L, FontStyleBold);
        drawText(gfx, L"Reverse-engineering trainer — 5 crackme targets with rising defenses. "
                      L"Analyse each .exe in IDA / x64dbg and recover the key.",
                 RectF(46, 120, 760, 24), 13.5f, COL_MUTED(), ALIGN_L);

        int done=0; for(auto& lv:gLv) if(solved(lv.id)) done++;
        // progress pill (top-right)
        {
            std::wstring pr = std::to_wstring(done) + L" / 5 solved";
            float pw = measureW(gfx, pr, 12.5f, FontStyleBold)+34;
            RectF pp(ap.W-44-pw, 78, pw, 30);
            fillRound(gfx, pp, 15, withA(COL_ACCENT_A(),36));
            strokeRound(gfx, pp, 15, withA(COL_ACCENT_A(),150),1.f);
            drawText(gfx, pr, pp, 12.5f, COL_TEXT(), ALIGN_C, FontStyleBold);
        }

        // cards
        float cardX=44, cardW=ap.W-88, cardH=104, gap=14, y=168;
        for(size_t i=0;i<gLv.size();++i){
            RectF r(cardX, y, cardW, cardH);
            bool d = solved(gLv[i].id);
            drawCard(ap, gfx, gLv[i], r, d);
            // position this level's launch button on the right of the card
            for(auto& b:ap.buttons) if(b.id==100+gLv[i].id){
                b.text = d ? L"Replay" : L"Launch";
                b.r = RectF(r.X+r.Width-150, r.Y+r.Height-54, 128, 38);
            }
            y += cardH+gap;
        }
        // footer buttons
        for(auto& b:ap.buttons){
            if(b.id==10) b.r = RectF(44, ap.H-58, 220, 40);
            if(b.id==11) b.r = RectF(276, ap.H-58, 130, 40);
        }
        drawText(gfx, L"For authorized learning on these bundled binaries only.",
                 RectF(ap.W-460, ap.H-52, 416, 28), 11.f, COL_FAINT(), ALIGN_R);
    };

    a.onButton = [](App& ap, int id){
        if(id>=101 && id<=105){
            int lvl=id-100; std::wstring path = exeDir()+L"\\";
            for(auto& lv:gLv) if(lv.id==lvl) path+=lv.exe;
            ShellExecuteW(nullptr, L"open", path.c_str(), nullptr, exeDir().c_str(), SW_SHOWNORMAL);
        } else if(id==10){
            std::wstring guide = exeDir()+L"\\GUIDE.html";
            if(GetFileAttributesW(guide.c_str())==INVALID_FILE_ATTRIBUTES)
                guide = exeDir()+L"\\..\\GUIDE.html";
            ShellExecuteW(nullptr, L"open", guide.c_str(), nullptr, nullptr, SW_SHOWNORMAL);
        } else if(id==11){
            ShellExecuteW(nullptr, L"open", exeDir().c_str(), nullptr, nullptr, SW_SHOWNORMAL);
        }
    };

    return gk::run(a, hInst);
}
