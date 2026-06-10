import "@/styles/globals.css";
import type { AppProps } from "next/app";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import PortfolioBackButton from "@/components/PortfolioBackButton";

export default function App({ Component, pageProps }: AppProps) {
  const [deviceScale, setDeviceScale] = useState(1);
  const [isDesktopPreview, setIsDesktopPreview] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const updateScale = () => {
      const desktop = window.innerWidth >= 900;
      setIsDesktopPreview(desktop);

      if (!desktop) {
        setDeviceScale(1);
        return;
      }

      const baseWidth = 415;
      const baseHeight = 881;
      const maxWidth = window.innerWidth - 60;
      const maxHeight = window.innerHeight - 36;
      const scale = Math.min(maxWidth / baseWidth, maxHeight / baseHeight, 1);
      setDeviceScale(scale);
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  const embedded = router.query.embedded === "1";
  const isFullBleedPreview = router.asPath.startsWith("/dao-dun-dog-game.html");
  const frameSrc = (() => {
    const [pathWithQuery, hash = ""] = router.asPath.split("#");
    const joiner = pathWithQuery.includes("?") ? "&" : "?";
    return `${pathWithQuery}${joiner}embedded=1${hash ? `#${hash}` : ""}`;
  })();

  if (embedded || !isDesktopPreview) {
    return (
      <>
        <PortfolioBackButton />
        <Component {...pageProps} />
      </>
    );
  }

  return (
    <div className="portfolioShell">
      <div
        className="portfolioDeviceStage"
        style={
          {
            "--device-scale": String(deviceScale),
          } as CSSProperties
        }
      >
        <div className="portfolioDeviceFrame">
          <div className="portfolioDeviceNotch" aria-hidden="true" />
          <div
            className={`portfolioViewport${isFullBleedPreview ? " portfolioViewportBleed" : ""}`}
          >
            <iframe
              className="portfolioDeviceIframe"
              src={frameSrc}
              title="Mobile preview"
            />
          </div>
          <div className="portfolioDeviceHome" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
