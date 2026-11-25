// glasskit.h — minimal "liquid glass" UI toolkit for Win32 + GDI+
// Header-only. Each challenge/launcher .cpp includes this once and builds as its own EXE.
// Pure presentation layer: animated aurora gradient background, frosted glass panels,
// custom-drawn buttons and a custom text-input widget. No standard controls, so the
// whole surface looks consistent and modern.
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

// ---------------------------------------------------------------------------
// Palette (ARGB). Deep indigo night + violet/cyan/pink aurora + frosted white.
// ---------------------------------------------------------------------------
namespace gk {

inline Color COL_BG_TOP()      { return Color(255, 10, 13, 28);  }  // #0A0D1C
inline Color COL_BG_BOT()      { return Color(255, 17, 20, 44);  }  // #11142C
inline Color COL_TEXT()        { return Color(255, 234, 236, 245);} // #EAECF5
inline Color COL_MUTED()       { return Color(255, 150, 160, 196);} // #96A0C4
inline Color COL_FAINT()       { return Color(255, 105, 114, 150);}
inline Color COL_ACCENT_A()    { return Color(255, 124, 92, 255); } // violet #7C5CFF
inline Color COL_ACCENT_B()    { return Color(255, 34, 211, 238); } // cyan   #22D3EE
inline Color COL_PINK()        { return Color(255, 244, 114, 182);} // #F472B6
inline Color COL_OK()          { return Color(255, 52, 211, 153); } // #34D399
inline Color COL_BAD()         { return Color(255, 248, 113, 113);} // #F87171
inline Color COL_WARN()        { return Color(255, 251, 191, 36); } // #FBBF24

inline Color withA(Color c, int a){ return Color(a, c.GetR(), c.GetG(), c.GetB()); }

// ---------------------------------------------------------------------------
// Forward decl of app state; widgets reference it.
// ---------------------------------------------------------------------------
struct App;

struct Button {
    RectF  r;
    std::wstring text;
    int    id = 0;
    int    style = 0;       // 0 = primary(gradient), 1 = ghost/glass, 2 = subtle text, 3 = danger
    bool   hover = false, down = false, enabled = true;
    float  glow = 0.f;      // animated hover glow 0..1
};

struct Field {
    RectF  r;
    std::wstring text;
    std::wstring placeholder;
    std::wstring label;
    bool   focused = false, hover = false, password = false;
    size_t maxlen = 64;
    float  caret = 0.f;     // caret blink phase
};

// ---------------------------------------------------------------------------
// App: owns window, GDI+ token, widget lists, animation clock and callbacks.
// A single global pointer lets the static WndProc reach it.
// ---------------------------------------------------------------------------
struct App {
    HWND  hwnd = nullptr;
    ULONG_PTR gdip = 0;
    int   W = 1040, H = 680;
    double t = 0.0;              // seconds since start (animation clock)
    POINT mouse{ -1,-1 };
    bool  mouseDown = false;

    std::wstring winTitle = L"ReverseLab";
    std::wstring appName   = L"ReverseLab";
    std::wstring appTag    = L"";

    std::vector<Button> buttons;
    std::vector<Field>  fields;

    // callbacks set by the concrete app
    std::function<void(App&, Graphics&)> onContent;   // draw cards / headings above widgets
    std::function<void(App&, int id)>    onButton;    // button clicked (by id)
    std::function<void(App&)>            onSubmit;     // Enter pressed in a focused field

    // helpers to query widgets
    Field* focusedField(){ for(auto&f:fields) if(f.focused) return &f; return nullptr; }

