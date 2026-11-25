// antidbg.h — a few classic, well-documented anti-debugging checks (x64).
// Used by levels 4 and 5. Each is something you will learn to bypass in
// x64dbg / with ScyllaHide: patch IsDebuggerPresent, zero PEB.BeingDebugged,
// clear NtGlobalFlag, or defeat the timing check.
#pragma once
#include <windows.h>

namespace adbg {

// Read PEB base from GS:[0x60] (x64) via inline asm (mingw-friendly).
inline unsigned char* peb(){
#if defined(__x86_64__) || defined(_M_X64)
    unsigned long long p = 0;
    __asm__ volatile ("mov %%gs:0x60, %0" : "=r"(p));
    return (unsigned char*)p;
#else
    return nullptr;
#endif
}

inline bool byApi(){
    if(IsDebuggerPresent()) return true;
    BOOL rp = FALSE;
    CheckRemoteDebuggerPresent(GetCurrentProcess(), &rp);
    return rp != FALSE;
}

inline bool byPeb(){
    unsigned char* p = peb();
    if(!p) return false;
    if(p[2] != 0) return true;                          // BeingDebugged
    unsigned int ngf = *(unsigned int*)(p + 0xBC);       // NtGlobalFlag
    return (ngf & 0x70) != 0;                            // heap flags set under debugger
}

inline bool byTiming(){
    DWORD a = GetTickCount();
    volatile unsigned s = 0;
    for(int i=0;i<2000000;i++) s += (unsigned)i;
    DWORD b = GetTickCount();
    return (b - a) > 350;                               // stepped/traced -> slow
}

// Combined gate. Returns true if any debugger indicator fires.
inline bool present(){
    return byApi() || byPeb() || byTiming();
}

} // namespace adbg
