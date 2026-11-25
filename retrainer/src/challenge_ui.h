// challenge_ui.h — shared "cracked-me login" card built on glasskit.
// Each challenge .cpp just fills a Theme and a validate() callback.
#pragma once
#include "glasskit.h"
#include <string>
#include <functional>

namespace chui {

struct Theme {
    std::wstring appName   = L"ReverseLab";
    std::wstring tag       = L"";
    std::wstring product   = L"Product";
    std::wstring subtitle  = L"";
    std::wstring hint      = L"";      // attacker hint line
    std::wstring keyLabel  = L"LICENSE KEY";
    std::wstring keyPH      = L"XXXX-XXXX-XXXX";
    std::wstring nameLabel = L"USERNAME";
    std::wstring namePH     = L"your name";
    std::wstring flag      = L"";      // revealed on success
    int  levelId = 0;                  // 1..5, used to drop a "solved" marker
    bool needsName = false;
    bool keyIsPassword = false;
    Gdiplus::Color accentA = gk::COL_ACCENT_A();
    Gdiplus::Color accentB = gk::COL_ACCENT_B();
};

struct State { int result=0; std::wstring msg; };  // 0 idle, 1 granted, 2 denied

// validate(name, key, state) -> true on success. Fill state.msg for feedback.
using Validator = std::function<bool(const std::wstring&, const std::wstring&, State&)>;

inline std::string narrow(const std::wstring& w){
    std::string s; s.reserve(w.size());
    for(wchar_t c:w) s.push_back((char)(c & 0xFF));
    return s;
}

// module-local state (one challenge per process)
inline Theme&     theme(){ static Theme t; return t; }
inline State&     state(){ static State s; return s; }
inline Validator& validator(){ static Validator v; return v; }
inline float      winGlow(){ static float g=0; return g; } // not used; placeholder

inline void doValidate(gk::App& a){
    using namespace gk;
    std::wstring name, key;
    for(auto& f:a.fields){
        if(f.label==theme().nameLabel) name=f.text;
        else key=f.text;
    }
    State& st = state();
    bool ok = validator() ? validator()(name, key, st) : false;
    st.result = ok?1:2;
    if(ok && theme().levelId>0){
        // drop a shared "solved" marker the launcher can read
        wchar_t tmp[MAX_PATH]; DWORD n = GetTempPathW(MAX_PATH, tmp);
        if(n>0 && n<MAX_PATH){
            wchar_t path[MAX_PATH];
            wsprintfW(path, L"%sreverselab_L%d.ok", tmp, theme().levelId);
            HANDLE h = CreateFileW(path, GENERIC_WRITE, 0, nullptr, CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, nullptr);
            if(h!=INVALID_HANDLE_VALUE){ DWORD w; WriteFile(h, "ok", 2, &w, nullptr); CloseHandle(h); }
        }
    }
    if(st.msg.empty()) st.msg = ok ? L"ACCESS GRANTED" : L"ACCESS DENIED";
    // once granted, lock & restyle the button
    for(auto& b:a.buttons) if(b.id==1){ b.text = ok? L"UNLOCKED" : L"Verify key"; }
    a.invalidate();
}

inline void content(gk::App& a, Gdiplus::Graphics& gfx){
    using namespace gk; using namespace Gdiplus;
    float cx = a.W*0.5f;
    RectF card((a.W-520)/2.0f, 92, 520, a.H-150);
    glassPanel(gfx, card, 22.f, 22, true);

    float x = card.X + 36;
    float w = card.Width - 72;
    float y = card.Y + 30;

    // product title (gradient) + subtitle
    drawTextGrad(gfx, theme().product, RectF(x, y, w, 40), 27, theme().accentB, theme().accentA, ALIGN_L, FontStyleBold);
    y += 44;
    if(!theme().subtitle.empty()){
        drawText(gfx, theme().subtitle, RectF(x, y, w, 22), 13.5f, COL_MUTED(), ALIGN_L);
        y += 30;
    }
    // attacker hint pill
    if(!theme().hint.empty()){
        float tw = measureW(gfx, theme().hint, 11.5f, FontStyleBold) + 42;
        RectF pill(x, y, tw, 26);
        fillRound(gfx, pill, 13, Color(26, 255,255,255));
        strokeRound(gfx, pill, 13, Color(50,255,255,255), 1.f);
        drawText(gfx, L"⚑", RectF(pill.X+12, pill.Y, 16, 26), 12, COL_WARN(), ALIGN_L);
        drawText(gfx, theme().hint, RectF(pill.X+28, pill.Y, tw-30, 26), 11.5f, COL_TEXT(), ALIGN_L, FontStyleBold);
        y += 40;
    } else y += 8;

    // ---- position the input fields (laid out here, drawn by glasskit) ----
    float fy = y + 20;
    if(theme().needsName){
        if(a.fields.size()>=1){ a.fields[0].r = RectF(x, fy+20, w, 48); }
        fy += 86;
    }
    size_t keyIdx = theme().needsName ? 1 : 0;
    if(a.fields.size()>keyIdx){ a.fields[keyIdx].r = RectF(x, fy+20, w, 48); }
    fy += 86;

    // ---- buttons ----
    float by = card.Y + card.Height - 130;
    for(auto& b:a.buttons){
        if(b.id==1){ b.r = RectF(x, by, w, 50); }
        if(b.id==2){ b.r = RectF(x, by+60, w*0.49f, 40); }
        if(b.id==3){ b.r = RectF(x + w*0.51f, by+60, w*0.49f, 40); }
    }

    // ---- result banner ----
    State& st = state();
    if(st.result!=0){
        RectF rb(x, by - 72, w, 54);
        Color c = st.result==1 ? COL_OK() : COL_BAD();
        if(st.result==1){
            for(int i=12;i>=1;--i){ float f=(float)i; int al=(int)(60*(1.0f-i/12.f));
                fillRound(gfx, RectF(rb.X-f,rb.Y-f,rb.Width+f*2,rb.Height+f*2),14+f, withA(c,al)); }
        }
        fillRound(gfx, rb, 14, withA(c, st.result==1?46:34));
        strokeRound(gfx, rb, 14, withA(c,170), 1.3f);
        drawText(gfx, st.result==1?L"✔":L"✖", RectF(rb.X+18, rb.Y, 28, rb.Height), 18, c, ALIGN_L, FontStyleBold);
        drawText(gfx, st.msg, RectF(rb.X+52, rb.Y+8, rb.Width-64, 22), 15, c, ALIGN_L, FontStyleBold);
        if(st.result==1 && !theme().flag.empty())
            drawText(gfx, theme().flag, RectF(rb.X+52, rb.Y+28, rb.Width-64, 20), 12, COL_TEXT(), ALIGN_L);
        else if(st.result==2)
            drawText(gfx, L"Wrong key — analyse the binary and try again.", RectF(rb.X+52, rb.Y+30, rb.Width-64, 18), 11.5f, COL_MUTED(), ALIGN_L);
    }

    // footer
    drawText(gfx, L"ReverseLab • training target • analyse me in IDA / x64dbg",
             RectF(card.X, card.Y+card.Height-28, card.Width, 20), 10.5f, COL_FAINT(), ALIGN_C);
}

inline int run(HINSTANCE hInst, const Theme& t, Validator v){
    theme() = t; validator() = v;
    gk::App a;
    a.W = 600; a.H = 620;
    a.appName = t.appName; a.appTag = t.tag;
    a.winTitle = t.product;

    if(t.needsName){
        gk::Field nf; nf.label=t.nameLabel; nf.placeholder=t.namePH; nf.maxlen=48; nf.focused=true;
        a.fields.push_back(nf);
        gk::Field kf; kf.label=t.keyLabel; kf.placeholder=t.keyPH; kf.maxlen=64; kf.password=t.keyIsPassword;
        a.fields.push_back(kf);
    } else {
        gk::Field kf; kf.label=t.keyLabel; kf.placeholder=t.keyPH; kf.maxlen=64; kf.focused=true; kf.password=t.keyIsPassword;
        a.fields.push_back(kf);
    }

    gk::Button vb; vb.id=1; vb.style=0; vb.text=L"Verify key"; a.buttons.push_back(vb);

    a.onContent = content;
    a.onSubmit  = [](gk::App& ap){ doValidate(ap); };
    a.onButton  = [](gk::App& ap, int id){
        if(id==1) doValidate(ap);
    };
    return gk::run(a, hInst);
}

} // namespace chui
