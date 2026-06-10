import Link from 'next/link';
import {useRouter} from 'next/router';

export default function PortfolioBackButton() {
    const router = useRouter();

    if (router.pathname === '/') {
        return null;
    }

    return (
        <Link href="/" className="portfolioBackButton" aria-label="返回作品集首页">
            <span className="portfolioBackButtonArrow" aria-hidden="true">‹</span>
            <span className="portfolioBackButtonText">返回作品集</span>
        </Link>
    );
}
