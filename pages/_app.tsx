import "@/styles/globals.css";
import type { AppProps } from "next/app";
import PortfolioBackButton from "@/components/PortfolioBackButton";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <PortfolioBackButton />
      <Component {...pageProps} />
    </>
  );
}
