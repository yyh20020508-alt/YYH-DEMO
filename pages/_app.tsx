import "@/styles/globals.css";
import type { AppProps } from "next/app";
import PortfolioBackButton from "@/components/PortfolioBackButton";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className="portfolioShell">
      <PortfolioBackButton />
      <div className="portfolioViewport">
        <Component {...pageProps} />
      </div>
    </div>
  );
}