    void invalidate(){ if(hwnd) InvalidateRect(hwnd, nullptr, FALSE); }
};

inline App*& g(){ static App* p=nullptr; return p; }  // active app pointer

// ---------------------------------------------------------------------------
// Font cache.
// ---------------------------------------------------------------------------
inline Font* fontOf(float size, int style=FontStyleRegular){
    static FontFamily* fam = nullptr;
    if(!fam){
        fam = new FontFamily(L"Segoe UI");
        if(!fam->IsAvailable()){ delete fam; fam = new FontFamily(L"Arial"); }
    }
    return new Font(fam, size, style, UnitPixel);
}

// ---------------------------------------------------------------------------
// Drawing helpers.
// ---------------------------------------------------------------------------
// forward declarations for helpers referenced before their definitions
inline float measureW(Graphics& gfx, const std::wstring& s, float size, int style);

inline GraphicsPath* roundRect(RectF r, float rad){
    GraphicsPath* p = new GraphicsPath();
    float d = rad*2;
    p->AddArc(r.X,             r.Y,             d, d, 180, 90);
    p->AddArc(r.X+r.Width-d,   r.Y,             d, d, 270, 90);
    p->AddArc(r.X+r.Width-d,   r.Y+r.Height-d,  d, d, 0,   90);
    p->AddArc(r.X,             r.Y+r.Height-d,  d, d, 90,  90);
    p->CloseFigure();
    return p;
}

inline void fillRound(Graphics& gfx, RectF r, float rad, Color c){
    GraphicsPath* p = roundRect(r, rad);
    SolidBrush b(c); gfx.FillPath(&b, p); delete p;
}

inline void strokeRound(Graphics& gfx, RectF r, float rad, Color c, float w=1.f){
    GraphicsPath* p = roundRect(r, rad);
    Pen pen(c, w); gfx.DrawPath(&pen, p); delete p;
}

// Soft drop shadow: several expanding, fading rounded rects behind the panel.
inline void softShadow(Graphics& gfx, RectF r, float rad, int spread=18, int alpha=60){
    for(int i=spread; i>=1; --i){
        float f = (float)i;
        RectF rr(r.X-f, r.Y-f*0.5f + 6, r.Width+f*2, r.Height+f*2);
        int a = (int)(alpha * (1.0f - (float)i/spread) / 2.2f);
        if(a<1) continue;
        fillRound(gfx, rr, rad+f, Color(a, 0,0,0));
    }
}

// Frosted glass panel: shadow + translucent white fill + top sheen + hairline border.
inline void glassPanel(Graphics& gfx, RectF r, float rad=18.f, int baseAlpha=20, bool sheen=true){
    softShadow(gfx, r, rad, 20, 90);
    fillRound(gfx, r, rad, Color(baseAlpha, 255,255,255));
    if(sheen){
        // vertical sheen highlight at the top third
        GraphicsPath* p = roundRect(r, rad);
        LinearGradientBrush lg(PointF(r.X, r.Y), PointF(r.X, r.Y + r.Height*0.6f),
                               Color(42,255,255,255), Color(0,255,255,255));
        Region reg(p);
        gfx.SetClip(&reg);
        gfx.FillRectangle(&lg, r);
        gfx.ResetClip();
        delete p;
    }
    strokeRound(gfx, r, rad, Color(46, 255,255,255), 1.2f);
    // subtle inner-bottom shade for depth
    strokeRound(gfx, RectF(r.X+1,r.Y+1,r.Width-2,r.Height-2), rad, Color(26, 0,0,0), 1.0f);
}

enum { ALIGN_L=0, ALIGN_C=1, ALIGN_R=2 };

inline void drawText(Graphics& gfx, const std::wstring& s, RectF r, float size,
                     Color c, int align=ALIGN_L, int style=FontStyleRegular,
                     bool vcenter=true){
    Font* f = fontOf(size, style);
    StringFormat fmt;
    fmt.SetAlignment(align==ALIGN_C?StringAlignmentCenter:align==ALIGN_R?StringAlignmentFar:StringAlignmentNear);
    fmt.SetLineAlignment(vcenter?StringAlignmentCenter:StringAlignmentNear);
    fmt.SetTrimming(StringTrimmingEllipsisCharacter);
    SolidBrush b(c);
    gfx.DrawString(s.c_str(), -1, f, r, &fmt, &b);
    delete f;
}

inline void drawTextGrad(Graphics& gfx, const std::wstring& s, RectF r, float size,
                         Color a, Color b, int align=ALIGN_L, int style=FontStyleRegular){
    Font* f = fontOf(size, style);
    StringFormat fmt;
    fmt.SetAlignment(align==ALIGN_C?StringAlignmentCenter:align==ALIGN_R?StringAlignmentFar:StringAlignmentNear);
    fmt.SetLineAlignment(StringAlignmentCenter);
    LinearGradientBrush lg(PointF(r.X, r.Y), PointF(r.X+r.Width, r.Y), a, b);
    gfx.DrawString(s.c_str(), -1, f, r, &fmt, &lg);
    delete f;
}

// Radial aurora blob using a path gradient.
inline void auroraBlob(Graphics& gfx, float cx, float cy, float rad, Color c, int centerAlpha){
    GraphicsPath p;
    p.AddEllipse(cx-rad, cy-rad, rad*2, rad*2);
    PathGradientBrush pg(&p);
    pg.SetCenterPoint(PointF(cx, cy));
    Color center = withA(c, centerAlpha);
    pg.SetCenterColor(center);
    Color edge = withA(c, 0);
    int cnt = 1;
    pg.SetSurroundColors(&edge, &cnt);
    gfx.FillPath(&pg, &p);
}

// ---------------------------------------------------------------------------
// Background: vertical gradient + slowly drifting aurora blobs + faint grain dots.
// ---------------------------------------------------------------------------
inline void drawBackground(App& a, Graphics& gfx){
    RectF full(0,0,(float)a.W,(float)a.H);
    LinearGradientBrush bg(PointF(0,0), PointF(0,(float)a.H), COL_BG_TOP(), COL_BG_BOT());
    gfx.FillRectangle(&bg, full);

    double t = a.t;
    gfx.SetSmoothingMode(SmoothingModeAntiAlias);
    auroraBlob(gfx, a.W*0.22f + (float)sin(t*0.25)*60, a.H*0.18f + (float)cos(t*0.21)*40,
               360, COL_ACCENT_A(), 70);
    auroraBlob(gfx, a.W*0.82f + (float)cos(t*0.19)*70, a.H*0.30f + (float)sin(t*0.23)*50,
               420, COL_ACCENT_B(), 48);
    auroraBlob(gfx, a.W*0.60f + (float)sin(t*0.16+1.5)*80, a.H*0.92f + (float)cos(t*0.18)*40,
               460, COL_PINK(), 40);
    auroraBlob(gfx, a.W*0.08f + (float)cos(t*0.14)*50, a.H*0.85f + (float)sin(t*0.2)*40,
               300, COL_ACCENT_A(), 34);

    // very subtle top vignette for contrast behind the title bar
    LinearGradientBrush vg(PointF(0,0), PointF(0,120), Color(70,0,0,0), Color(0,0,0,0));
    gfx.FillRectangle(&vg, RectF(0,0,(float)a.W,120));
}

// ---------------------------------------------------------------------------
// Title bar: app name + tag pill + minimize + close. Returns nothing; buttons
// with ids -901 (min) and -900 (close) handle the clicks.
// ---------------------------------------------------------------------------
inline void layoutChrome(App& a){
    // remove any existing chrome buttons then re-add (keeps ids stable)
    for(size_t i=0;i<a.buttons.size();){
        if(a.buttons[i].id==-900||a.buttons[i].id==-901) a.buttons.erase(a.buttons.begin()+i);
        else ++i;
    }
    Button close; close.id=-900; close.style=2; close.text=L"✕";
    close.r=RectF((float)a.W-46, 14, 32, 28); a.buttons.push_back(close);
    Button mini;  mini.id=-901; mini.style=2; mini.text=L"–";
    mini.r=RectF((float)a.W-84, 14, 32, 28); a.buttons.push_back(mini);
}

inline void drawChrome(App& a, Graphics& gfx){
    // brand mark: small gradient rounded square + name
    RectF logo(28, 18, 22, 22);
    GraphicsPath* lp = roundRect(logo, 7);
    LinearGradientBrush lg(PointF(logo.X,logo.Y), PointF(logo.X+logo.Width,logo.Y+logo.Height),
                           COL_ACCENT_A(), COL_ACCENT_B());
    gfx.FillPath(&lg, lp); delete lp;
    drawText(gfx, L"◈", logo, 13, Color(255,255,255,255), ALIGN_C, FontStyleBold);

    drawText(gfx, a.appName, RectF(60, 16, 360, 26), 14.5f, COL_TEXT(), ALIGN_L, FontStyleBold);
    if(!a.appTag.empty()){
        Font* f = fontOf(10.5f, FontStyleBold);
        RectF m; gfx.MeasureString(a.appTag.c_str(),-1,f,PointF(0,0),&m);
        delete f;
        RectF pill(60 + 10 + measureW(gfx,a.appName,14.5f,FontStyleBold), 19, m.Width+20, 20);
        fillRound(gfx, pill, 10, withA(COL_ACCENT_A(),40));
        strokeRound(gfx, pill, 10, withA(COL_ACCENT_A(),120), 1.f);
        drawText(gfx, a.appTag, pill, 10.5f, withA(COL_ACCENT_B(),255), ALIGN_C, FontStyleBold);
    }
}

inline float measureW(Graphics& gfx, const std::wstring& s, float size, int style=FontStyleRegular){
    Font* f = fontOf(size, style);
    RectF m; gfx.MeasureString(s.c_str(),-1,f,PointF(0,0),&m);
    delete f; return m.Width;
}

// ---------------------------------------------------------------------------
// Widget rendering.
// ---------------------------------------------------------------------------
inline void drawButton(Graphics& gfx, Button& b){
    float rad = b.r.Height*0.5f > 22 ? 14.f : b.r.Height*0.42f;
    int a = b.enabled ? 255 : 90;
    if(b.style==2){ // chrome / subtle
        if(b.hover) fillRound(gfx, b.r, 8, Color(40,255,255,255));
        drawText(gfx, b.text, b.r, 13, b.hover?COL_TEXT():COL_MUTED(), ALIGN_C);
        return;
    }
    // hover glow halo
    if(b.glow>0.01f && b.enabled){
        Color gc = b.style==3 ? COL_BAD() : COL_ACCENT_A();
        for(int i=10;i>=1;--i){
            float f=(float)i;
            int al=(int)(55*b.glow*(1.0f-i/10.f));
            fillRound(gfx, RectF(b.r.X-f,b.r.Y-f,b.r.Width+f*2,b.r.Height+f*2), rad+f, withA(gc,al));
        }
    }
    if(b.style==0){ // primary gradient
        GraphicsPath* p = roundRect(b.r, rad);
        LinearGradientBrush lg(PointF(b.r.X,b.r.Y), PointF(b.r.X+b.r.Width,b.r.Y),
                               withA(COL_ACCENT_A(),a), withA(COL_ACCENT_B(),a));
        gfx.FillPath(&lg, p); delete p;
        // top sheen
        GraphicsPath* p2 = roundRect(RectF(b.r.X,b.r.Y,b.r.Width,b.r.Height*0.5f), rad);
        LinearGradientBrush sg(PointF(b.r.X,b.r.Y),PointF(b.r.X,b.r.Y+b.r.Height*0.5f),
                               Color(70,255,255,255), Color(0,255,255,255));
        gfx.FillPath(&sg, p2); delete p2;
        drawText(gfx, b.text, b.r, 13.5f, withA(Color(255,255,255,255),a), ALIGN_C, FontStyleBold);
    } else if(b.style==3){ // danger ghost
        fillRound(gfx, b.r, rad, withA(COL_BAD(), b.hover?42:24));
        strokeRound(gfx, b.r, rad, withA(COL_BAD(),150), 1.2f);
        drawText(gfx, b.text, b.r, 13.5f, COL_BAD(), ALIGN_C, FontStyleBold);
    } else { // ghost glass
        fillRound(gfx, b.r, rad, Color(b.hover?34:20,255,255,255));
        strokeRound(gfx, b.r, rad, Color(b.hover?90:50,255,255,255), 1.2f);
        drawText(gfx, b.text, b.r, 13.5f, withA(COL_TEXT(),a), ALIGN_C, FontStyleBold);
    }
}

inline void drawField(App& a, Graphics& gfx, Field& fd){
    if(!fd.label.empty())
        drawText(gfx, fd.label, RectF(fd.r.X+2, fd.r.Y-22, fd.r.Width, 18), 11.5f,
                 COL_MUTED(), ALIGN_L, FontStyleBold);
    Color border = fd.focused ? withA(COL_ACCENT_B(),200) : (fd.hover?Color(90,255,255,255):Color(55,255,255,255));
    fillRound(gfx, fd.r, 12, Color(fd.focused?26:16, 10,14,30));
    if(fd.focused){
        for(int i=6;i>=1;--i){ float f=(float)i; int al=(int)(40*(1.0f-i/6.f));
            strokeRound(gfx, RectF(fd.r.X-f,fd.r.Y-f,fd.r.Width+f*2,fd.r.Height+f*2),12+f, withA(COL_ACCENT_B(),al),1.f);}
    }
    strokeRound(gfx, fd.r, 12, border, 1.4f);

    std::wstring shown = fd.password ? std::wstring(fd.text.size(), L'•') : fd.text;
    RectF tr(fd.r.X+16, fd.r.Y, fd.r.Width-32, fd.r.Height);
    if(fd.text.empty() && !fd.focused){
        drawText(gfx, fd.placeholder, tr, 13, COL_FAINT(), ALIGN_L);
    } else {
        drawText(gfx, shown, tr, 13.5f, COL_TEXT(), ALIGN_L);
        if(fd.focused && fmod(a.t,1.0)<0.5){
            float w = measureW(gfx, shown, 13.5f);
            float cx = fd.r.X+16+w+1;
            Pen pen(COL_ACCENT_B(), 1.6f);
            gfx.DrawLine(&pen, cx, fd.r.Y+12, cx, fd.r.Y+fd.r.Height-12);
        }
    }
}

// ---------------------------------------------------------------------------
// Full frame render.
// ---------------------------------------------------------------------------
inline void render(App& a, HDC hdc){
    // double buffer
    HDC mem = CreateCompatibleDC(hdc);
    HBITMAP bmp = CreateCompatibleBitmap(hdc, a.W, a.H);
    HBITMAP old = (HBITMAP)SelectObject(mem, bmp);

    Graphics gfx(mem);
    gfx.SetSmoothingMode(SmoothingModeAntiAlias);
    gfx.SetTextRenderingHint(TextRenderingHintClearTypeGridFit);
    gfx.SetPixelOffsetMode(PixelOffsetModeHalf);

    drawBackground(a, gfx);
    drawChrome(a, gfx);
    if(a.onContent) a.onContent(a, gfx);
    for(auto& fd : a.fields)  drawField(a, gfx, fd);
    for(auto& b  : a.buttons) drawButton(gfx, b);

    BitBlt(hdc, 0,0,a.W,a.H, mem, 0,0, SRCCOPY);
    SelectObject(mem, old);
    DeleteObject(bmp);
    DeleteDC(mem);
}

// ---------------------------------------------------------------------------
// Hit testing + input.
// ---------------------------------------------------------------------------
inline bool inRect(RectF r, POINT p){
    return p.x>=r.X && p.x<=r.X+r.Width && p.y>=r.Y && p.y<=r.Y+r.Height;
}

inline LRESULT CALLBACK WndProc(HWND h, UINT m, WPARAM w, LPARAM l){
    App* a = g();
    switch(m){
    case WM_ERASEBKGND: return 1;
    case WM_PAINT: {
        PAINTSTRUCT ps; HDC hdc = BeginPaint(h,&ps);
        if(a) render(*a, hdc);
        EndPaint(h,&ps);
        return 0;
    }
    case WM_TIMER: {
        if(a){
            a->t += 0.033;
            // animate button glow toward hover target
            for(auto& b:a->buttons){ float tgt=b.hover?1.f:0.f; b.glow += (tgt-b.glow)*0.25f; }
            a->invalidate();
        }
        return 0;
    }
    case WM_MOUSEMOVE: {
        if(!a) break;
        a->mouse.x=GET_X_LPARAM(l); a->mouse.y=GET_Y_LPARAM(l);
        for(auto& b:a->buttons) b.hover = b.enabled && inRect(b.r, a->mouse);
        for(auto& fd:a->fields)  fd.hover = inRect(fd.r, a->mouse);
        return 0;
    }
    case WM_LBUTTONDOWN: {
        if(!a) break;
        POINT p{ GET_X_LPARAM(l), GET_Y_LPARAM(l) };
        a->mouseDown=true;
        for(auto& fd:a->fields) fd.focused=false;
        bool hitField=false;
        for(auto& fd:a->fields) if(inRect(fd.r,p)){ fd.focused=true; hitField=true; }
        for(auto& b:a->buttons) if(b.enabled && inRect(b.r,p)){ b.down=true; }
        if(!hitField){
            // check buttons on release instead; here just allow window drag on empty top bar
            bool onWidget=false;
            for(auto& b:a->buttons) if(inRect(b.r,p)) onWidget=true;
            for(auto& fd:a->fields) if(inRect(fd.r,p)) onWidget=true;
            if(!onWidget && p.y < 56){
                ReleaseCapture();
                SendMessage(h, WM_NCLBUTTONDOWN, HTCAPTION, 0);
            }
        }
        a->invalidate();
        return 0;
    }
    case WM_LBUTTONUP: {
        if(!a) break;
        POINT p{ GET_X_LPARAM(l), GET_Y_LPARAM(l) };
        a->mouseDown=false;
        for(auto& b:a->buttons){
            if(b.down && b.enabled && inRect(b.r,p)){
                b.down=false;
                if(b.id==-900){ PostMessage(h, WM_CLOSE, 0,0); return 0; }
                if(b.id==-901){ ShowWindow(h, SW_MINIMIZE); return 0; }
                if(a->onButton) a->onButton(*a, b.id);
            }
            b.down=false;
        }
        a->invalidate();
        return 0;
    }
    case WM_CHAR: {
        if(!a) break;
        Field* fd=a->focusedField();
        if(fd){
            wchar_t c=(wchar_t)w;
            if(c==L'\b'){ if(!fd->text.empty()) fd->text.pop_back(); }
            else if(c==L'\r'){ if(a->onSubmit) a->onSubmit(*a); }
            else if(c==L'\t'){ /* move focus */
                for(size_t i=0;i<a->fields.size();++i) if(&a->fields[i]==fd){
                    a->fields[i].focused=false;
                    a->fields[(i+1)%a->fields.size()].focused=true; break; }
            }
            else if(c>=32 && fd->text.size()<fd->maxlen){ fd->text.push_back(c); }
            a->invalidate();
        }
        return 0;
    }
    case WM_KEYDOWN: {
        if(w==VK_ESCAPE){ PostMessage(h, WM_CLOSE, 0,0); }
        return 0;
    }
    case WM_DESTROY: PostQuitMessage(0); return 0;
    }
    return DefWindowProc(h,m,w,l);
}

// ---------------------------------------------------------------------------
// App bootstrap + message loop.
// ---------------------------------------------------------------------------
inline void enableModernFrame(HWND h){
    BOOL dark = TRUE;
    DwmSetWindowAttribute(h, 20 /*DWMWA_USE_IMMERSIVE_DARK_MODE*/, &dark, sizeof(dark));
    int pref = 2; // DWMWCP_ROUND
    DwmSetWindowAttribute(h, 33 /*DWMWA_WINDOW_CORNER_PREFERENCE*/, &pref, sizeof(pref));
    // extend frame so DWM gives us a subtle rounded border/shadow around the popup
    MARGINS mg{1,1,1,1};
    DwmExtendFrameIntoClientArea(h, &mg);
}

inline int run(App& a, HINSTANCE hInst){
    g() = &a;
    SetProcessDPIAware();
    GdiplusStartupInput gsi; GdiplusStartup(&a.gdip, &gsi, nullptr);

    WNDCLASSEX wc{}; wc.cbSize=sizeof(wc);
    wc.lpfnWndProc=WndProc; wc.hInstance=hInst;
    wc.hCursor=LoadCursor(nullptr, IDC_ARROW);
    wc.lpszClassName=L"GlassKitWindow";
    wc.hbrBackground=nullptr;
    RegisterClassEx(&wc);

    int sw=GetSystemMetrics(SM_CXSCREEN), sh=GetSystemMetrics(SM_CYSCREEN);
    int x=(sw-a.W)/2, y=(sh-a.H)/2; if(y<0)y=0;
    a.hwnd = CreateWindowEx(WS_EX_APPWINDOW, wc.lpszClassName, a.winTitle.c_str(),
        WS_POPUP, x, y, a.W, a.H, nullptr, nullptr, hInst, nullptr);
    enableModernFrame(a.hwnd);
    layoutChrome(a);

    ShowWindow(a.hwnd, SW_SHOW);
    UpdateWindow(a.hwnd);
    SetTimer(a.hwnd, 1, 33, nullptr);   // ~30 fps aurora

    MSG msg;
    while(GetMessage(&msg,nullptr,0,0)){
        TranslateMessage(&msg);
        DispatchMessage(&msg);
    }
    GdiplusShutdown(a.gdip);
    return (int)msg.wParam;
}

} // namespace gk
