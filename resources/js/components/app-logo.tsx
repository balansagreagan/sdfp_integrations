import AppLogoIcon from './app-logo-icon';

export default function AppLogo() {
    return (
        <>
            <div className="flex aspect-square size-10 items-center justify-center overflow-hidden rounded-md">
                <AppLogoIcon className="size-10 object-contain" />
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="mb-0.5 truncate leading-none font-semibold">Sapang Dalaga Floating Playground</span>
            </div>
        </>
    );
}
