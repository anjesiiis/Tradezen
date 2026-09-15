import { useEffect, useState } from "react";

// Breakpoints do site inteiro: mobile <768px, tablet 768–1024px, desktop
// >1024px — os mesmos valores usados nas media queries do CSS abaixo.
// Esse hook é só pra decisões que precisam acontecer em JS (não dá pra
// resolver só com CSS), tipo trocar o comportamento de um clique.
const MOBILE_BREAKPOINT = 768;
export function useIsMobile(){
  const [isMobile, setIsMobile] = useState(
    ()=> typeof window!=="undefined" && window.innerWidth < MOBILE_BREAKPOINT
  );
  useEffect(()=>{
    const mq = window.matchMedia(`(max-width:${MOBILE_BREAKPOINT-1}px)`);
    const onChange = ()=> setIsMobile(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return ()=> mq.removeEventListener("change", onChange);
  },[]);
  return isMobile;
}
