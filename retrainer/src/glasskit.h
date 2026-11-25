// glasskit.h — "Reverser Workbench" UI toolkit for Win32 + GDI+
// Header-only. Each challenge/launcher .cpp includes this once and builds its own EXE.
//
// Design language: a calm, flat, graphite developer tool (think IDA / x64dbg /
// a pro dark IDE) — solid surfaces, hairline borders, ONE warm accent, and
// monospace for technical data. No frosted glass, no aurora, no rainbow
// gradients. Just a serious instrument.
//
// Link with: -lgdiplus -lgdi32 -luser32 -ldwmapi -lshell32
#pragma once
#ifndef UNICODE
#define UNICODE
#endif
#ifndef _UNICODE
#define _UNICODE
#endif
#include <windows.h>
#include <windowsx.h>
#include <dwmapi.h>
#include <gdiplus.h>
#include <string>
#include <vector>
#include <functional>
#include <cmath>

using namespace Gdiplus;

namespace gk {

// ---------------------------------------------------------------------------
// Palette — graphite surfaces + one amber accent + functional status colors.
// ---------------------------------------------------------------------------
inline Color COL_BG()          { return Color(255, 14, 15, 19);  }  // #0E0F13 window base
inline Color COL_BG2()         { return Color(255, 18, 20, 26);  }  // header strip
inline Color COL_PANEL()       { return Color(255, 24, 26, 33);  }  // #181A21 panel
inline Color COL_PANEL_HI()    { return Color(255, 31, 34, 43);  }  // raised / hover
inline Color COL_INSET()       { return Color(255, 11, 12, 16);  }  // input well
inline Color COL_LINE()        { return Color(255, 42, 46, 57);  }  // hairline border
inline Color COL_LINE_HI()     { return Color(255, 60, 66, 80);  }  // brighter border
inline Color COL_TEXT()        { return Color(255, 231, 233, 238);}  // #E7E9EE
inline Color COL_MUTED()       { return Color(255, 146, 151, 166);}  // #9297A6
inline Color COL_FAINT()       { return Color(255, 95, 101, 116); }  // #5F6574
inline Color COL_ACCENT()      { return Color(255, 240, 167, 42); }  // #F0A72A amber
inline Color COL_ACCENT_DK()   { return Color(255, 23, 18, 8);    }  // text on accent
inline Color COL_OK()          { return Color(255, 67, 197, 158); }  // #43C59E
inline Color COL_BAD()         { return Color(255, 229, 72, 77);  }  // #E5484D

// difficulty accents (desaturated, flat)
inline Color DIFF_1()          { return Color(255, 76, 175, 96);  }  // novice  green
inline Color DIFF_2()          { return Color(255, 58, 170, 190); }  // easy    teal
inline Color DIFF_3()          { return Color(255, 217, 163, 58); }  // medium  amber
inline Color DIFF_4()          { return Color(255, 224, 128, 60); }  // hard    orange
inline Color DIFF_5()          { return Color(255, 224, 80, 86);  }  // expert  red

inline Color withA(Color c, int a){ return Color(a, c.GetR(), c.GetG(), c.GetB()); }
inline Color mix(Color a, Color b, float t){
    return Color(255,
        (BYTE)(a.GetR()+(b.GetR()-a.GetR())*t),
        (BYTE)(a.GetG()+(b.GetG()-a.GetG())*t),
        (BYTE)(a.GetB()+(b.GetB()-a.GetB())*t));
}

struct App;

struct Button {
    RectF  r;
    std::wstring text;
    int    id = 0;
    int    style = 0;       // 0 primary(accent) 1 ghost 2 chrome 3 danger
    bool   hover = false, down = false, enabled = true;
    float  hv = 0.f;        // animated hover 0..1
};

struct Field {
    RectF  r;
    std::wstring text, placeholder, label;
    bool   focused = false, hover = false, password = false, mono = true;
    size_t maxlen = 64;
};

struct App {
    HWND  hwnd = nullptr;
    ULONG_PTR gdip = 0;
    int   W = 1040, H = 680;
    double t = 0.0;
    POINT mouse{ -1,-1 };
    bool  mouseDown = false;

