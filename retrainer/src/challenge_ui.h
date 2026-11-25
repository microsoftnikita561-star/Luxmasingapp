// challenge_ui.h — shared crackme window (reverser-workbench styling, RU).
#pragma once
#include "glasskit.h"
#include <string>
#include <functional>

namespace chui {

struct Theme {
    std::wstring appName   = L"ReverseLab";   // title-bar brand
    std::wstring tag       = L"";             // title-bar mono tag  (УР.1 · НОВИЧОК)
    std::wstring product   = L"Product";      // big heading
    std::wstring target    = L"";             // mono filename
    std::wstring mission   = L"";             // one-line attacker brief
    std::wstring keyLabel  = L"ЛИЦЕНЗИОННЫЙ КЛЮЧ";
    std::wstring keyPH     = L"XXXX-XXXX-XXXX";
    std::wstring nameLabel = L"ИМЯ АККАУНТА";
    std::wstring namePH    = L"имя";
    std::wstring flag      = L"";             // success detail
    int  levelId = 0;
    bool needsName = false;
    bool keyIsPassword = false;
    Gdiplus::Color diff = gk::COL_ACCENT();
};

struct State { int result=0; std::wstring msg; };

using Validator = std::function<bool(const std::wstring&, const std::wstring&, State&)>;

inline std::string narrow(const std::wstring& w){
    std::string s; s.reserve(w.size()); for(wchar_t c:w) s.push_back((char)(c&0xFF)); return s;
}
inline Theme&     theme(){ static Theme t; return t; }
inline State&     state(){ static State s; return s; }
inline Validator& validator(){ static Validator v; return v; }

inline void doValidate(gk::App& a){
    std::wstring name, key;
    for(auto& f:a.fields){ if(f.label==theme().nameLabel) name=f.text; else key=f.text; }
    State& st=state();
    bool ok = validator()? validator()(name,key,st) : false;
    st.result = ok?1:2;
    if(st.msg.empty()) st.msg = ok? L"ДОСТУП ОТКРЫТ" : L"ДОСТУП ЗАКРЫТ";
    for(auto& b:a.buttons) if(b.id==1) b.text = ok? L"ОТКРЫТО" : L"Проверить ключ";
    if(ok && theme().levelId>0){
        wchar_t tmp[MAX_PATH]; DWORD n=GetTempPathW(MAX_PATH,tmp);
        if(n>0&&n<MAX_PATH){ wchar_t path[MAX_PATH]; wsprintfW(path,L"%sreverselab_L%d.ok",tmp,theme().levelId);
            HANDLE h=CreateFileW(path,GENERIC_WRITE,0,nullptr,CREATE_ALWAYS,FILE_ATTRIBUTE_NORMAL,nullptr);
            if(h!=INVALID_HANDLE_VALUE){ DWORD w; WriteFile(h,"ok",2,&w,nullptr); CloseHandle(h); } }
    }
    a.invalidate();
}

inline void content(gk::App& a, Gdiplus::Graphics& g){
    using namespace gk; using namespace Gdiplus;
    Theme& t=theme();
    float M=40, x=M, w=a.W-2*M, y=84;

    // --- product heading + difficulty badge ---
    text(g, t.product, RectF(x, y, w-170, 34), 24, COL_TEXT(), ALIGN_L, FontStyleBold);
    {
        float bw = capsWidth(g, t.tag, 10.f, 1.6f) + 30;
        RectF badge(x+w-bw, y+4, bw, 26);
        fillRound(g, badge, 6, withA(t.diff,28));
        strokeRound(g, badge, 6, withA(t.diff,150), 1.f);
        accentTab(g, badge, 6, t.diff, 3.f);
        caps(g, t.tag, badge.X+14, badge.Y+6, 10.f, t.diff, 1.6f);
    }
    y += 38;
    if(!t.target.empty())
        text(g, L"цель: " + t.target, RectF(x, y, w, 20), 12, COL_FAINT(), ALIGN_L, FontStyleRegular, true);
    y += 30;
    { Pen pen(COL_LINE(),1.f); g.DrawLine(&pen, x, y, x+w, y); }
    y += 20;

    // --- mission brief ---
    if(!t.mission.empty()){
        text(g, L"▸", RectF(x, y, 16, 20), 12, withA(COL_ACCENT(),235), ALIGN_L, FontStyleBold);
        text(g, t.mission, RectF(x+20, y, w-20, 20), 12.5f, COL_MUTED(), ALIGN_L);
        y += 34;
    }

    // --- fields ---
    float fy=y+18;
    if(t.needsName){ if(a.fields.size()>=1) a.fields[0].r=RectF(x,fy,w,46); fy+=78; }
    size_t ki = t.needsName?1:0;
    if(a.fields.size()>ki) a.fields[ki].r=RectF(x,fy,w,46);
    fy+=78;

    // --- result strip ---
    State& st=state();
    if(st.result!=0){
        RectF rb(x, fy-8, w, 50);
        Color c = st.result==1?COL_OK():COL_BAD();
        fillRound(g, rb, 8, withA(c, st.result==1?26:22));
        strokeRound(g, rb, 8, withA(c,160), 1.f);
        accentTab(g, rb, 8, c, 3.f);
        text(g, st.result==1?L"✔":L"✕", RectF(rb.X+16,rb.Y,24,rb.Height), 16, c, ALIGN_L, FontStyleBold);
        text(g, st.msg, RectF(rb.X+46,rb.Y+7,rb.Width-56,20), 14.5f, c, ALIGN_L, FontStyleBold);
        if(st.result==1 && !t.flag.empty())
            text(g, t.flag, RectF(rb.X+46,rb.Y+27,rb.Width-56,18), 11.5f, COL_MUTED(), ALIGN_L);
        else if(st.result==2)
            text(g, L"неверный ключ — разбирай бинарник в IDA / x64dbg", RectF(rb.X+46,rb.Y+27,rb.Width-56,18), 11.5f, COL_MUTED(), ALIGN_L);
    }

    // --- primary button ---
    float by=a.H-96;
    for(auto& b:a.buttons) if(b.id==1) b.r=RectF(x,by,w,48);

    // --- footer ---
    text(g, L"учебная мишень · анализируй меня в IDA / Ghidra / x64dbg",
         RectF(x, a.H-38, w, 18), 10.5f, COL_FAINT(), ALIGN_L, FontStyleRegular, true);
}

inline int run(HINSTANCE hInst, const Theme& t, Validator v){
    theme()=t; validator()=v;
    gk::App a; a.W=600; a.H=580;
    a.appName=t.appName; a.appTag=t.tag; a.winTitle=t.product;
    if(t.needsName){
        gk::Field nf; nf.label=t.nameLabel; nf.placeholder=t.namePH; nf.maxlen=48; nf.focused=true; nf.mono=true; a.fields.push_back(nf);
        gk::Field kf; kf.label=t.keyLabel; kf.placeholder=t.keyPH; kf.maxlen=64; kf.password=t.keyIsPassword; kf.mono=true; a.fields.push_back(kf);
    } else {
        gk::Field kf; kf.label=t.keyLabel; kf.placeholder=t.keyPH; kf.maxlen=64; kf.focused=true; kf.password=t.keyIsPassword; kf.mono=true; a.fields.push_back(kf);
    }
    gk::Button vb; vb.id=1; vb.style=0; vb.text=L"Проверить ключ"; a.buttons.push_back(vb);
    a.onContent=content;
    a.onSubmit=[](gk::App& ap){ doValidate(ap); };
    a.onButton=[](gk::App& ap,int id){ if(id==1) doValidate(ap); };
    return gk::run(a,hInst);
}

} // namespace chui
