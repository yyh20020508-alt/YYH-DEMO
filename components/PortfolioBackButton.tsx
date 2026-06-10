import {useRouter} from 'next/router';

export default function PortfolioBackButton() {
    const router = useRouter();

    if (router.pathname === '/') {
        return null;
    }

    const handleBack = () => {
        if (typeof window === 'undefined') {
            return;
        }

        const canUseHistoryBack =
            window.history.length > 1 &&
            document.referrer.startsWith(window.location.origin);

        if (canUseHistoryBack) {
            window.history.back();
            return;
        }

        router.push('/');
    };

    return (
        <button
            type="button"
            className="portfolioBackButton"
            aria-label="返回作品集首页"
            onClick={handleBack}
        >
            <span className="portfolioBackButtonArrow" aria-hidden="true">‹</span>
            <span className="portfolioBackButtonText">返回作品集</span>
        </button>
    );
}