    std::wstring winTitle = L"ReverseLab";
    std::wstring appName  = L"ReverseLab";
    std::wstring appTag   = L"";

    std::vector<Button> buttons;
    std::vector<Field>  fields;

    std::function<void(App&, Graphics&)> onContent;
    std::function<void(App&, int)>       onButton;
    std::function<void(App&)>            onSubmit;

    Bitmap* bgCache = nullptr;   // cached static background

    Field* focusedField(){ for(auto&f:fields) if(f.focused) return &f; return nullptr; }
    void invalidate(){ if(hwnd) InvalidateRect(hwnd, nullptr, FALSE); }
};

inline App*& g(){ static App* p=nullptr; return p; }

// ---------------------------------------------------------------------------
// Fonts — robust fallback so text always renders (incl. minimal wine).
// ---------------------------------------------------------------------------
inline FontFamily* uiFamily(){
    static FontFamily* fam = nullptr;
    if(!fam){
        const wchar_t* tries[] = { L"Segoe UI", L"Inter", L"Arial", L"DejaVu Sans", L"Liberation Sans" };
        for(auto n : tries){ FontFamily* f=new FontFamily(n); if(f->IsAvailable()){ fam=f; break; } delete f; }
        if(!fam) fam = (FontFamily*)FontFamily::GenericSansSerif();
    }
    return fam;
}
inline FontFamily* monoFamily(){
    static FontFamily* fam = nullptr;
    if(!fam){
        const wchar_t* tries[] = { L"Consolas", L"Cascadia Mono", L"Courier New", L"DejaVu Sans Mono", L"Liberation Mono" };
        for(auto n : tries){ FontFamily* f=new FontFamily(n); if(f->IsAvailable()){ fam=f; break; } delete f; }
        if(!fam) fam = (FontFamily*)FontFamily::GenericMonospace();
    }
    return fam;
}
inline Font* uiFont(float size, int style=FontStyleRegular){ return new Font(uiFamily(), size, style, UnitPixel); }
inline Font* moFont(float size, int style=FontStyleRegular){ return new Font(monoFamily(), size, style, UnitPixel); }

// ---------------------------------------------------------------------------
// Primitives.
// ---------------------------------------------------------------------------
inline GraphicsPath* roundRect(RectF r, float rad){
    GraphicsPath* p = new GraphicsPath();
    if(rad<=0.1f){ p->AddRectangle(r); p->CloseFigure(); return p; }
    float d=rad*2;
    p->AddArc(r.X,r.Y,d,d,180,90);
    p->AddArc(r.X+r.Width-d,r.Y,d,d,270,90);
    p->AddArc(r.X+r.Width-d,r.Y+r.Height-d,d,d,0,90);
    p->AddArc(r.X,r.Y+r.Height-d,d,d,90,90);
    p->CloseFigure();
    return p;
}
inline void fillRound(Graphics& g, RectF r, float rad, Color c){
    GraphicsPath* p=roundRect(r,rad); SolidBrush b(c); g.FillPath(&b,p); delete p; }
inline void strokeRound(Graphics& g, RectF r, float rad, Color c, float w=1.f){
    GraphicsPath* p=roundRect(r,rad); Pen pen(c,w); pen.SetAlignment(PenAlignmentCenter); g.DrawPath(&pen,p); delete p; }

enum { ALIGN_L=0, ALIGN_C=1, ALIGN_R=2 };

inline void text(Graphics& g, const std::wstring& s, RectF r, float size, Color c,
                 int align=ALIGN_L, int style=FontStyleRegular, bool mono=false, bool vcenter=true){
    Font* f = mono? moFont(size,style) : uiFont(size,style);
    StringFormat fmt;
    fmt.SetAlignment(align==ALIGN_C?StringAlignmentCenter:align==ALIGN_R?StringAlignmentFar:StringAlignmentNear);
    fmt.SetLineAlignment(vcenter?StringAlignmentCenter:StringAlignmentNear);
    fmt.SetTrimming(StringTrimmingEllipsisCharacter);
    fmt.SetFormatFlags(StringFormatFlagsNoWrap);
    SolidBrush b(c);
    g.DrawString(s.c_str(),-1,f,r,&fmt,&b);
    delete f;
}
inline float measure(Graphics& g, const std::wstring& s, float size, int style=FontStyleRegular, bool mono=false){
    Font* f = mono? moFont(size,style) : uiFont(size,style);
    RectF m; g.MeasureString(s.c_str(),-1,f,PointF(0,0),&m); delete f; return m.Width;
}

// letter-spaced caps label (for section headers / meta) — a clean "tool" detail
inline void caps(Graphics& g, const std::wstring& s, float x, float y, float size, Color c, float track=2.0f, bool mono=false){
    float cx=x;
    for(wchar_t ch:s){
        std::wstring one(1,ch);
        text(g, one, RectF(cx,y,40,size+6), size, c, ALIGN_L, FontStyleBold, mono, false);
        cx += measure(g,one,size,FontStyleBold,mono)+track;
    }
}
inline float capsWidth(Graphics& g, const std::wstring& s, float size, float track=2.0f, bool mono=false){
    float w=0; for(wchar_t ch:s){ std::wstring one(1,ch); w+=measure(g,one,size,FontStyleBold,mono)+track; } return w>0?w-track:0;
}

// ---------------------------------------------------------------------------
// Surfaces.
// ---------------------------------------------------------------------------
inline void panel(Graphics& g, RectF r, float rad=10.f, Color fill=Color(0,0,0,0), Color line=Color(0,0,0,0)){
    if(fill.GetA()==0) fill=COL_PANEL();
    if(line.GetA()==0) line=COL_LINE();
    // tight, low drop shadow
    for(int i=6;i>=1;--i){ float f=(float)i; int a=(int)(16*(1.0f-i/7.0f));
        fillRound(g, RectF(r.X-f*0.5f, r.Y+2+f*0.6f, r.Width+f, r.Height+f*0.5f), rad+f*0.5f, Color(a,0,0,0)); }
    fillRound(g, r, rad, fill);
    // 1px top inner highlight for a crisp edge
    { GraphicsPath* p=roundRect(RectF(r.X+1,r.Y+1,r.Width-2,r.Height-2),rad); Pen pen(Color(10,255,255,255),1.f); g.DrawPath(&pen,p); delete p; }
    strokeRound(g, r, rad, line, 1.f);
}

// a thin accent bar down the left edge of a row/card (clipped to its rounding)
inline void accentTab(Graphics& g, RectF r, float rad, Color c, float w=3.5f){
    GraphicsPath* clip=roundRect(r,rad); Region reg(clip); g.SetClip(&reg);
    SolidBrush b(c); g.FillRectangle(&b, RectF(r.X, r.Y, w, r.Height));
    g.ResetClip(); delete clip;
}

// Back-compat alias used by older call sites (now a solid panel).
inline void glassPanel(Graphics& g, RectF r, float rad=10.f, int a=0, bool sheen=true){
    panel(g, r, rad);
}

// ---------------------------------------------------------------------------
// Static background: flat base + faint dot grid + corner vignette. Cached.
// ---------------------------------------------------------------------------
inline void paintBackground(App& a, Graphics& g){
    SolidBrush bg(COL_BG()); g.FillRectangle(&bg, RectF(0,0,(float)a.W,(float)a.H));
    // header strip
    SolidBrush hs(COL_BG2()); g.FillRectangle(&hs, RectF(0,0,(float)a.W,56));
    { Pen pen(COL_LINE(),1.f); g.DrawLine(&pen, 0.f,56.f,(float)a.W,56.f); }
    // faint dot grid
    SolidBrush dot(Color(10,255,255,255));
    for(int y=76; y<a.H; y+=26)
        for(int x=16; x<a.W; x+=26)
            g.FillRectangle(&dot, RectF((float)x,(float)y,1.3f,1.3f));
    // subtle corner vignette (neutral, no color)
    for(int i=0;i<60;i+=2){ int al=(int)(0.9*(60-i)); if(al<1)continue;
        Pen pen(Color(al,0,0,0),2.f);
        g.DrawRectangle(&pen, RectF((float)(-i),(float)(-i),(float)(a.W+2*i),(float)(a.H+2*i))); }
}
inline void drawBackground(App& a, Graphics& g){
    if(!a.bgCache || a.bgCache->GetWidth()!=(UINT)a.W || a.bgCache->GetHeight()!=(UINT)a.H){
        if(a.bgCache) delete a.bgCache;
        a.bgCache = new Bitmap(a.W, a.H, PixelFormat32bppPARGB);
        Graphics bg(a.bgCache); bg.SetSmoothingMode(SmoothingModeAntiAlias);
        paintBackground(a, bg);
    }
    g.DrawImage(a.bgCache, 0, 0);
}

// ---------------------------------------------------------------------------
// Title bar.
// ---------------------------------------------------------------------------
inline void layoutChrome(App& a){
    for(size_t i=0;i<a.buttons.size();){
        if(a.buttons[i].id==-900||a.buttons[i].id==-901) a.buttons.erase(a.buttons.begin()+i); else ++i; }
    Button c; c.id=-900; c.style=2; c.text=L"✕"; c.r=RectF((float)a.W-42,14,30,28); a.buttons.push_back(c);
    Button m; m.id=-901; m.style=2; m.text=L"–"; m.r=RectF((float)a.W-78,14,30,28); a.buttons.push_back(m);
}
inline void drawChrome(App& a, Graphics& g){
    // glyph mark: accent-outlined square with mono "RL"
    RectF mk(20,16,26,24);
    fillRound(g, mk, 5, COL_PANEL_HI());
    strokeRound(g, mk, 5, withA(COL_ACCENT(),180), 1.2f);
    text(g, L"RL", mk, 11.5f, COL_ACCENT(), ALIGN_C, FontStyleBold, true);
    // name + mono subtitle
    text(g, a.appName, RectF(56,15,420,26), 14, COL_TEXT(), ALIGN_L, FontStyleBold);
    float nw = measure(g, a.appName, 14, FontStyleBold);
    if(!a.appTag.empty()){
        float px=56+nw+14;
        text(g, L"//", RectF(px,15,20,26), 12.5f, withA(COL_ACCENT(),200), ALIGN_L, FontStyleBold, true);
        text(g, a.appTag, RectF(px+20,15,360,26), 12, COL_MUTED(), ALIGN_L, FontStyleRegular, true);
    }
}

// ---------------------------------------------------------------------------
// Widgets.
// ---------------------------------------------------------------------------
inline void drawButton(Graphics& g, Button& b){
    float rad = 8.f;
    int a = b.enabled?255:70;
    if(b.style==2){ // chrome glyph
        if(b.hv>0.01f) fillRound(g, b.r, 6, Color((int)(26*b.hv),255,255,255));
        text(g, b.text, b.r, 13, mix(COL_MUTED(),COL_TEXT(),b.hv), ALIGN_C, FontStyleRegular);
        return;
    }
    if(b.style==0){ // primary — solid accent, dark label
        Color fill = mix(COL_ACCENT(), Color(255,255,196,110), b.hv*0.5f);
        fillRound(g, b.r, rad, withA(fill,a));
        // 1px bottom shade
        fillRound(g, RectF(b.r.X,b.r.Y+b.r.Height-2,b.r.Width,2), rad, Color(40,0,0,0));
        text(g, b.text, b.r, 13.5f, withA(COL_ACCENT_DK(),a), ALIGN_C, FontStyleBold);
    } else if(b.style==3){ // danger ghost
        fillRound(g, b.r, rad, Color((int)(30+26*b.hv),229,72,77));
        strokeRound(g, b.r, rad, withA(COL_BAD(),150), 1.2f);
        text(g, b.text, b.r, 13, COL_BAD(), ALIGN_C, FontStyleBold);
    } else { // ghost
        fillRound(g, b.r, rad, b.hv>0.01f? Color((int)(22*b.hv),255,255,255) : COL_PANEL());
        strokeRound(g, b.r, rad, mix(COL_LINE(),COL_LINE_HI(),b.hv), 1.f);
        text(g, b.text, b.r, 13, mix(COL_MUTED(),COL_TEXT(),b.hv), ALIGN_C, FontStyleBold);
    }
}

inline void drawField(App& a, Graphics& g, Field& fd){
    if(!fd.label.empty())
        caps(g, fd.label, fd.r.X+2, fd.r.Y-20, 10.5f, fd.focused?withA(COL_ACCENT(),235):COL_FAINT(), 1.6f);
    fillRound(g, fd.r, 8, COL_INSET());
    strokeRound(g, fd.r, 8, fd.focused?withA(COL_ACCENT(),210):(fd.hover?COL_LINE_HI():COL_LINE()), fd.focused?1.5f:1.f);
    std::wstring shown = fd.password? std::wstring(fd.text.size(),L'•') : fd.text;
    RectF tr(fd.r.X+14, fd.r.Y, fd.r.Width-28, fd.r.Height);
    if(fd.text.empty() && !fd.focused){
        text(g, fd.placeholder, tr, 13, COL_FAINT(), ALIGN_L, FontStyleRegular, fd.mono);
    } else {
        text(g, shown, tr, 13.5f, COL_TEXT(), ALIGN_L, FontStyleRegular, fd.mono);
        if(fd.focused && fmod(a.t,1.0)<0.5){
            float w=measure(g,shown,13.5f,FontStyleRegular,fd.mono);
            Pen pen(COL_ACCENT(),1.6f);
            g.DrawLine(&pen, fd.r.X+14+w+1, fd.r.Y+11, fd.r.X+14+w+1, fd.r.Y+fd.r.Height-11);
        }
    }
}

// ---------------------------------------------------------------------------
// Frame render.
// ---------------------------------------------------------------------------
inline void render(App& a, HDC hdc){
    HDC mem=CreateCompatibleDC(hdc);
    HBITMAP bmp=CreateCompatibleBitmap(hdc,a.W,a.H);
    HBITMAP old=(HBITMAP)SelectObject(mem,bmp);
    Graphics g(mem);
    g.SetSmoothingMode(SmoothingModeAntiAlias);
    g.SetTextRenderingHint(TextRenderingHintClearTypeGridFit);
    g.SetPixelOffsetMode(PixelOffsetModeHalf);
    drawBackground(a,g);
    drawChrome(a,g);
    if(a.onContent) a.onContent(a,g);
    for(auto& f:a.fields)  drawField(a,g,f);
    for(auto& b:a.buttons) drawButton(g,b);
    BitBlt(hdc,0,0,a.W,a.H,mem,0,0,SRCCOPY);
    SelectObject(mem,old); DeleteObject(bmp); DeleteDC(mem);
}

inline bool inRect(RectF r, POINT p){ return p.x>=r.X&&p.x<=r.X+r.Width&&p.y>=r.Y&&p.y<=r.Y+r.Height; }

inline LRESULT CALLBACK WndProc(HWND h, UINT m, WPARAM w, LPARAM l){
    App* a=g();
    switch(m){
    case WM_ERASEBKGND: return 1;
    case WM_PAINT:{ PAINTSTRUCT ps; HDC hdc=BeginPaint(h,&ps); if(a) render(*a,hdc); EndPaint(h,&ps); return 0; }
    case WM_TIMER:{ if(a){ a->t+=0.045; for(auto&b:a->buttons){ float tg=b.hover?1.f:0.f; b.hv+=(tg-b.hv)*0.3f; } a->invalidate(); } return 0; }
    case WM_MOUSEMOVE:{ if(!a)break; a->mouse.x=GET_X_LPARAM(l); a->mouse.y=GET_Y_LPARAM(l);
        for(auto&b:a->buttons) b.hover=b.enabled&&inRect(b.r,a->mouse);
        for(auto&f:a->fields)  f.hover=inRect(f.r,a->mouse); return 0; }
    case WM_LBUTTONDOWN:{ if(!a)break; POINT p{GET_X_LPARAM(l),GET_Y_LPARAM(l)}; a->mouseDown=true;
        bool hitField=false;
        for(auto&f:a->fields) f.focused=false;
        for(auto&f:a->fields) if(inRect(f.r,p)){ f.focused=true; hitField=true; }
        for(auto&b:a->buttons) if(b.enabled&&inRect(b.r,p)) b.down=true;
        if(!hitField){ bool onW=false; for(auto&b:a->buttons) if(inRect(b.r,p))onW=true;
            if(!onW && p.y<56){ ReleaseCapture(); SendMessage(h,WM_NCLBUTTONDOWN,HTCAPTION,0); } }
        a->invalidate(); return 0; }
    case WM_LBUTTONUP:{ if(!a)break; POINT p{GET_X_LPARAM(l),GET_Y_LPARAM(l)}; a->mouseDown=false;
        for(auto&b:a->buttons){ if(b.down&&b.enabled&&inRect(b.r,p)){ b.down=false;
            if(b.id==-900){ PostMessage(h,WM_CLOSE,0,0); return 0; }
            if(b.id==-901){ ShowWindow(h,SW_MINIMIZE); return 0; }
            if(a->onButton) a->onButton(*a,b.id); } b.down=false; }
        a->invalidate(); return 0; }
    case WM_CHAR:{ if(!a)break; Field* fd=a->focusedField();
        if(fd){ wchar_t c=(wchar_t)w;
            if(c==L'\b'){ if(!fd->text.empty()) fd->text.pop_back(); }
            else if(c==L'\r'){ if(a->onSubmit) a->onSubmit(*a); }
            else if(c==L'\t'){ for(size_t i=0;i<a->fields.size();++i) if(&a->fields[i]==fd){
                a->fields[i].focused=false; a->fields[(i+1)%a->fields.size()].focused=true; break; } }
            else if(c>=32 && fd->text.size()<fd->maxlen) fd->text.push_back(c);
            a->invalidate(); } return 0; }
    case WM_KEYDOWN:{ if(w==VK_ESCAPE) PostMessage(h,WM_CLOSE,0,0); return 0; }
    case WM_DESTROY: PostQuitMessage(0); return 0;
    }
    return DefWindowProc(h,m,w,l);
}

inline void modernFrame(HWND h){
    BOOL dark=TRUE; DwmSetWindowAttribute(h,20,&dark,sizeof(dark));
    int pref=2; DwmSetWindowAttribute(h,33,&pref,sizeof(pref));
    MARGINS mg{1,1,1,1}; DwmExtendFrameIntoClientArea(h,&mg);
}

inline int run(App& a, HINSTANCE hInst){
    g()=&a; SetProcessDPIAware();
    GdiplusStartupInput gsi; GdiplusStartup(&a.gdip,&gsi,nullptr);
    WNDCLASSEX wc{}; wc.cbSize=sizeof(wc); wc.lpfnWndProc=WndProc; wc.hInstance=hInst;
    wc.hCursor=LoadCursor(nullptr,IDC_ARROW); wc.lpszClassName=L"ReverserWorkbench"; wc.hbrBackground=nullptr;
    RegisterClassEx(&wc);
    int sw=GetSystemMetrics(SM_CXSCREEN), sh=GetSystemMetrics(SM_CYSCREEN);
    int x=(sw-a.W)/2, y=(sh-a.H)/2; if(y<0)y=0;
    a.hwnd=CreateWindowEx(WS_EX_APPWINDOW, wc.lpszClassName, a.winTitle.c_str(), WS_POPUP, x,y,a.W,a.H,nullptr,nullptr,hInst,nullptr);
    modernFrame(a.hwnd); layoutChrome(a);
    ShowWindow(a.hwnd,SW_SHOW); UpdateWindow(a.hwnd);
    SetTimer(a.hwnd,1,45,nullptr);
    MSG msg; while(GetMessage(&msg,nullptr,0,0)){ TranslateMessage(&msg); DispatchMessage(&msg); }
    GdiplusShutdown(a.gdip);
    return (int)msg.wParam;
}

// --- compatibility shims for existing call sites -------------------------------
inline void drawText(Graphics& g, const std::wstring& s, RectF r, float size, Color c,
                     int align=ALIGN_L, int style=FontStyleRegular, bool vcenter=true){
    text(g,s,r,size,c,align,style,false,vcenter);
}
inline void drawTextGrad(Graphics& g, const std::wstring& s, RectF r, float size,
                         Color a, Color b, int align=ALIGN_L, int style=FontStyleRegular){
    text(g,s,r,size,COL_TEXT(),align,style,false,true);
}
inline float measureW(Graphics& g, const std::wstring& s, float size, int style=FontStyleRegular){
    return measure(g,s,size,style,false);
}

} // namespace gk
